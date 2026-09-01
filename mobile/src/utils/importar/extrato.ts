// Leitura de extratos bancarios: OFX, CSV e planilha.
//
// A versao anterior devolvia so descricao, valor e dia, e falhava em coisas
// que todo extrato de verdade tem:
//
//   - o OFX com hora no `DTPOSTED` mandava tudo para o dia 1 (ver datas.ts);
//   - o CSV com linhas de cabecalho de banco antes da tabela nao era
//     reconhecido, porque a primeira linha do arquivo era tratada como o
//     cabecalho das colunas;
//   - extratos com duas colunas, uma de debito e outra de credito, ficavam
//     sem sinal;
//   - nada era devolvido sobre o que o app entendeu, entao a previa nao tinha
//     como explicar por que veio vazio.
//
// Agora cada leitura devolve os lancamentos com a data inteira, o
// identificador do banco quando existe — que e o que permite reconhecer o que
// ja foi importado antes — e uma lista de avisos em portugues.

import { type DataLida, lerData } from './datas'

export type LancamentoImportado = {
  /** Chave estavel para reconhecer repeticao entre importacoes. */
  chave: string
  descricao: string
  /** Negativo e saida, positivo e entrada. */
  valor: number
  data: DataLida
  /** O identificador do proprio banco, quando o arquivo traz. */
  fitid: string
  /**
   * De qual arquivo o lancamento veio.
   *
   * So importa quando se escolhe mais de um extrato de uma vez: e o que
   * permite a previa dizer de onde saiu cada linha e o que permite reconhecer
   * a transacao que aparece nos dois arquivos, quando os periodos se cruzam.
   */
  arquivo: string
}

export type Formato = 'ofx' | 'csv' | 'planilha' | 'desconhecido'

export type Leitura = {
  formato: Formato
  lancamentos: LancamentoImportado[]
  /** Frases em portugues sobre o que aconteceu na leitura. */
  avisos: string[]
  /** Quantas linhas ou blocos o arquivo tinha. */
  encontrados: number
  /** Quantos foram descartados, e por que ja esta nos avisos. */
  descartados: number
}

const vazia = (formato: Formato, avisos: string[]): Leitura => ({
  formato,
  lancamentos: [],
  avisos,
  encontrados: 0,
  descartados: 0,
})

function normalizar(texto: string) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** "1.234,56", "-1234.56", "R$ 1.234,56", "(45,90)" -> numero. */
export function lerValor(bruto: string | number | null | undefined): number {
  if (typeof bruto === 'number') return Number.isFinite(bruto) ? bruto : NaN

  let texto = String(bruto ?? '').trim()
  if (!texto) return NaN

  // Parenteses sao a notacao contabil de negativo: (45,90) e -45,90.
  const negativo = texto.includes('-') || /^\(.*\)$/.test(texto)
  texto = texto.replace(/[^\d.,]/g, '')
  if (!texto) return NaN

  const ultimaVirgula = texto.lastIndexOf(',')
  const ultimoPonto = texto.lastIndexOf('.')

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    // Os dois presentes: o ultimo e o decimal, o outro e o milhar.
    if (ultimaVirgula > ultimoPonto) texto = texto.replace(/\./g, '').replace(',', '.')
    else texto = texto.replace(/,/g, '')
  } else if (ultimaVirgula >= 0 || ultimoPonto >= 0) {
    /**
     * Um separador so, e ele e ambiguo: "1.234" e mil duzentos e trinta e
     * quatro num extrato brasileiro, mas "45.90" e quarenta e cinco e noventa.
     * Tres digitos depois do separador so acontecem em milhar — dinheiro tem
     * dois decimais.
     */
    const separador = ultimaVirgula >= 0 ? ',' : '.'
    const pedacos = texto.split(separador)
    const ultimoPedaco = pedacos[pedacos.length - 1]
    const ehMilhar = pedacos.length > 2 || ultimoPedaco.length === 3

    texto = ehMilhar
      ? pedacos.join('')
      : pedacos.slice(0, -1).join('') + '.' + ultimoPedaco
  }

  const numero = Number(texto)
  if (!Number.isFinite(numero)) return NaN
  return negativo ? -Math.abs(numero) : numero
}

/** Junta o que sobra em uma chave que nao muda entre duas importacoes iguais. */
function montarChave(partes: (string | number | null)[]) {
  return partes.map((p) => String(p ?? '').trim().toLowerCase()).join('|')
}

// ----------------------------------------------------------------- OFX

/**
 * Le o valor de uma tag, aceitando as duas formas de OFX.
 *
 * O padrao 1.x e SGML e nao fecha as tags (`<TRNAMT>-45.90` e o fim da
 * linha); o 2.x e XML e fecha (`<TRNAMT>-45.90</TRNAMT>`). O corte no `<` e
 * na quebra de linha cobre as duas.
 */
function tagOfx(bloco: string, nomes: string[]) {
  for (const nome of nomes) {
    const achado = bloco.match(new RegExp(`<${nome}>\\s*([^<\\r\\n]+)`, 'i'))
    if (achado?.[1]) return achado[1].trim()
  }
  return ''
}

/**
 * Os identificadores que aparecem em transacoes diferentes.
 *
 * Aparecer duas vezes com o mesmo conteudo e a mesma transacao repetida no
 * arquivo, o que e legitimo. Aparecer com conteudo diferente prova que aquele
 * numero nao identifica nada.
 */
function fitidsNaoConfiaveis(lancamentos: LancamentoImportado[]): Set<string> {
  const conteudoDe = new Map<string, string>()
  const suspeitos = new Set<string>()

  for (const lancamento of lancamentos) {
    if (!lancamento.fitid) continue

    const conteudo = montarChave([
      lancamento.descricao,
      lancamento.valor,
      lancamento.data.dia,
      lancamento.data.mes,
    ])
    const anterior = conteudoDe.get(lancamento.fitid)

    if (anterior === undefined) conteudoDe.set(lancamento.fitid, conteudo)
    else if (anterior !== conteudo) suspeitos.add(lancamento.fitid)
  }

  return suspeitos
}

export function lerOfx(texto: string): Leitura {
  const avisos: string[] = []

  if (!/<STMTTRN>/i.test(texto)) {
    // Cartao de credito usa outro nome de bloco em alguns bancos.
    if (!/<CCSTMTTRN>/i.test(texto)) {
      return vazia('ofx', ['O arquivo não tem nenhum bloco de transação (STMTTRN).'])
    }
  }

  const blocos = texto.split(/<(?:STMTTRN|CCSTMTTRN)>/i).slice(1)
  const lancamentos: LancamentoImportado[] = []
  let descartados = 0

  for (const bloco of blocos) {
    const valor = lerValor(tagOfx(bloco, ['TRNAMT']))
    if (!Number.isFinite(valor) || valor === 0) {
      descartados += 1
      continue
    }

    // NAME e MEMO se completam: um traz o estabelecimento, o outro o detalhe.
    const nome = tagOfx(bloco, ['NAME'])
    const memo = tagOfx(bloco, ['MEMO'])
    const juntos = [nome, memo].filter(Boolean)
    const descricao =
      juntos.length === 2 && normalizar(juntos[0]) !== normalizar(juntos[1])
        ? `${juntos[0]} · ${juntos[1]}`
        : juntos[0] || 'Lançamento importado'

    const fitid = tagOfx(bloco, ['FITID'])
    const data = lerData(tagOfx(bloco, ['DTPOSTED', 'DTUSER', 'DTAVAIL']))

    lancamentos.push({
      // O FITID e unico por banco: quando existe, e a melhor chave que ha.
      chave: fitid ? `ofx|${fitid}` : montarChave([descricao, valor, data.dia, data.mes]),
      descricao: descricao.replace(/\s+/g, ' ').trim(),
      valor,
      data,
      fitid,
      arquivo: '',
    })
  }

  const repetidos = fitidsNaoConfiaveis(lancamentos)
  if (repetidos.size) {
    /**
     * Banco que repete o identificador nao pode mandar na comparacao.
     *
     * O FITID deveria ser unico por transacao, e o app confiava nisso: era a
     * melhor chave que havia para reconhecer o que ja tinha sido importado.
     * So que ha banco que carimba o mesmo identificador em varios
     * lancamentos — as remuneracoes diarias da aplicacao automatica sao o
     * caso classico. Com isso, uma compra qualquer aparecia como repeticao de
     * um rendimento de um centavo, so porque os dois traziam o mesmo numero.
     *
     * Um identificador que se repete com conteudo diferente nao e
     * identificador. Aqui ele e jogado fora, e a comparacao volta a ser por
     * nome, valor e data — que e o que sempre funcionou.
     */
    lancamentos.forEach((lancamento) => {
      if (!repetidos.has(lancamento.fitid)) return
      lancamento.fitid = ''
      lancamento.chave = montarChave([
        lancamento.descricao,
        lancamento.valor,
        lancamento.data.dia,
        lancamento.data.mes,
      ])
    })

    avisos.push(
      'Este banco repete o mesmo identificador em lançamentos diferentes; comparei por nome, valor e data.'
    )
  }

  if (descartados > 0) {
    avisos.push(`${descartados} transação(ões) sem valor foram ignoradas.`)
  }
  if (lancamentos.length && !lancamentos.some((l) => l.data.mes)) {
    avisos.push('O arquivo não trouxe a data das transações; todas entram no dia informado.')
  }

  return { formato: 'ofx', lancamentos, avisos, encontrados: blocos.length, descartados }
}

// ----------------------------------------------------------------- CSV

/** Escolhe o separador pelo que mais aparece nas primeiras linhas. */
function detectarSeparador(texto: string) {
  const amostra = texto.split(/\r?\n/).slice(0, 12).join('\n')
  const contar = (c: string) => (amostra.match(new RegExp(`\\${c}`, 'g')) || []).length

  const candidatos: [string, number][] = [
    [';', contar(';')],
    [',', contar(',')],
    ['\t', (amostra.match(/\t/g) || []).length],
  ]

  candidatos.sort((a, b) => b[1] - a[1])
  return candidatos[0][1] > 0 ? candidatos[0][0] : ';'
}

/** Divide o CSV respeitando aspas: "Mercado; Padaria" continua uma celula. */
export function lerCsv(texto: string): string[][] {
  const separador = detectarSeparador(texto)
  const linhas: string[][] = []
  let celulas: string[] = []
  let atual = ''
  let dentroDeAspas = false

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i]

    if (dentroDeAspas) {
      if (c === '"') {
        // Duas aspas seguidas representam uma aspa literal.
        if (texto[i + 1] === '"') {
          atual += '"'
          i += 1
        } else {
          dentroDeAspas = false
        }
      } else {
        atual += c
      }
      continue
    }

    if (c === '"') dentroDeAspas = true
    else if (c === separador) {
      celulas.push(atual.trim())
      atual = ''
    } else if (c === '\n') {
      celulas.push(atual.trim())
      if (celulas.some((v) => v !== '')) linhas.push(celulas)
      celulas = []
      atual = ''
    } else if (c !== '\r') atual += c
  }

  celulas.push(atual.trim())
  if (celulas.some((v) => v !== '')) linhas.push(celulas)

  return linhas
}

// ------------------------------------------------------------- TABELA

const TERMOS_DESCRICAO = [
  'descricao', 'historico', 'memo', 'lancamento', 'detalhe', 'titulo', 'name',
  'estabelecimento', 'favorecido', 'transacao',
]
const TERMOS_VALOR = ['valor', 'amount', 'vlr', 'quantia', 'montante', 'total']
const TERMOS_DEBITO = ['debito', 'saida', 'despesa', 'pagamento', 'debit']
const TERMOS_CREDITO = ['credito', 'entrada', 'receita', 'deposito', 'credit']
const TERMOS_TIPO = ['tipo', 'type', 'natureza', 'operacao', 'd/c']
const TERMOS_DATA = ['data', 'date', 'dtposted', 'dia', 'competencia']

function acharColuna(cabecalhos: string[], termos: string[], usadas: number[] = []) {
  const normalizados = cabecalhos.map(normalizar)

  for (const termo of termos) {
    const exata = normalizados.findIndex((c, i) => c === termo && !usadas.includes(i))
    if (exata >= 0) return exata
  }
  for (const termo of termos) {
    const parcial = normalizados.findIndex((c) => c.includes(termo) && !usadas.includes(normalizados.indexOf(c)))
    if (parcial >= 0) return parcial
  }
  return -1
}

/**
 * Acha a linha que e o cabecalho de verdade.
 *
 * Extrato de banco costuma comecar com nome do titular, agencia, periodo e
 * linhas em branco antes da tabela. Tratar a primeira linha do arquivo como
 * cabecalho fazia a leitura inteira falhar nesses casos — e sao a maioria.
 */
function acharCabecalho(linhas: (string | number)[][]) {
  const limite = Math.min(linhas.length, 25)

  for (let i = 0; i < limite; i += 1) {
    const textos = linhas[i].map((c) => String(c ?? ''))
    const temValor =
      acharColuna(textos, TERMOS_VALOR) >= 0 ||
      (acharColuna(textos, TERMOS_DEBITO) >= 0 && acharColuna(textos, TERMOS_CREDITO) >= 0)
    const temData = acharColuna(textos, TERMOS_DATA) >= 0
    const temDescricao = acharColuna(textos, TERMOS_DESCRICAO) >= 0

    if (temValor && (temData || temDescricao)) return i
  }

  return -1
}

export function lerTabela(linhas: (string | number)[][], formato: Formato = 'csv'): Leitura {
  const avisos: string[] = []
  if (linhas.length < 2) return vazia(formato, ['O arquivo não tem linhas suficientes.'])

  const iCabecalho = acharCabecalho(linhas)
  if (iCabecalho < 0) {
    return vazia(formato, [
      'Não encontrei as colunas do extrato. O arquivo precisa ter uma linha de títulos com "valor" e "data" ou "descrição".',
    ])
  }

  if (iCabecalho > 0) {
    avisos.push(`${iCabecalho} linha(s) antes da tabela foram puladas.`)
  }

  const cabecalhos = linhas[iCabecalho].map((c) => String(c ?? ''))
  const iDescricao = acharColuna(cabecalhos, TERMOS_DESCRICAO)
  const iData = acharColuna(cabecalhos, TERMOS_DATA)
  const iTipo = acharColuna(cabecalhos, TERMOS_TIPO)

  // Duas colunas separadas — uma de debito, outra de credito — sao comuns nos
  // extratos daqui, e sem trata-las o sinal do valor se perdia.
  const iDebito = acharColuna(cabecalhos, TERMOS_DEBITO)
  const iCredito = acharColuna(cabecalhos, TERMOS_CREDITO)
  const emDuasColunas = iDebito >= 0 && iCredito >= 0 && iDebito !== iCredito

  const iValor = emDuasColunas
    ? -1
    : acharColuna(cabecalhos, TERMOS_VALOR, [iDescricao, iData, iTipo].filter((n) => n >= 0))

  if (!emDuasColunas && iValor < 0) {
    return vazia(formato, ['Não encontrei a coluna de valor.'])
  }

  if (iData < 0) avisos.push('Sem coluna de data: os lançamentos entram no dia que você escolher.')
  if (iDescricao < 0) avisos.push('Sem coluna de descrição: os lançamentos entram com um nome genérico.')

  const corpo = linhas.slice(iCabecalho + 1)
  const lancamentos: LancamentoImportado[] = []
  let descartados = 0

  corpo.forEach((colunas, indice) => {
    let valor: number

    if (emDuasColunas) {
      const debito = lerValor(colunas[iDebito])
      const credito = lerValor(colunas[iCredito])
      const temDebito = Number.isFinite(debito) && debito !== 0
      const temCredito = Number.isFinite(credito) && credito !== 0

      if (!temDebito && !temCredito) {
        descartados += 1
        return
      }
      valor = temDebito ? -Math.abs(debito) : Math.abs(credito)
    } else {
      valor = lerValor(colunas[iValor])
      if (!Number.isFinite(valor) || valor === 0) {
        descartados += 1
        return
      }

      // Uma coluna de tipo manda no sinal: ha bancos que exportam tudo
      // positivo e so marcam D ou C ao lado.
      if (iTipo >= 0) {
        const tipo = normalizar(String(colunas[iTipo] ?? ''))
        if (tipo && TERMOS_DEBITO.some((t) => tipo === t || tipo === t[0] || tipo.startsWith(t))) {
          valor = -Math.abs(valor)
        } else if (tipo && TERMOS_CREDITO.some((t) => tipo === t || tipo === t[0] || tipo.startsWith(t))) {
          valor = Math.abs(valor)
        }
      }
    }

    const descricao =
      (iDescricao >= 0 ? String(colunas[iDescricao] ?? '').trim() : '') || 'Lançamento importado'
    const data = iData >= 0 ? lerData(colunas[iData]) : { dia: 1, mes: null, ano: null }

    lancamentos.push({
      chave: montarChave([descricao, valor, data.dia, data.mes, indice]),
      descricao: descricao.replace(/\s+/g, ' '),
      valor,
      data,
      fitid: '',
      arquivo: '',
    })
  })

  if (descartados > 0) avisos.push(`${descartados} linha(s) sem valor foram ignoradas.`)

  return { formato, lancamentos, avisos, encontrados: corpo.length, descartados }
}

/** Carimba de que arquivo veio cada lancamento lido. */
export function comArquivo(leitura: Leitura, nome: string): Leitura {
  return {
    ...leitura,
    lancamentos: leitura.lancamentos.map((lancamento) => ({ ...lancamento, arquivo: nome })),
  }
}

/** Escolhe o leitor pelo nome do arquivo e pelo proprio conteudo. */
export function lerExtrato(nome: string, texto: string): Leitura {
  const minusculo = String(nome || '').toLowerCase()

  // O conteudo manda mais que a extensao: arquivo OFX salvo como .txt e comum.
  const leitura =
    minusculo.endsWith('.ofx') || /<OFX>|<STMTTRN>|OFXHEADER/i.test(texto)
      ? lerOfx(texto)
      : lerTabela(lerCsv(texto), 'csv')

  return comArquivo(leitura, nome)
}

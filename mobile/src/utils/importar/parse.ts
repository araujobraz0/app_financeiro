// Leitura de extratos bancarios (CSV, Excel e OFX).
//
// O caminho antigo tinha tres furos:
//   1. O CSV era quebrado com split(separador), entao qualquer descricao com
//      ponto e virgula dentro de aspas partia a linha no lugar errado.
//   2. O Excel era convertido em texto juntando as celulas com ';' — mesmo
//      problema, agora introduzido pelo proprio app.
//   3. As colunas so eram reconhecidas por igualdade exata ('valor', 'data'),
//      e extrato de banco de verdade traz "Valor (R$)", "Data Lançamento",
//      "Descrição do Lançamento". Nada casava e a importacao vinha vazia.
//
// Aqui tudo passa por uma matriz de celulas, e o reconhecimento de coluna e
// por aproximacao.

export type TransacaoImportada = {
  descricao: string
  valor: number
  dia: number
}

/** Divide o CSV respeitando aspas: "Mercado; Padaria" continua uma celula. */
export function parseCsv(texto: string): string[][] {
  const linhas: string[][] = []
  let celulas: string[] = []
  let atual = ''
  let dentroDeAspas = false

  const separador = detectarSeparador(texto)

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

    if (c === '"') {
      dentroDeAspas = true
    } else if (c === separador) {
      celulas.push(atual.trim())
      atual = ''
    } else if (c === '\n') {
      celulas.push(atual.trim())
      if (celulas.some((v) => v !== '')) linhas.push(celulas)
      celulas = []
      atual = ''
    } else if (c !== '\r') {
      atual += c
    }
  }

  celulas.push(atual.trim())
  if (celulas.some((v) => v !== '')) linhas.push(celulas)

  return linhas
}

/** Escolhe entre ';' e ',' pelo que aparece mais na primeira linha. */
function detectarSeparador(texto: string) {
  const primeira = texto.split(/\r?\n/)[0] || ''
  const pontoEVirgula = (primeira.match(/;/g) || []).length
  const virgula = (primeira.match(/,/g) || []).length
  const tab = (primeira.match(/\t/g) || []).length
  if (tab > pontoEVirgula && tab > virgula) return '\t'
  return pontoEVirgula >= virgula ? ';' : ','
}

function normalizar(texto: string) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Acha a coluna cujo cabecalho contem algum dos termos.
 * Por aproximacao, para aceitar "Valor (R$)" e "Data Lançamento".
 */
function acharColuna(cabecalhos: string[], termos: string[]) {
  const normalizados = cabecalhos.map(normalizar)

  // Primeiro a correspondencia exata, que e mais confiavel.
  for (const termo of termos) {
    const exata = normalizados.indexOf(termo)
    if (exata >= 0) return exata
  }

  for (const termo of termos) {
    const parcial = normalizados.findIndex((c) => c.includes(termo))
    if (parcial >= 0) return parcial
  }

  return -1
}

/** "1.234,56", "-1234.56", "R$ 1.234,56" -> numero. */
export function normalizarValor(bruto: string | number): number {
  if (typeof bruto === 'number') return bruto

  let texto = String(bruto || '').trim()
  if (!texto) return NaN

  const negativo = texto.includes('-') || /\(.*\)/.test(texto)
  texto = texto.replace(/[^\d.,]/g, '')
  if (!texto) return NaN

  const ultimaVirgula = texto.lastIndexOf(',')
  const ultimoPonto = texto.lastIndexOf('.')

  if (ultimaVirgula > ultimoPonto) {
    // Formato brasileiro: ponto e milhar, virgula e decimal.
    texto = texto.replace(/\./g, '').replace(',', '.')
  } else {
    // Formato ingles: virgula e milhar.
    texto = texto.replace(/,/g, '')
  }

  const numero = Number(texto)
  if (Number.isNaN(numero)) return NaN
  return negativo ? -Math.abs(numero) : numero
}

/** Extrai o dia do mes de varios formatos de data. */
export function extrairDia(bruto: string | number): number {
  const valor = String(bruto || '').trim().replace(/^"|"$/g, '')
  if (!valor) return 1

  // Data serial do Excel (dias desde 30/12/1899).
  if (typeof bruto === 'number' && bruto > 20000 && bruto < 60000) {
    const data = new Date(Date.UTC(1899, 11, 30) + bruto * 86400000)
    return data.getUTCDate()
  }

  if (/^\d{8}$/.test(valor)) return Number(valor.slice(6, 8)) || 1

  const barra = valor.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/)
  if (barra) return Number(barra[1]) || 1

  const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return Number(iso[3]) || 1

  const traco = valor.match(/^(\d{1,2})-(\d{1,2})-\d{2,4}$/)
  if (traco) return Number(traco[1]) || 1

  return 1
}

const TERMOS_DESCRICAO = ['descricao', 'historico', 'memo', 'name', 'lancamento', 'detalhe', 'titulo']
const TERMOS_VALOR = ['valor', 'amount', 'vlr', 'quantia', 'montante']
const TERMOS_TIPO = ['tipo', 'type', 'natureza', 'operacao']
const TERMOS_DATA = ['data', 'date', 'dtposted', 'dia']
const TERMOS_CREDITO = ['credito', 'entrada', 'receita', 'deposito', 'c']
const TERMOS_DEBITO = ['debito', 'saida', 'despesa', 'pagamento', 'd']

/** Interpreta uma matriz de celulas (vinda de CSV ou de Excel). */
export function parseTabela(linhas: (string | number)[][]): TransacaoImportada[] {
  if (linhas.length < 2) return []

  const cabecalhos = linhas[0].map((c) => String(c ?? ''))

  const iDescricao = acharColuna(cabecalhos, TERMOS_DESCRICAO)
  const iValor = acharColuna(cabecalhos, TERMOS_VALOR)
  const iTipo = acharColuna(cabecalhos, TERMOS_TIPO)
  const iData = acharColuna(cabecalhos, TERMOS_DATA)

  if (iValor < 0) return []

  const transacoes: TransacaoImportada[] = []

  linhas.slice(1).forEach((colunas) => {
    let valor = normalizarValor(colunas[iValor])
    if (Number.isNaN(valor) || valor === 0) return

    const descricao =
      iDescricao >= 0 ? String(colunas[iDescricao] ?? '').trim() : ''

    // Uma coluna de tipo tem prioridade sobre o sinal do valor: alguns bancos
    // exportam tudo positivo e so marcam D/C.
    if (iTipo >= 0) {
      const tipo = normalizar(String(colunas[iTipo] ?? ''))
      if (tipo && TERMOS_DEBITO.some((t) => tipo === t || tipo.startsWith(t))) {
        valor = -Math.abs(valor)
      } else if (tipo && TERMOS_CREDITO.some((t) => tipo === t || tipo.startsWith(t))) {
        valor = Math.abs(valor)
      }
    }

    transacoes.push({
      descricao: descricao || 'Importado do banco',
      valor,
      dia: iData >= 0 ? extrairDia(colunas[iData]) : 1,
    })
  })

  return transacoes
}

/** Le o bloco de transacoes de um arquivo OFX. */
export function parseOfx(texto: string): TransacaoImportada[] {
  const blocos = texto.split(/<STMTTRN>/i).slice(1)

  return blocos.flatMap((bloco) => {
    const valorMatch = bloco.match(/<TRNAMT>([-\d.,]+)/i)
    if (!valorMatch) return []

    const valor = normalizarValor(valorMatch[1])
    if (Number.isNaN(valor) || valor === 0) return []

    const memo = bloco.match(/<(?:MEMO|NAME)>([^\r\n<]+)/i)
    const data = bloco.match(/<DTPOSTED>(\d{8,14})/i)

    return [{
      descricao: (memo?.[1] || 'Importado do banco').trim(),
      valor,
      dia: data ? extrairDia(data[1]) : 1,
    }]
  })
}

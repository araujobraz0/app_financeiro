// O que vai ser importado, item por item, antes de encostar nos dados.
//
// A previa antiga mostrava as oito primeiras entradas e as oito primeiras
// saidas, sem contagem confiavel, sem data de verdade e sem escolha: era
// importar tudo ou nada. Pior, um extrato de tres meses caia inteiro no mes
// que estava aberto na tela, e reimportar o mesmo arquivo duplicava tudo.
//
// Aqui cada lancamento vira um item com competencia propria, categoria
// editavel e uma marca de repetido — dentro do proprio arquivo ou contra o
// que ja esta gravado no app. O que e repetido ja entra desmarcado.

import { meses } from '../dates'
import { reconhecerPagamentoDeCartao, type CartaoConhecido } from './cartoes'
import type { DataLida } from './datas'
import type { LancamentoImportado, Leitura } from './extrato'

/**
 * O que o lancamento vira dentro do app.
 *
 * 'cartao' e o pagamento da fatura: nao vira gasto do mes, porque as parcelas
 * do cartao ja entram por conta propria — lancar os dois contaria o mesmo
 * dinheiro duas vezes. Ele marca a fatura daquele mes como paga.
 */
export type TipoItem = 'entrada' | 'saida' | 'cartao'

/** Por que o item foi marcado como repetido. */
export type Repeticao = 'nao' | 'arquivo' | 'app'

/**
 * Com qual lancamento este repete.
 *
 * Dizer so "repetido" obriga a pessoa a sair procurando o par: era ela quem
 * tinha de descobrir se o app ja tinha aquilo ou se o par estava na propria
 * lista, e em qual dos arquivos. Guardar a outra ponta responde isso na
 * propria linha.
 */
export type OndeRepete = {
  descricao: string
  competencia: string
  dia: number
  /** Sempre positivo. */
  valor: number
  /** Nome do arquivo, quando o par veio da propria importacao. */
  arquivo: string
}

export type ItemPrevia = {
  /** Identificador do item dentro da previa. */
  id: string
  descricao: string
  /** Sempre positivo: o sinal virou `tipo`. */
  valor: number
  tipo: TipoItem
  dia: number
  /** "2026-Agosto" — de onde o lancamento vai entrar. */
  competencia: string
  /** So vale para saida. */
  categoria: string
  /** Cartao cuja fatura este pagamento quita. So vale para tipo 'cartao'. */
  cartaoId: string
  cartaoNome: string
  /** Se o arquivo trouxe a data, ou se a competencia e um palpite. */
  temData: boolean
  repetido: Repeticao
  /** O lancamento com que este repete, quando repete. */
  repeteDe: OndeRepete | null
  incluir: boolean
  /** O identificador do banco, guardado para a proxima importacao. */
  fitid: string
  /** Nome do arquivo de onde veio, quando veio mais de um. */
  arquivo: string
}

export type ResumoPrevia = {
  /** Quantos itens estao marcados. */
  marcados: number
  entradas: number
  saidas: number
  /** O que vai para faturas de cartao, separado das saidas. */
  faturas: number
  saldo: number
  repetidos: number
  semData: number
  /** Um bloco por mes de destino, para o usuario ver onde cada coisa cai. */
  porCompetencia: {
    competencia: string
    quantidade: number
    entradas: number
    saidas: number
  }[]
}

type ItemGravado = { nome: string; valor: number; dia?: number; fitid?: string }

type OpcoesPrevia = {
  /** Mes aberto na tela, usado quando o arquivo nao diz a data. */
  competenciaPadrao: string
  /** De que categoria e cada saida, pela descricao. */
  categorizar: (descricao: string) => string
  /** Assinaturas do que ja esta gravado (veja `assinaturasDoBanco`). */
  jaNoApp?: Map<string, OndeRepete>
  /** Cartoes cadastrados, para reconhecer o pagamento da fatura. */
  cartoes?: CartaoConhecido[]
  /** "2026-Agosto|cartao1" -> dia em que aquela fatura ja foi paga. */
  faturasPagas?: Map<string, number>
}

const semAcento = (texto: string) =>
  String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Em que mes o lancamento cai: o do arquivo, ou o que esta aberto na tela. */
export function competenciaDaData(data: DataLida, padrao: string): string {
  if (!data.mes) return padrao

  const anoPadrao = Number(String(padrao || '').split('-')[0])
  const ano = data.ano || (Number.isFinite(anoPadrao) ? anoPadrao : new Date().getFullYear())

  return `${ano}-${meses[data.mes - 1]}`
}

/**
 * A marca que diz "isto ja esta no app".
 *
 * O FITID e o identificador que o proprio banco da para a transacao, entao
 * quando ele existe e a comparacao exata. Sem ele, sobra a combinacao de mes,
 * tipo, nome, valor e dia — que erra so quando o extrato traz duas compras
 * iguais no mesmo dia, e nesse caso o usuario desmarca na previa.
 */
export function assinatura(
  competencia: string,
  tipo: TipoItem,
  descricao: string,
  valor: number,
  dia: number,
  fitid?: string
) {
  if (fitid) return `fitid|${fitid}`
  return [competencia, tipo, semAcento(descricao), Math.round(Math.abs(valor) * 100), dia].join('|')
}

/**
 * O que ja esta gravado, por assinatura.
 *
 * E um mapa, e nao um conjunto, porque a previa precisa dizer com qual
 * lancamento cada repetido bate — nao so que bate com algum.
 */
export function assinaturasDoBanco(
  banco: Record<string, { entradas?: ItemGravado[]; saidas?: ItemGravado[] }>
): Map<string, OndeRepete> {
  const marcas = new Map<string, OndeRepete>()
  /**
   * Identificadores gravados que aparecem em lancamentos diferentes.
   *
   * Ha banco que repete o mesmo FITID — as remuneracoes diarias da aplicacao
   * automatica sao o caso classico —, e importacoes antigas ja gravaram esses
   * numeros aqui dentro. Um identificador assim nao pode reconhecer nada:
   * fazia uma compra qualquer aparecer como repeticao de um rendimento de um
   * centavo. Ele sai da comparacao, que volta a ser por nome, valor e data.
   */
  const naoConfiaveis = new Set<string>()

  const guardar = (competencia: string, tipo: TipoItem, item: ItemGravado) => {
    const dia = Number(item.dia || 1)
    const onde: OndeRepete = {
      descricao: item.nome,
      competencia,
      dia,
      valor: Math.abs(item.valor),
      arquivo: '',
    }

    if (item.fitid) {
      const chave = `fitid|${item.fitid}`
      const anterior = marcas.get(chave)

      if (!anterior) marcas.set(chave, onde)
      else if (!mesmoLancamento(anterior, onde)) {
        naoConfiaveis.add(chave)
      }
    }

    // A primeira ocorrencia manda: se ha dois lancamentos identicos gravados,
    // apontar para o primeiro e tao util quanto apontar para o segundo.
    const marca = assinatura(competencia, tipo, item.nome, item.valor, dia)
    if (!marcas.has(marca)) marcas.set(marca, onde)
  }

  Object.entries(banco || {}).forEach(([competencia, mes]) => {
    ;(mes?.entradas || []).forEach((item) => guardar(competencia, 'entrada', item))
    ;(mes?.saidas || []).forEach((item) => guardar(competencia, 'saida', item))
  })

  naoConfiaveis.forEach((chave) => marcas.delete(chave))

  return marcas
}

/** Dois registros descrevem a mesma coisa? Usado para julgar um FITID. */
function mesmoLancamento(um: OndeRepete, outro: OndeRepete) {
  return (
    semAcento(um.descricao) === semAcento(outro.descricao) &&
    Math.round(um.valor * 100) === Math.round(outro.valor * 100) &&
    um.dia === outro.dia &&
    um.competencia === outro.competencia
  )
}

/** Transforma o que foi lido do arquivo nos itens que a previa mostra. */
export function montarPrevia(
  lancamentos: LancamentoImportado[],
  opcoes: OpcoesPrevia
): ItemPrevia[] {
  const vistasNoArquivo = new Map<string, OndeRepete>()

  return lancamentos.map((lancamento, indice) => {
    const competencia = competenciaDaData(lancamento.data, opcoes.competenciaPadrao)
    const dia = Math.min(31, Math.max(1, Number(lancamento.data.dia || 1)))
    const descricao = lancamento.descricao.trim() || 'Lançamento importado'

    // Pagamento de fatura sai da conta como qualquer outra saida, mas dentro
    // do app pertence ao cartao — nao a lista de gastos do mes.
    const fatura = reconhecerPagamentoDeCartao(descricao, lancamento.valor, opcoes.cartoes || [])
    const tipo: TipoItem = fatura ? 'cartao' : lancamento.valor >= 0 ? 'entrada' : 'saida'

    /**
     * Duas marcas, nao uma.
     *
     * O FITID reconhece o mesmo extrato reimportado, mas so pega o que ja foi
     * gravado por importacao. O lancamento que a pessoa digitou a mao antes de
     * importar nao tem FITID nenhum — e e exatamente o caso mais comum de
     * duplicata. Por isso as duas marcas sao testadas.
     */
    const marcas = [assinatura(competencia, tipo, descricao, lancamento.valor, dia)]
    if (lancamento.fitid) marcas.unshift(`fitid|${lancamento.fitid}`)

    /**
     * Um par so vale se o valor bater.
     *
     * A assinatura por nome ja carrega o valor, mas a por identificador nao —
     * e identificador repetido por banco existe. Conferir o valor antes de
     * aceitar impede que um lancamento vire repeticao de outro completamente
     * diferente, que era o que acontecia.
     */
    const emCentavos = Math.round(Math.abs(lancamento.valor) * 100)

    const procurar = (onde: Map<string, OndeRepete>) => {
      for (const marca of marcas) {
        const achado = onde.get(marca)
        if (achado && Math.round(achado.valor * 100) === emCentavos) return achado
      }
      return null
    }

    let repetido: Repeticao = 'nao'
    let repeteDe = procurar(vistasNoArquivo)

    if (repeteDe) {
      repetido = 'arquivo'
    } else if (opcoes.jaNoApp) {
      repeteDe = procurar(opcoes.jaNoApp)
      if (repeteDe) repetido = 'app'
    }

    /**
     * Fatura ja quitada e repeticao, mesmo com valor diferente.
     *
     * O app guarda o dia em que a fatura foi paga, nao o valor: marcar duas
     * vezes a mesma fatura nao muda numero nenhum, mas confunde quem esta
     * conferindo. Melhor ja vir desmarcada, dizendo por que.
     */
    if (tipo === 'cartao' && fatura?.cartaoId && repetido === 'nao') {
      const diaPago = opcoes.faturasPagas?.get(`${competencia}|${fatura.cartaoId}`)
      if (typeof diaPago === 'number') {
        repetido = 'app'
        repeteDe = {
          descricao: `Fatura do ${fatura.cartaoNome}`,
          competencia,
          dia: diaPago,
          valor: Math.abs(lancamento.valor),
          arquivo: '',
        }
      }
    }

    // A primeira linha fica sendo a referencia das proximas iguais.
    const este: OndeRepete = {
      descricao,
      competencia,
      dia,
      valor: Math.abs(lancamento.valor),
      arquivo: lancamento.arquivo || '',
    }
    marcas.forEach((marca) => {
      if (!vistasNoArquivo.has(marca)) vistasNoArquivo.set(marca, este)
    })

    return {
      id: `previa-${indice}-${lancamento.chave}`,
      descricao,
      valor: Math.abs(lancamento.valor),
      tipo,
      dia,
      competencia,
      categoria: tipo === 'saida' ? opcoes.categorizar(descricao) : '',
      cartaoId: fatura?.cartaoId || '',
      cartaoNome: fatura?.cartaoNome || '',
      temData: Boolean(lancamento.data.mes),
      repetido,
      repeteDe,
      // O que ja existe entra desmarcado: repetir lancamento e o erro mais
      // caro da importacao, porque bagunca o saldo sem avisar.
      incluir: repetido === 'nao',
      fitid: lancamento.fitid,
      arquivo: lancamento.arquivo || '',
    }
  })
}

/** O que a pessoa escolheu para um item, quando o app errou. */
export type Destino =
  | { tipo: 'saida'; categoria: string }
  | { tipo: 'cartao'; cartaoId: string; cartaoNome: string }

/**
 * Troca o destino de um item da previa.
 *
 * Mudar de saida para fatura (ou o contrario) apaga a marca de repetido: ela
 * foi calculada para o destino antigo, e continuar mostrando "já lançado"
 * depois da troca seria mentira. O item volta a entrar marcado.
 */
export function aplicarDestino(item: ItemPrevia, destino: Destino): ItemPrevia {
  const mudouDeTipo = item.tipo !== destino.tipo

  const base = mudouDeTipo
    ? { ...item, repetido: 'nao' as Repeticao, repeteDe: null, incluir: true }
    : item

  if (destino.tipo === 'cartao') {
    return {
      ...base,
      tipo: 'cartao',
      categoria: '',
      cartaoId: destino.cartaoId,
      cartaoNome: destino.cartaoNome,
    }
  }

  return {
    ...base,
    tipo: 'saida',
    categoria: destino.categoria,
    cartaoId: '',
    cartaoNome: '',
  }
}

/** Os numeros do rodape: quanto entra, quanto sai e em que meses. */
export function resumirPrevia(itens: ItemPrevia[]): ResumoPrevia {
  const marcados = itens.filter((item) => item.incluir)

  const porCompetencia = new Map<string, { quantidade: number; entradas: number; saidas: number }>()

  let entradas = 0
  let saidas = 0
  let faturas = 0

  marcados.forEach((item) => {
    if (item.tipo === 'entrada') entradas += item.valor
    else if (item.tipo === 'cartao') faturas += item.valor
    else saidas += item.valor

    const atual = porCompetencia.get(item.competencia) || { quantidade: 0, entradas: 0, saidas: 0 }
    atual.quantidade += 1
    if (item.tipo === 'entrada') atual.entradas += item.valor
    else atual.saidas += item.valor
    porCompetencia.set(item.competencia, atual)
  })

  return {
    marcados: marcados.length,
    entradas,
    saidas,
    faturas,
    // A fatura sai da conta como qualquer outra saida: entra na diferenca.
    saldo: entradas - saidas - faturas,
    repetidos: itens.filter((item) => item.repetido !== 'nao').length,
    semData: itens.filter((item) => !item.temData).length,
    porCompetencia: Array.from(porCompetencia.entries())
      .map(([competencia, dados]) => ({ competencia, ...dados }))
      .sort((a, b) => ordemDaCompetencia(a.competencia) - ordemDaCompetencia(b.competencia)),
  }
}

function ordemDaCompetencia(chave: string) {
  const [ano, mes] = String(chave || '').split('-')
  const indice = meses.indexOf(mes)
  return Number(ano) * 12 + (indice >= 0 ? indice : 0)
}

/**
 * A frase que diz com o que o lancamento repete.
 *
 * Vazia quando ele nao repete nada. O nome do outro entra sempre, mesmo
 * parecendo redundante: quando a comparacao foi pelo identificador do banco,
 * os dois nomes podem ser diferentes — e ai e essa linha que explica por que
 * o app achou que sao a mesma coisa.
 */
export function explicarRepeticao(item: ItemPrevia): string {
  if (item.repetido === 'nao' || !item.repeteDe) return ''

  const par = item.repeteDe
  const quando = `${String(par.dia).padStart(2, '0')} de ${competenciaEmTexto(par.competencia)}`
  const oQue = `"${par.descricao}", ${quando}`

  if (item.tipo === 'cartao' && item.repetido === 'app' && !par.arquivo) {
    return `A fatura já está marcada como paga em ${competenciaEmTexto(par.competencia)}, no dia ${String(par.dia).padStart(2, '0')}.`
  }

  if (item.repetido === 'app') return `Já está no app: ${oQue}.`
  if (par.arquivo && par.arquivo !== item.arquivo) return `Igual a ${oQue}, de ${par.arquivo}.`
  return `Igual a ${oQue}, deste mesmo arquivo.`
}

/** "Agosto de 2026" — como o mes de destino aparece na previa. */
export function competenciaEmTexto(chave: string) {
  const [ano, mes] = String(chave || '').split('-')
  return mes ? `${mes} de ${ano}` : chave
}

/**
 * Frase honesta sobre o que o arquivo trouxe.
 *
 * Quando a importacao vem vazia, isto e a unica coisa que o usuario tem para
 * entender o motivo — antes ele so via "Nenhum lançamento reconhecido".
 */
export function descreverLeitura(leitura: Leitura) {
  const nomes: Record<Leitura['formato'], string> = {
    ofx: 'OFX do banco',
    csv: 'CSV',
    planilha: 'Planilha',
    desconhecido: 'Arquivo',
  }

  const total = leitura.lancamentos.length
  const partes = [nomes[leitura.formato]]

  partes.push(total === 1 ? '1 lançamento' : `${total} lançamentos`)
  if (leitura.descartados) {
    partes.push(
      leitura.descartados === 1 ? '1 linha sem valor' : `${leitura.descartados} linhas sem valor`
    )
  }

  return partes.join(' · ')
}

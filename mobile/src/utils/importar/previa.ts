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
import type { DataLida } from './datas'
import type { LancamentoImportado, Leitura } from './extrato'

export type TipoItem = 'entrada' | 'saida'

/** Por que o item foi marcado como repetido. */
export type Repeticao = 'nao' | 'arquivo' | 'app'

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
  /** Se o arquivo trouxe a data, ou se a competencia e um palpite. */
  temData: boolean
  repetido: Repeticao
  incluir: boolean
  /** O identificador do banco, guardado para a proxima importacao. */
  fitid: string
}

export type ResumoPrevia = {
  /** Quantos itens estao marcados. */
  marcados: number
  entradas: number
  saidas: number
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
  jaNoApp?: Set<string>
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

/** Todas as assinaturas do que ja esta gravado, para comparar com o arquivo. */
export function assinaturasDoBanco(
  banco: Record<string, { entradas?: ItemGravado[]; saidas?: ItemGravado[] }>
): Set<string> {
  const marcas = new Set<string>()

  Object.entries(banco || {}).forEach(([competencia, mes]) => {
    ;(mes?.entradas || []).forEach((item) => {
      if (item.fitid) marcas.add(`fitid|${item.fitid}`)
      marcas.add(assinatura(competencia, 'entrada', item.nome, item.valor, Number(item.dia || 1)))
    })
    ;(mes?.saidas || []).forEach((item) => {
      if (item.fitid) marcas.add(`fitid|${item.fitid}`)
      marcas.add(assinatura(competencia, 'saida', item.nome, item.valor, Number(item.dia || 1)))
    })
  })

  return marcas
}

/** Transforma o que foi lido do arquivo nos itens que a previa mostra. */
export function montarPrevia(
  lancamentos: LancamentoImportado[],
  opcoes: OpcoesPrevia
): ItemPrevia[] {
  const vistasNoArquivo = new Set<string>()

  return lancamentos.map((lancamento, indice) => {
    const tipo: TipoItem = lancamento.valor >= 0 ? 'entrada' : 'saida'
    const competencia = competenciaDaData(lancamento.data, opcoes.competenciaPadrao)
    const dia = Math.min(31, Math.max(1, Number(lancamento.data.dia || 1)))
    const descricao = lancamento.descricao.trim() || 'Lançamento importado'

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

    let repetido: Repeticao = 'nao'
    if (marcas.some((marca) => vistasNoArquivo.has(marca))) repetido = 'arquivo'
    else if (marcas.some((marca) => opcoes.jaNoApp?.has(marca))) repetido = 'app'
    marcas.forEach((marca) => vistasNoArquivo.add(marca))

    return {
      id: `previa-${indice}-${lancamento.chave}`,
      descricao,
      valor: Math.abs(lancamento.valor),
      tipo,
      dia,
      competencia,
      categoria: tipo === 'saida' ? opcoes.categorizar(descricao) : '',
      temData: Boolean(lancamento.data.mes),
      repetido,
      // O que ja existe entra desmarcado: repetir lancamento e o erro mais
      // caro da importacao, porque bagunca o saldo sem avisar.
      incluir: repetido === 'nao',
      fitid: lancamento.fitid,
    }
  })
}

/** Os numeros do rodape: quanto entra, quanto sai e em que meses. */
export function resumirPrevia(itens: ItemPrevia[]): ResumoPrevia {
  const marcados = itens.filter((item) => item.incluir)

  const porCompetencia = new Map<string, { quantidade: number; entradas: number; saidas: number }>()

  let entradas = 0
  let saidas = 0

  marcados.forEach((item) => {
    if (item.tipo === 'entrada') entradas += item.valor
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
    saldo: entradas - saidas,
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

  const partes = [nomes[leitura.formato]]
  if (leitura.encontrados) partes.push(`${leitura.encontrados} linha(s) lida(s)`)
  if (leitura.descartados) partes.push(`${leitura.descartados} sem valor`)
  return partes.join(' · ')
}

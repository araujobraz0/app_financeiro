// Comparar um mes com o anterior.
//
// Ate agora cada competencia era uma ilha: o app mostrava agosto sem nunca
// dizer como agosto estava em relacao a julho. O dado sempre esteve no banco,
// so nao havia quem fizesse a subtracao.
//
// As contas ficam aqui, fora do componente, porque sao elas que nao podem
// estar erradas — um sinal trocado transformaria economia em gasto na cara do
// usuario.

import type { BancoDeDados, CardItem, FixoRecorrente } from '../../app/types'
import { addMonthsToCompetencia } from './competency'
import { fixosDoMes } from './fixos'

export type ResumoMes = {
  /** Salario mais as entradas do mes. */
  entrou: number
  /** Saidas variaveis, gastos fixos e cartoes somados. */
  saiu: number
  /** O que sobrou: entrou menos saiu. Negativo quando o mes fechou no vermelho. */
  sobrou: number
  /** Quanto cada categoria de saida variavel levou. */
  porCategoria: Record<string, number>
}

type Valor = { valor?: number | string | null }
type SaidaComCategoria = Valor & { categoria?: string | null }

const somar = (itens: Valor[]) =>
  (itens || []).reduce((total, item) => total + (Number(item?.valor) || 0), 0)

/** Junta o mes num punhado de numeros comparaveis. */
export function resumirMes(params: {
  salario?: number
  entradas?: Valor[]
  saidas?: SaidaComCategoria[]
  fixos?: Valor[]
  cartoes?: number
}): ResumoMes {
  const entrou = (Number(params.salario) || 0) + somar(params.entradas || [])
  const variaveis = somar(params.saidas || [])
  const saiu = variaveis + somar(params.fixos || []) + (Number(params.cartoes) || 0)

  const porCategoria: Record<string, number> = {}
  for (const saida of params.saidas || []) {
    const categoria = String(saida?.categoria || '').trim() || 'Sem categoria'
    porCategoria[categoria] = (porCategoria[categoria] || 0) + (Number(saida?.valor) || 0)
  }

  return { entrou, saiu, sobrou: entrou - saiu, porCategoria }
}

export type Diferenca = {
  atual: number
  anterior: number
  /** Positivo quando o mes atual e maior. */
  variacao: number
  /**
   * Em porcentagem, ou null quando o mes anterior era zero.
   *
   * Sair de zero para qualquer coisa e uma alta infinita: "+∞%" nao informa
   * nada, e quem desenha prefere mostrar so o valor em reais.
   */
  percentual: number | null
}

function diferenca(atual: number, anterior: number): Diferenca {
  const variacao = atual - anterior
  return {
    atual,
    anterior,
    variacao,
    percentual: anterior === 0 ? null : (variacao / Math.abs(anterior)) * 100,
  }
}

export type MudancaDeCategoria = {
  categoria: string
  atual: number
  anterior: number
  variacao: number
}

export type Comparacao = {
  entrou: Diferenca
  saiu: Diferenca
  sobrou: Diferenca
  /** As categorias que mais mexeram, da maior mudanca para a menor. */
  mudancas: MudancaDeCategoria[]
  /** Nao ha nada em nenhum dos dois meses. */
  vazio: boolean
}

export function compararMeses(atual: ResumoMes, anterior: ResumoMes, quantasCategorias = 5): Comparacao {
  const categorias = new Set([
    ...Object.keys(atual.porCategoria || {}),
    ...Object.keys(anterior.porCategoria || {}),
  ])

  const mudancas = [...categorias]
    .map((categoria) => {
      const valorAtual = atual.porCategoria[categoria] || 0
      const valorAnterior = anterior.porCategoria[categoria] || 0
      return {
        categoria,
        atual: valorAtual,
        anterior: valorAnterior,
        variacao: valorAtual - valorAnterior,
      }
    })
    // Categoria que ficou igual nao e mudanca: so ocuparia a lista.
    .filter((item) => item.variacao !== 0)
    .sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao))
    .slice(0, quantasCategorias)

  return {
    entrou: diferenca(atual.entrou, anterior.entrou),
    saiu: diferenca(atual.saiu, anterior.saiu),
    sobrou: diferenca(atual.sobrou, anterior.sobrou),
    mudancas,
    vazio:
      atual.entrou === 0 && atual.saiu === 0 && anterior.entrou === 0 && anterior.saiu === 0,
  }
}

/**
 * O tamanho da barra, de 0 a 1.
 *
 * As duas barras de um par sao medidas contra a maior das duas, e nao contra o
 * total do card: assim a diferenca entre os dois meses ocupa a largura
 * inteira, que e justamente o que se quer enxergar. Valor negativo entra pelo
 * modulo — o vermelho ja diz o sinal.
 */
export function proporcao(valor: number, maior: number) {
  if (!maior) return 0
  return Math.min(1, Math.abs(valor) / Math.abs(maior))
}

export type PontoDoMes = ResumoMes & {
  /** "2026-Agosto". */
  chave: string
  /** "ago" — o rotulo do eixo. */
  rotulo: string
}

/** "2026-Agosto" -> "ago". */
export function rotuloCurto(chave: string) {
  const mes = String(chave || '').split('-')[1] || ''
  return mes.slice(0, 3).toLowerCase()
}

/**
 * Os ultimos meses ate a competencia aberta, do mais antigo para o mais novo.
 *
 * Uma linha precisa de serie: com dois pontos ela vira um traco, e o desenho
 * nao diz mais do que dois numeros lado a lado ja diriam.
 */
export function serieDeMeses(params: {
  bancoDeDados: BancoDeDados
  fixosRecorrentes: FixoRecorrente[]
  cards: CardItem[]
  /** A competencia da direita do grafico. */
  chaveFinal: string
  quantidade?: number
}): PontoDoMes[] {
  const { bancoDeDados, fixosRecorrentes, cards, chaveFinal, quantidade = 6 } = params
  const pontos: PontoDoMes[] = []

  for (let atras = quantidade - 1; atras >= 0; atras -= 1) {
    const chave = addMonthsToCompetencia(chaveFinal, -atras)
    const mes = bancoDeDados?.[chave]

    const fixos = fixosDoMes(fixosRecorrentes || [], mes?.fixoPagos, chave)
    const cartoes = (cards || []).reduce((total, card) => {
      const parcelas = (card?.parcelas || [])
        .filter((item) => item.competencia === chave)
        .reduce((soma, item) => soma + (Number(item.valorParcela) || 0), 0)
      const assinaturas = fixosDoMes(card?.assinaturas || [], undefined, chave).reduce(
        (soma, item) => soma + (Number(item.valor) || 0),
        0
      )
      return total + parcelas + assinaturas
    }, 0)

    pontos.push({
      chave,
      rotulo: rotuloCurto(chave),
      ...resumirMes({
        salario: Number(mes?.salario || 0),
        entradas: mes?.entradas || [],
        saidas: mes?.saidas || [],
        fixos,
        cartoes,
      }),
    })
  }

  return pontos
}

/**
 * A escala vertical do grafico.
 *
 * O zero entra sempre: sem ele uma sobra negativa desenharia abaixo do fundo
 * do desenho, e uma serie toda positiva pareceria variar muito mais do que
 * varia, por comecar o eixo no menor valor.
 */
export function escalaDaSerie(pontos: PontoDoMes[]) {
  const valores = pontos.flatMap((ponto) => [ponto.entrou, ponto.saiu, ponto.sobrou])
  const maior = Math.max(0, ...valores)
  const menor = Math.min(0, ...valores)
  // Serie toda zerada: qualquer altura serve, desde que nao divida por zero.
  const amplitude = maior - menor || 1
  return { maior, menor, amplitude }
}

// As contas da carteira de investimentos.
//
// Fica fora dos componentes de proposito: soma de patrimonio, rendimento e
// alocacao sao as coisas que nao podem estar erradas nesta tela, e aqui elas
// dao para testar sem montar a interface.
//
// O app nao busca cotacao. O saldo de hoje e o que a pessoa le no extrato da
// corretora e digita; o que foi investido sai da soma dos aportes. O
// rendimento e a diferenca entre os dois — que e exatamente a conta que ela
// faria na mao.

import type { AporteItem, InvestimentoItem, TipoInvestimento } from '../../app/types'

export type EstiloDoTipo = {
  rotulo: string
  /** Cor fixa, nao vinda do tema: ela identifica a classe nos dois modos. */
  cor: string
  /** Frase de ajuda, para quem nunca investiu e nao sabe onde o ativo entra. */
  exemplo: string
}

export const TIPOS_INVESTIMENTO: Record<TipoInvestimento, EstiloDoTipo> = {
  renda_fixa: { rotulo: 'Renda fixa', cor: '#2E7DA8', exemplo: 'CDB, LCI, LCA' },
  tesouro: { rotulo: 'Tesouro', cor: '#1F9D6B', exemplo: 'Selic, IPCA+, prefixado' },
  acoes: { rotulo: 'Ações', cor: '#C2802B', exemplo: 'PETR4, ITUB4, BOVA11' },
  fiis: { rotulo: 'Fundos imobiliários', cor: '#7A5AA8', exemplo: 'MXRF11, HGLG11' },
  fundos: { rotulo: 'Fundos', cor: '#3E6AC1', exemplo: 'multimercado, cambial' },
  cripto: { rotulo: 'Cripto', cor: '#D2673F', exemplo: 'bitcoin, ethereum' },
  poupanca: { rotulo: 'Poupança', cor: '#6E8A5A', exemplo: 'a da conta do banco' },
  outros: { rotulo: 'Outros', cor: '#7C8A93', exemplo: 'previdência, ouro, o que faltar' },
}

/** Na ordem em que aparecem para escolher: do mais comum ao menos. */
export const ORDEM_TIPOS: TipoInvestimento[] = [
  'renda_fixa',
  'tesouro',
  'acoes',
  'fiis',
  'fundos',
  'cripto',
  'poupanca',
  'outros',
]

const somar = (valores: number[]) => valores.reduce((total, valor) => total + (Number(valor) || 0), 0)

/** Tudo que ja entrou no ativo. */
export function totalAportado(item: InvestimentoItem) {
  return somar((item.aportes || []).map((aporte) => aporte.valor))
}

/** Quanto o ativo rendeu, em reais. Negativo quando esta perdendo. */
export function rendimentoDe(item: InvestimentoItem) {
  return (Number(item.valorAtual) || 0) - totalAportado(item)
}

/**
 * Quanto rendeu, em porcentagem.
 *
 * Sem nada aportado nao ha percentual que faca sentido — dividir por zero
 * daria Infinity, e "∞%" na tela nao ajuda ninguem. Nesse caso vem null, e
 * quem desenha decide o que mostrar.
 */
export function rendimentoPercentualDe(item: InvestimentoItem) {
  const aportado = totalAportado(item)
  if (aportado <= 0) return null
  return (rendimentoDe(item) / aportado) * 100
}

export type ResumoDaCarteira = {
  /** Soma dos saldos de hoje. */
  patrimonio: number
  /** Soma de tudo que foi aportado, desde sempre. */
  aportado: number
  rendimento: number
  /** Em porcentagem, ou null quando nada foi aportado. */
  rendimentoPercentual: number | null
  quantidade: number
}

export function resumirCarteira(itens: InvestimentoItem[]): ResumoDaCarteira {
  const patrimonio = somar(itens.map((item) => item.valorAtual))
  const aportado = somar(itens.map(totalAportado))
  const rendimento = patrimonio - aportado

  return {
    patrimonio,
    aportado,
    rendimento,
    rendimentoPercentual: aportado > 0 ? (rendimento / aportado) * 100 : null,
    quantidade: itens.length,
  }
}

export type FatiaDaCarteira = {
  tipo: TipoInvestimento
  rotulo: string
  cor: string
  valor: number
  /** 0 a 100. */
  fatia: number
}

/**
 * Quanto cada classe pesa na carteira.
 *
 * So entram as classes com dinheiro dentro, da maior para a menor: uma
 * legenda com seis linhas em zero nao diz nada sobre a alocacao.
 */
export function alocacaoPorTipo(itens: InvestimentoItem[]): FatiaDaCarteira[] {
  const total = somar(itens.map((item) => item.valorAtual))
  if (total <= 0) return []

  const porTipo = new Map<TipoInvestimento, number>()
  for (const item of itens) {
    const valor = Number(item.valorAtual) || 0
    if (valor <= 0) continue
    porTipo.set(item.tipo, (porTipo.get(item.tipo) || 0) + valor)
  }

  return [...porTipo.entries()]
    .map(([tipo, valor]) => ({
      tipo,
      rotulo: TIPOS_INVESTIMENTO[tipo].rotulo,
      cor: TIPOS_INVESTIMENTO[tipo].cor,
      valor,
      fatia: (valor / total) * 100,
    }))
    .sort((a, b) => b.valor - a.valor)
}

/**
 * Quanto entrou na carteira inteira numa competencia.
 *
 * O saldo de partida — o que a pessoa ja tinha quando cadastrou o ativo — vem
 * com a competencia vazia, e por isso nunca entra nesta soma: ele foi juntado
 * ao longo de anos, e contado como aporte do mes daria a meta como batida no
 * instante do cadastro.
 */
export function aportadoNaCompetencia(itens: InvestimentoItem[], competencia: string) {
  if (!competencia) return 0

  return somar(
    itens.flatMap((item) =>
      (item.aportes || [])
        .filter((aporte) => aporte.competencia === competencia)
        .map((aporte) => aporte.valor)
    )
  )
}

/**
 * A meta de aporte do mes.
 *
 * Sai da porcentagem que a pessoa ja escolhia nas configuracoes — o numero
 * existia no app desde sempre, mas nao levava a lugar nenhum. Agora ele vira
 * o alvo da barra de aporte.
 */
export function metaDeAporte(base: number, percentual: number) {
  const limpo = Math.min(100, Math.max(0, Number(percentual) || 0))
  return Math.max(0, (Number(base) || 0) * (limpo / 100))
}

/** Os aportes mais recentes primeiro, para a lista do modal. */
export function aportesRecentes(item: InvestimentoItem): AporteItem[] {
  return [...(item.aportes || [])].reverse()
}

/**
 * "há 2 dias", "hoje", "" quando nunca foi atualizado.
 *
 * O saldo e digitado a mao, entao a idade dele e informacao: um patrimonio
 * atualizado ha tres meses nao vale como o de hoje, e quem olha precisa
 * saber disso sem ir procurar.
 */
export function idadeDoSaldo(iso: string): string {
  if (!iso) return ''
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''

  const dias = Math.floor((Date.now() - data.getTime()) / (1000 * 60 * 60 * 24))
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`

  const meses = Math.floor(dias / 30)
  if (meses === 1) return 'há 1 mês'
  if (meses < 12) return `há ${meses} meses`

  const anos = Math.floor(meses / 12)
  return anos === 1 ? 'há 1 ano' : `há ${anos} anos`
}

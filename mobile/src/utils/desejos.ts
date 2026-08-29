// As contas da lista de desejos.
//
// A versao anterior media cada item contra o saldo inteiro, um de cada vez.
// Com R$ 700 no bolso e dois itens de R$ 600, o card dizia "2 cabem no
// saldo" — os dois cabem sozinhos, mas nao juntos, e comprar um deixa o outro
// fora. Aqui a conta e cumulativa: do mais barato ao mais caro, ate o
// dinheiro acabar.
//
// E entra uma pergunta que o app tem como responder e nao respondia: em
// quantos meses da. Ele conhece a sobra dos meses passados; dividir o que
// falta pela sobra media transforma "faltam R$ 1.800" em "uns 3 meses".

import type { ShoppingWishItem } from '../../app/types'

export type DesejoAvaliado = {
  item: ShoppingWishItem
  preco: number
  /** Quanto ainda falta para o preco. Zero quando ja da. */
  falta: number
  /** 0 a 1: quanto do preco o saldo cobre. */
  proporcao: number
  /** O saldo cobre este item sozinho. */
  cabeSozinho: boolean
  /** Entra na cesta, contando o que os mais baratos ja consumiram. */
  cabeJunto: boolean
  /** Quantos meses de sobra faltam. Null quando nao da para estimar. */
  mesesParaDar: number | null
}

/**
 * A sobra media dos meses que tiveram movimento.
 *
 * Meses vazios ficam de fora: o banco nasce com cinco anos de competencias em
 * branco, e a media puxada por elas diria que nao sobra nada. Sobra negativa
 * conta como zero — mes no vermelho nao junta dinheiro, mas tambem nao apaga
 * o que os outros juntaram.
 */
export function sobraMediaMensal(sobras: { entrou: number; sobrou: number }[]) {
  const comMovimento = sobras.filter((mes) => mes.entrou > 0)
  if (comMovimento.length === 0) return 0

  const total = comMovimento.reduce((soma, mes) => soma + Math.max(0, mes.sobrou), 0)
  return total / comMovimento.length
}

/**
 * Avalia a lista contra o dinheiro disponivel.
 *
 * A ordem e do mais perto de dar para o mais longe, que e a ordem em que a
 * pergunta se faz: "o que eu consigo comprar agora?".
 */
export function avaliarDesejos(
  itens: ShoppingWishItem[],
  disponivel: number,
  sobraMensal = 0
): DesejoAvaliado[] {
  const bolso = Math.max(0, Number(disponivel) || 0)
  const sobra = Math.max(0, Number(sobraMensal) || 0)

  const pendentes = itens
    .filter((item) => !item.comprado)
    .map((item) => ({ item, preco: Math.max(0, Number(item.precoAtual) || 0) }))
    .sort((a, b) => a.preco - b.preco)

  let restante = bolso

  return pendentes.map(({ item, preco }) => {
    const cabeSozinho = preco > 0 && preco <= bolso
    const cabeJunto = preco > 0 && preco <= restante
    if (cabeJunto) restante -= preco

    const falta = Math.max(0, preco - bolso)

    return {
      item,
      preco,
      falta,
      proporcao: preco > 0 ? Math.min(1, bolso / preco) : 1,
      cabeSozinho,
      cabeJunto,
      // Sem sobra nao ha prazo para estimar: mostrar "0 meses" mentiria.
      mesesParaDar: falta === 0 ? 0 : sobra > 0 ? Math.ceil(falta / sobra) : null,
    }
  })
}

export type ResumoDesejos = {
  quantosPendentes: number
  quantosComprados: number
  /** Soma dos precos ainda na lista. */
  totalPendente: number
  /** Quantos dao para comprar de uma vez so, com o dinheiro de hoje. */
  quantosCabemJuntos: number
  /** Quanto custa a cesta que cabe. */
  custoDaCesta: number
  /** O item mais perto de dar, ou null com a lista vazia. */
  proximo: DesejoAvaliado | null
}

export function resumirDesejos(avaliados: DesejoAvaliado[], comprados: number): ResumoDesejos {
  const cesta = avaliados.filter((desejo) => desejo.cabeJunto)

  return {
    quantosPendentes: avaliados.length,
    quantosComprados: comprados,
    totalPendente: avaliados.reduce((soma, desejo) => soma + desejo.preco, 0),
    quantosCabemJuntos: cesta.length,
    custoDaCesta: cesta.reduce((soma, desejo) => soma + desejo.preco, 0),
    // O mais perto de dar e o primeiro da lista, que ja vem ordenada.
    proximo: avaliados[0] || null,
  }
}

/** "uns 3 meses", "mês que vem", "" quando nao da para estimar. */
export function prazoEmTexto(meses: number | null) {
  if (meses === null) return ''
  if (meses <= 0) return 'já dá'
  if (meses === 1) return 'mês que vem'
  if (meses > 24) return 'mais de 2 anos'
  if (meses >= 12) {
    const anos = Math.round(meses / 12)
    return anos === 1 ? 'uns 12 meses' : `uns ${anos} anos`
  }
  return `uns ${meses} meses`
}

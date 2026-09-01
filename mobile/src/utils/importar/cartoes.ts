// Reconhecer o pagamento da fatura do cartao dentro do extrato.
//
// No extrato da conta, a fatura do cartao aparece como uma saida qualquer:
// "PAGTO CARTAO NUBANK", "PAGAMENTO DE FATURA", "DEB AUT CARTAO ITAU". Sem
// reconhecer isso, a importacao lancava aquilo como gasto comum — e o mes
// ficava contando duas vezes, porque as parcelas do cartao ja entram pelo
// proprio cartao. Reconhecendo, o valor vai para o cartao certo e a fatura
// daquele mes fica marcada como paga.
//
// O reconhecimento e por texto, entao erra: por isso nada disso e automatico
// no fim. Tudo aparece na previa, com o cartao escolhido, e da para trocar de
// cartao ou dizer que nao e fatura antes de importar.

const semAcento = (texto: string) =>
  String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * As palavras que dizem "isto saiu para quitar alguma coisa".
 *
 * Com limite de palavra, e nao pedaco solto: "pag" dentro de "pagseguro" nao
 * pode valer, senao toda compra em maquininha viraria pagamento de fatura.
 */
const PAGAMENTO = /\b(pagamento|pagamentos|pagto|pagt|pgto|pgt|pag|paga|quitacao)\b|\bdeb\.?\s*aut/

/** As palavras que dizem "isto e do cartao". */
const CARTAO = /\b(fatura|faturas|cartao|cartoes|cartão)\b/

/**
 * O que parece cartao mas nao e a fatura.
 *
 * Compra no debito traz "cartao" no texto o tempo todo, e estorno de fatura
 * entra na conta em vez de sair dela.
 */
const NAO_E_FATURA = /\b(compra|saque|anuidade|estorno|devolucao|deposito)\b|cartao de debito/

/** Palavra que sozinha nao identifica cartao nenhum. */
const GENERICAS = new Set([
  'cartao',
  'cartoes',
  'credito',
  'banco',
  'conta',
  'fatura',
  'meu',
  'black',
  'gold',
  'platinum',
  'internacional',
  'nacional',
  'visa',
  'master',
  'mastercard',
  'elo',
])

export type CartaoConhecido = { id: string; nome: string }

/** A descricao parece o pagamento de uma fatura de cartao? */
export function pareceFaturaDeCartao(descricao: string): boolean {
  const texto = semAcento(descricao)
  if (!texto) return false
  if (NAO_E_FATURA.test(texto)) return false

  return PAGAMENTO.test(texto) && CARTAO.test(texto)
}

/**
 * Qual cartao a descricao nomeia.
 *
 * O nome inteiro vale mais que um pedaco, e o mais longo vale mais que o mais
 * curto: com "Nubank" e "Nubank Ultravioleta" cadastrados, "PAGTO NUBANK
 * ULTRAVIOLETA" tem de cair no segundo.
 */
export function acharCartao(descricao: string, cartoes: CartaoConhecido[]): CartaoConhecido | null {
  const texto = semAcento(descricao)
  if (!texto) return null

  let melhorCartao: CartaoConhecido | null = null
  let melhorPeso = 0

  const considerar = (cartao: CartaoConhecido, peso: number) => {
    if (peso <= melhorPeso) return
    melhorCartao = cartao
    melhorPeso = peso
  }

  for (const cartao of cartoes || []) {
    const nome = semAcento(cartao.nome)
    if (!nome) continue

    // "Cartão Nubank" cadastrado tem de achar "PAGTO NUBANK": o nome inteiro
    // nao aparece, mas a palavra que identifica o cartao aparece.
    const palavras = nome
      .split(/[^a-z0-9]+/)
      .filter((palavra) => palavra.length >= 3 && !GENERICAS.has(palavra))

    /**
     * Nome so de palavras genericas nao identifica nada.
     *
     * Um cartao chamado "Cartão" casaria com qualquer "PAGAMENTO CARTAO" e
     * roubaria a fatura dos outros. Quando ele e o unico cadastrado, quem
     * resolve e a regra do cartao unico, mais adiante.
     */
    if (!palavras.length) continue

    if (texto.includes(nome)) {
      considerar(cartao, nome.length + 100)
      continue
    }

    for (const palavra of palavras) {
      if (new RegExp(`\\b${palavra}\\b`).test(texto)) considerar(cartao, palavra.length)
    }
  }

  return melhorCartao
}

export type PagamentoReconhecido = {
  /** Vazio quando parece fatura mas nao da para dizer de qual cartao. */
  cartaoId: string
  cartaoNome: string
}

/**
 * Reconhece o pagamento de fatura de um lancamento do extrato.
 *
 * Devolve null quando nao parece fatura. So saida vale: fatura de cartao nao
 * entra dinheiro na conta.
 *
 * Quando parece fatura e ha um cartao so cadastrado, e ele — nao ha outra
 * resposta possivel, e obrigar a escolher seria burocracia. Com varios, sem
 * nome reconhecido, volta sem cartao e a previa pede para escolher.
 */
export function reconhecerPagamentoDeCartao(
  descricao: string,
  valor: number,
  cartoes: CartaoConhecido[]
): PagamentoReconhecido | null {
  if (!(valor < 0)) return null
  if (!pareceFaturaDeCartao(descricao)) return null

  const lista = cartoes || []
  const achado = acharCartao(descricao, lista)
  if (achado) return { cartaoId: achado.id, cartaoNome: achado.nome }

  if (lista.length === 1) return { cartaoId: lista[0].id, cartaoNome: lista[0].nome }

  return { cartaoId: '', cartaoNome: '' }
}

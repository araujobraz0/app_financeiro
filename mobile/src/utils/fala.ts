// Entende um lancamento dito em voz alta.
//
// O reconhecimento do navegador as vezes devolve o numero em digitos ("84,50")
// e as vezes por extenso ("oitenta e quatro e cinquenta") — depende de como a
// pessoa falou. As duas formas precisam funcionar, senao a ferramenta so serve
// para quem aprender a falar do jeito certo.

/** O que foi entendido de uma fala. */
export type FalaInterpretada = {
  tipo: 'entrada' | 'saida'
  nome: string
  valor: number
  /** Categoria adivinhada pelo nome. Null quando nada bateu. */
  categoria: string | null
  /** Texto cru, para a tela mostrar o que ouviu. */
  transcricao: string
}

const UNIDADES: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19,
}

const DEZENAS: Record<string, number> = {
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90,
}

const CENTENAS: Record<string, number> = {
  cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400,
  quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800,
  novecentos: 900,
}

/** Palavras que dizem "isto entrou" em vez de "isto saiu". */
const PALAVRAS_ENTRADA = [
  'entrada', 'entrou', 'recebi', 'receber', 'recebimento', 'ganhei', 'ganho',
  'salario', 'salário', 'freela', 'pagamento recebido', 'caiu',
]

/**
 * Ruido de comando: sai do nome em qualquer posicao.
 *
 * Sao palavras que descrevem a acao ou a moeda, nunca o que foi comprado.
 */
const RUIDO = [
  'r', 'rs', 'reais', 'real', 'conto', 'contos', 'pila', 'centavos', 'centavo',
  'gastei', 'gasto', 'paguei', 'pagar', 'comprei', 'comprar', 'lancar',
  'lance', 'anotar', 'anota', 'adicionar', 'adiciona', 'registrar', 'registra',
  'entrada', 'saida', 'recebi', 'ganhei',
]

/**
 * Ligacoes: saem so das pontas do nome.
 *
 * "produtos de limpeza" precisa do "de" para continuar sendo o que e; ja o
 * "em" de "gastei 13 em produtos de limpeza" nao faz falta nenhuma. A
 * diferenca e a posicao, entao e a posicao que decide.
 */
const PREPOSICOES = [
  'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'com',
  'para', 'pra', 'pro', 'por',
]

const CONECTIVOS = [
  'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'com',
  'e', 'para', 'pra', 'pro', 'por', 'a', 'o', 'ao', 'um', 'uma',
]

export function normalizar(texto: string) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Converte uma sequencia de palavras em numero.
 *
 * Aceita "mil duzentos e trinta" e para na primeira palavra que nao for
 * numero, devolvendo tambem quantas palavras consumiu — e isso que permite
 * separar o valor do resto da frase.
 */
function lerNumeroPorExtenso(palavras: string[], inicio: number) {
  let total = 0
  let parcial = 0
  let consumidas = 0
  let leuAlgo = false

  // Casas ja preenchidas no bloco atual. Sem isto, "oitenta e quatro e
  // cinquenta" virava 134: a segunda dezena somava ao inves de encerrar o
  // numero, e o "e cinquenta" que eram os centavos entrava no valor cheio.
  let temCentena = false
  let temDezena = false
  let temUnidade = false

  for (let i = inicio; i < palavras.length; i += 1) {
    const palavra = palavras[i]

    if (palavra === 'e' && leuAlgo) {
      consumidas += 1
      continue
    }

    if (palavra === 'mil') {
      total += (parcial || 1) * 1000
      parcial = 0
      leuAlgo = true
      consumidas += 1
      temCentena = false
      temDezena = false
      temUnidade = false
      continue
    }

    if (CENTENAS[palavra] !== undefined) {
      if (temCentena || temDezena || temUnidade) break
      parcial += CENTENAS[palavra]
      temCentena = true
    } else if (DEZENAS[palavra] !== undefined) {
      if (temDezena || temUnidade) break
      parcial += DEZENAS[palavra]
      temDezena = true
    } else if (UNIDADES[palavra] !== undefined) {
      if (temUnidade) break
      // "dez" a "dezenove" ja sao dezena completa: nada pode vir depois.
      if (temDezena && UNIDADES[palavra] >= 10) break
      parcial += UNIDADES[palavra]
      temUnidade = true
    } else {
      break
    }

    leuAlgo = true
    consumidas += 1
  }

  if (!leuAlgo) return null

  // Um "e" solto no fim pertence ao resto da frase, nao ao numero.
  while (consumidas > 0 && palavras[inicio + consumidas - 1] === 'e') consumidas -= 1

  return { valor: total + parcial, consumidas }
}

/** Acha o valor na frase e devolve as palavras que sobraram. */
function extrairValor(palavras: string[]) {
  for (let i = 0; i < palavras.length; i += 1) {
    const palavra = palavras[i]

    // Digitos: "84,50", "84.50" ou "1.234,56"
    const emDigitos = palavra.match(/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:[.,]\d{1,2})?$/)
    if (emDigitos) {
      const bruto = palavra.includes(',')
        ? palavra.replace(/\./g, '').replace(',', '.')
        : palavra
      let valor = Number(bruto)
      let consumidas = 1

      // "84 e 50" ou "84 e cinquenta": o segundo numero sao os centavos.
      if (Number.isInteger(valor) && palavras[i + 1] === 'e') {
        const centavos = lerNumeroPorExtenso(palavras, i + 2)
        const emDigitosDepois = palavras[i + 2]?.match(/^\d{1,2}$/)
        if (emDigitosDepois) {
          valor += Number(emDigitosDepois[0]) / 100
          consumidas = 3
        } else if (centavos && centavos.valor < 100) {
          valor += centavos.valor / 100
          consumidas = 2 + centavos.consumidas
        }
      }

      if (Number.isFinite(valor) && valor > 0) {
        return { valor, resto: [...palavras.slice(0, i), ...palavras.slice(i + consumidas)] }
      }
    }

    // Por extenso
    const lido = lerNumeroPorExtenso(palavras, i)
    if (lido && lido.valor > 0) {
      let valor = lido.valor
      let consumidas = lido.consumidas

      // "oitenta e quatro reais e cinquenta [centavos]"
      const depois = inicioDosCentavos(palavras, i + consumidas)
      if (depois) {
        const centavos = lerNumeroPorExtenso(palavras, depois)
        if (centavos && centavos.valor < 100) {
          valor += centavos.valor / 100
          consumidas = depois - i + centavos.consumidas
        }
      }

      return { valor, resto: [...palavras.slice(0, i), ...palavras.slice(i + consumidas)] }
    }
  }

  return null
}

/** Onde comecam os centavos depois do valor cheio, se houver. */
function inicioDosCentavos(palavras: string[], indice: number) {
  let i = indice
  if (palavras[i] === 'reais' || palavras[i] === 'real') i += 1
  if (palavras[i] === 'e') return i + 1
  return null
}

/**
 * Le uma frase como "gastei 84,50 no mercado" e devolve o lancamento.
 *
 * Devolve null quando nao ha valor nenhum: sem numero nao existe lancamento, e
 * chutar zero seria pior que avisar que nao deu.
 */
export function interpretarFala(
  transcricao: string,
  categorias: string[]
): FalaInterpretada | null {
  const limpo = normalizar(transcricao)
    // O reconhecimento ouve "quatorze e cinquenta" e escreve "14h50" ou
    // "14:50", achando que e hora. Num app de dinheiro nao e: sao os
    // centavos, e sem isto o lancamento saia sem valor nenhum.
    .replace(/(\d+)\s*[h:]\s*(\d{1,2})(?![\d\w])/g, '$1,$2')
    .replace(/(\d+)\s*h(?![\w])/g, '$1')
    // "R$" vira "r" solto e o ponto final gruda na ultima palavra: os dois
    // acabavam dentro do nome do lancamento.
    .replace(/r\$/g, ' ')
    .replace(/[^\w\s,.]/g, ' ')
    .replace(/([a-z])[.,]+(?=\s|$)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (!limpo) return null

  const palavras = limpo.split(' ')
  const achado = extrairValor(palavras)
  if (!achado) return null

  const ehEntrada = PALAVRAS_ENTRADA.some((termo) => limpo.includes(normalizar(termo)))

  // A categoria sai de dentro do nome quando vem apresentada por uma
  // preposicao: "no mercado Semar" vira Semar na categoria Mercado. Sem
  // preposicao ela e o proprio nome — "comida do trabalho" continua inteira.
  const naFrase = acharCategoriaNasPalavras(achado.resto, categorias)
  const ehLugar = !!naFrase && naFrase.inicio > 0 && PREPOSICOES.includes(achado.resto[naFrase.inicio - 1])
  const semCategoria = ehLugar && naFrase
    ? [...achado.resto.slice(0, naFrase.inicio), ...achado.resto.slice(naFrase.fim)]
    : achado.resto

  const nomeBruto = montarNome(semCategoria)
  const categoria = naFrase?.categoria || acharCategoria(nomeBruto || limpo, categorias)

  // Sem nome sobrando, a categoria vira o nome — "gastei 50" no mercado fica
  // "Mercado", que diz mais que um lancamento em branco.
  const nome = nomeBruto || categoria || (ehEntrada ? 'Entrada' : 'Saída')

  return {
    tipo: ehEntrada ? 'entrada' : 'saida',
    nome: nome.charAt(0).toUpperCase() + nome.slice(1),
    valor: Math.round(achado.valor * 100) / 100,
    categoria,
    transcricao: String(transcricao || '').trim(),
  }
}

/**
 * Junta o que sobrou num nome apresentavel.
 *
 * O ruido de comando sai de qualquer lugar; as ligacoes so das pontas, senao
 * "produtos de limpeza" viraria "produtos limpeza".
 */
function montarNome(palavras: string[]) {
  const uteis = palavras.filter((palavra) => palavra && !RUIDO.includes(palavra))

  let inicio = 0
  let fim = uteis.length
  while (inicio < fim && CONECTIVOS.includes(uteis[inicio])) inicio += 1
  while (fim > inicio && CONECTIVOS.includes(uteis[fim - 1])) fim -= 1

  return uteis.slice(inicio, fim).join(' ').trim()
}

/**
 * Onde a categoria aparece na frase, palavra por palavra.
 *
 * Compara palavras inteiras (e nao pedaco de texto) porque quem acha precisa
 * dizer tambem o que tirar do nome. Categorias de nome mais longo vem antes,
 * para "Casa e contas" ganhar de "Casa".
 */
function acharCategoriaNasPalavras(palavras: string[], categorias: string[]) {
  const candidatos = categorias
    .map((categoria) => ({ categoria, termos: normalizar(categoria).split(' ').filter(Boolean) }))
    .filter((c) => c.termos.length > 0 && normalizar(c.categoria).length > 2)
    .sort((a, b) => b.termos.length - a.termos.length)

  for (const candidato of candidatos) {
    const total = candidato.termos.length
    for (let i = 0; i + total <= palavras.length; i += 1) {
      if (candidato.termos.every((termo, j) => palavras[i + j] === termo)) {
        return { categoria: candidato.categoria, inicio: i, fim: i + total }
      }
    }
  }

  return null
}

/** Categoria cujo nome aparece na fala. */
function acharCategoria(texto: string, categorias: string[]) {
  const alvo = normalizar(texto)
  const encontrada = categorias.find((categoria) => {
    const nome = normalizar(categoria)
    return nome.length > 2 && alvo.includes(nome)
  })
  return encontrada || null
}

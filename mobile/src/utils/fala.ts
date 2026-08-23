// Entende um lancamento dito em voz alta.
//
// O reconhecimento do navegador as vezes devolve o numero em digitos ("84,50")
// e as vezes por extenso ("oitenta e quatro e cinquenta") — depende de como a
// pessoa falou. As duas formas precisam funcionar, senao a ferramenta so serve
// para quem aprender a falar do jeito certo.

import { meses } from './dates'

/** Onde o lancamento vai parar. */
export type DestinoFala = 'variavel' | 'cartao' | 'fixo' | 'assinatura'

/** Tudo que o app sabe e que ajuda a entender a fala. */
export type ContextoFala = {
  categorias: string[]
  /** Nome ja ensinado -> categoria. */
  memoria?: Record<string, string>
  /** Nomes dos cartoes, para "no cartao nubank" achar o cartao certo. */
  cartoes?: string[]
  /** Nomes e lugares ja usados, para consertar o que o reconhecimento errou. */
  conhecidos?: string[]
  /** Ultimo valor gasto em cada lugar, para quando ele nao for dito. */
  valores?: Record<string, number>
}

/** O que foi entendido de uma fala. */
export type FalaInterpretada = {
  tipo: 'entrada' | 'saida'
  nome: string
  valor: number
  /** Categoria adivinhada pelo nome. Null quando nada bateu. */
  categoria: string | null
  /** Dia do mes dito na frase ("ontem", "dia 12"). Null = hoje. */
  dia: number | null
  /** Mes dito na frase ("de julho", "mes passado"). Null = o mes aberto. */
  mes: string | null
  /** Ano, quando o mes dito atravessa a virada. Null = o ano aberto. */
  ano: number | null
  /** Onde isto vai: variavel, cartao, gasto fixo ou assinatura do cartao. */
  destino: DestinoFala
  /** Cartao dito na frase. Null quando nao e compra de cartao. */
  cartao: string | null
  /** Em quantas vezes ("em 3 vezes"). Null = a vista. */
  parcelas: number | null
  /** O valor nao foi dito: veio do ultimo gasto naquele mesmo lugar. */
  valorDeMemoria: boolean
  /**
   * O lugar dito na frase — "na padaria", "no posto ipiranga".
   *
   * E ele que fica na memoria quando o app pergunta a categoria: quem ensina
   * que padaria e Comida quer que valha para o bolo, o pao e o cafe, nao so
   * para aquele bolo.
   */
  referencia: string | null
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
  'hoje', 'ontem', 'anteontem', 'dia',
  // Verbos do dia a dia que so contam a acao: "comprei um bolo na padaria"
  // e um bolo, nao um "comprei bolo".
  'abasteci', 'almocei', 'jantei', 'comi', 'bebi', 'tomei', 'peguei', 'fui',
  'fiz', 'usei', 'coloquei', 'botei', 'levei', 'mandei', 'torrei',
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

/**
 * Preposicoes que apresentam um lugar: "na padaria", "no posto".
 *
 * Sao so as de "em + artigo". "de uber" e "em produtos de limpeza" ficam de
 * fora de proposito — ali a palavra e o que foi comprado, nao onde.
 */
const MARCADORES_DE_LUGAR = ['no', 'na', 'nos', 'nas']

const CONECTIVOS = [
  'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'com',
  'e', 'para', 'pra', 'pro', 'por', 'a', 'o', 'ao', 'um', 'uma',
]

/** Verbos que dizem "isto saiu", para o pedaco nao herdar tipo errado. */
const MARCAS_DE_SAIDA = ['gastei', 'gasto', 'paguei', 'pagar', 'comprei', 'comprar', 'saida']

/** Os meses do jeito que o app guarda a competencia. */
const MESES_APP = meses

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

    // "um" sozinho quase sempre e artigo, nao preco: em "comprei um bolo na
    // padaria 12" o valor e 12. So vale como numero se vier a moeda atras
    // ("um real") ou se fizer parte de um numero maior ("vinte e um").
    const artigoSolto =
      !!lido &&
      lido.consumidas === 1 &&
      (palavra === 'um' || palavra === 'uma') &&
      !['real', 'reais', 'conto', 'contos', 'pila'].includes(palavras[i + 1])

    if (lido && lido.valor > 0 && !artigoSolto) {
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

/** Meses como o app guarda, e como a pessoa fala. */
const MESES_FALADOS = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** Quantos numeros a frase tem. Menos de dois e todos eles sao o valor. */
function contarNumeros(palavras: string[]) {
  return palavras.filter((palavra) => ehNumero(palavra)).length
}

/**
 * Tira da frase quando a coisa aconteceu — dia e mes.
 *
 * Sai antes do valor de proposito: em "dia 12 gastei 50" o 12 seria lido como
 * preco. Por seguranca, um numero so vira dia se ainda sobrar outro numero na
 * frase para ser o valor — senao "mercado dia 12" ficaria sem valor nenhum.
 */
function extrairData(palavras: string[]) {
  let dia: number | null = null
  let mes: string | null = null
  let ano: number | null = null
  const usadas = new Set<number>()
  const sobramNumeros = () => contarNumeros(palavras.filter((_, i) => !usadas.has(i))) > 1

  const deHoje = (passos: number) => {
    const data = new Date()
    data.setDate(data.getDate() + passos)
    dia = data.getDate()
    mes = MESES_APP[data.getMonth()]
    ano = data.getFullYear()
  }

  const mesRelativo = (passos: number) => {
    const data = new Date()
    data.setDate(1)
    data.setMonth(data.getMonth() + passos)
    mes = MESES_APP[data.getMonth()]
    ano = data.getFullYear()
  }

  for (let i = 0; i < palavras.length; i += 1) {
    if (usadas.has(i)) continue
    const palavra = palavras[i]

    if (palavra === 'hoje' || palavra === 'ontem' || palavra === 'anteontem') {
      deHoje(palavra === 'hoje' ? 0 : palavra === 'ontem' ? -1 : -2)
      usadas.add(i)
      continue
    }

    // "mes passado", "mes que vem", "proximo mes"
    if (palavra === 'mes') {
      if (palavras[i + 1] === 'passado') {
        mesRelativo(-1)
        usadas.add(i).add(i + 1)
        if (PREPOSICOES.includes(palavras[i - 1])) usadas.add(i - 1)
        continue
      }
      if (palavras[i + 1] === 'que' && palavras[i + 2] === 'vem') {
        mesRelativo(1)
        usadas.add(i).add(i + 1).add(i + 2)
        continue
      }
      if (palavras[i - 1] === 'proximo' || palavras[i - 1] === 'proxima') {
        mesRelativo(1)
        usadas.add(i).add(i - 1)
        continue
      }
    }

    // "30 de julho" / "dia 30 de julho"
    const indiceMes = MESES_FALADOS.indexOf(palavra)
    if (indiceMes >= 0) {
      mes = MESES_APP[indiceMes]
      usadas.add(i)
      if (palavras[i - 1] === 'de' || palavras[i - 1] === 'em') usadas.add(i - 1)

      const antes = palavras[i - 2]
      const numeroAntes = antes && /^\d{1,2}$/.test(antes) ? Number(antes) : null
      if (dia === null && numeroAntes && numeroAntes >= 1 && numeroAntes <= 31 && sobramNumeros()) {
        dia = numeroAntes
        usadas.add(i - 2)
        if (palavras[i - 3] === 'dia') usadas.add(i - 3)
      }
      continue
    }

    if (palavra === 'dia' && dia === null) {
      const emDigitos = palavras[i + 1]?.match(/^(\d{1,2})$/)
      if (emDigitos && sobramNumeros()) {
        const numero = Number(emDigitos[1])
        if (numero >= 1 && numero <= 31) {
          dia = numero
          usadas.add(i).add(i + 1)
          continue
        }
      }
      const extenso = lerNumeroPorExtenso(palavras, i + 1)
      if (extenso && extenso.valor >= 1 && extenso.valor <= 31 && sobramNumeros()) {
        dia = extenso.valor
        usadas.add(i)
        for (let j = 0; j < extenso.consumidas; j += 1) usadas.add(i + 1 + j)
        continue
      }
    }
  }

  return { dia, mes, ano, resto: palavras.filter((_, i) => !usadas.has(i)) }
}

/**
 * Em quantas vezes a compra foi parcelada.
 *
 * Sai antes do valor porque "em 3 vezes" tem um numero que nao e preco.
 */
function extrairParcelas(palavras: string[]) {
  const usadas = new Set<number>()
  let parcelas: number | null = null

  for (let i = 0; i < palavras.length && parcelas === null; i += 1) {
    const palavra = palavras[i]

    // "3x"
    const grudado = palavra.match(/^(\d{1,2})x$/)
    if (grudado) {
      parcelas = Number(grudado[1])
      usadas.add(i)
      if (palavras[i - 1] === 'em') usadas.add(i - 1)
      break
    }

    if (palavra !== 'vezes' && palavra !== 'parcelas' && palavra !== 'parcela' && palavra !== 'vez') {
      continue
    }

    // "em 3 vezes" / "em tres vezes"
    const antes = palavras[i - 1]
    if (antes && /^\d{1,2}$/.test(antes)) {
      parcelas = Number(antes)
      usadas.add(i).add(i - 1)
    } else {
      const extenso = antes ? lerNumeroPorExtenso([antes], 0) : null
      if (extenso && extenso.valor >= 1 && extenso.valor <= 48) {
        parcelas = extenso.valor
        usadas.add(i).add(i - 1)
      }
    }

    if (parcelas !== null) {
      const inicio = i - 2
      if (palavras[inicio] === 'em' || palavras[inicio] === 'parcelado') usadas.add(inicio)
      if (palavras[inicio - 1] === 'parcelado') usadas.add(inicio - 1)
    }
  }

  const valida = parcelas !== null && parcelas >= 1 && parcelas <= 48 ? parcelas : null
  return { parcelas: valida, resto: palavras.filter((_, i) => !usadas.has(i)) }
}

/**
 * Qual cartao foi usado.
 *
 * Aceita "no cartao nubank", "no credito" e ate so "no nubank" — se o nome
 * bate com um cartao cadastrado, era do cartao mesmo.
 */
function extrairCartao(palavras: string[], cartoes: string[]) {
  const usadas = new Set<number>()
  let cartao: string | null = null
  let marcado = false

  // Ninguem fala "cartao Nubank Ultravioleta": fala "nubank". Entao vale o
  // nome inteiro, e tambem qualquer palavra propria dele.
  const acharNome = () => {
    const candidatos = cartoes
      .map((nome) => ({ nome, termos: normalizar(nome).split(' ').filter(Boolean) }))
      .filter((c) => c.termos.length)
      .sort((a, b) => b.termos.length - a.termos.length)

    for (const candidato of candidatos) {
      const total = candidato.termos.length
      for (let i = 0; i + total <= palavras.length; i += 1) {
        if (candidato.termos.every((termo, j) => mesmaPalavra(palavras[i + j], termo))) {
          for (let j = 0; j < total; j += 1) usadas.add(i + j)
          return candidato.nome
        }
      }
    }

    for (const candidato of candidatos) {
      for (const termo of candidato.termos) {
        if (termo.length <= 2) continue
        const i = palavras.findIndex((palavra) => mesmaPalavra(palavra, termo))
        if (i >= 0) {
          usadas.add(i)
          return candidato.nome
        }
      }
    }

    return null
  }

  palavras.forEach((palavra, i) => {
    if (palavra === 'cartao' || palavra === 'credito' || palavra === 'cartoes') {
      marcado = true
      usadas.add(i)
      if (MARCADORES_DE_LUGAR.includes(palavras[i - 1]) || palavras[i - 1] === 'de') usadas.add(i - 1)
      if (palavras[i + 1] === 'de') usadas.add(i + 1)
    }
  })

  cartao = acharNome()
  if (cartao && !marcado) {
    // "no nubank": a preposicao que apresentava o cartao tambem sai.
    const primeira = Math.min(...[...usadas])
    if (MARCADORES_DE_LUGAR.includes(palavras[primeira - 1])) usadas.add(primeira - 1)
  }
  if (!cartao && marcado && cartoes.length === 1) cartao = cartoes[0]

  const noCartao = marcado || !!cartao
  return { cartao: noCartao ? cartao : null, noCartao, resto: palavras.filter((_, i) => !usadas.has(i)) }
}

/** "todo mes", "mensal", "fixo": isto se repete. */
function extrairRepeticao(palavras: string[]) {
  const usadas = new Set<number>()
  let repete = false

  palavras.forEach((palavra, i) => {
    if (palavra === 'mensal' || palavra === 'mensalmente' || palavra === 'fixo') {
      repete = true
      usadas.add(i)
      if (palavras[i - 1] === 'gasto' || palavras[i - 1] === 'e') usadas.add(i - 1)
    }
    if (palavra === 'todo' && (palavras[i + 1] === 'mes' || palavras[i + 1] === 'dia')) {
      repete = true
      usadas.add(i).add(i + 1)
    }
    if (palavra === 'todos' && palavras[i + 1] === 'os' && palavras[i + 2] === 'meses') {
      repete = true
      usadas.add(i).add(i + 1).add(i + 2)
    }
  })

  return { repete, resto: palavras.filter((_, i) => !usadas.has(i)) }
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
/** Tira do texto tudo que atrapalha a leitura do valor e do nome. */
export function limparFrase(transcricao: string) {
  return normalizar(transcricao)
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
}

export function interpretarFala(
  transcricao: string,
  contexto: ContextoFala,
  /** Acentos do texto original, quando a frase ja veio partida em pedacos. */
  acentos?: Record<string, string>
): FalaInterpretada | null {
  const limpo = limparFrase(transcricao)
  if (!limpo) return null

  // A ordem importa: tudo que tem numero e nao e preco sai primeiro, senao o
  // dia, o mes ou o "3 vezes" seriam lidos como valor.
  const comData = extrairData(limpo.split(' '))
  const comParcelas = extrairParcelas(comData.resto)
  const comCartao = extrairCartao(comParcelas.resto, contexto.cartoes || [])
  const comRepeticao = extrairRepeticao(comCartao.resto)

  const achado = extrairValor(comRepeticao.resto)

  const ehEntrada = PALAVRAS_ENTRADA.some((termo) => limpo.includes(normalizar(termo)))
  const mapa = acentos || mapaDeAcentos(transcricao)
  const sobrou = achado ? achado.resto : comRepeticao.resto

  // A categoria sai de dentro do nome quando vem apresentada por uma
  // preposicao: "no mercado Semar" vira Semar na categoria Mercado. Sem
  // preposicao ela e o proprio nome — "comida do trabalho" continua inteira.
  const naFrase = acharCategoriaNasPalavras(sobrou, contexto.categorias)
  const ehLugar = !!naFrase && naFrase.inicio > 0 && PREPOSICOES.includes(sobrou[naFrase.inicio - 1])
  const semCategoria = ehLugar && naFrase
    ? [...sobrou.slice(0, naFrase.inicio), ...sobrou.slice(naFrase.fim)]
    : sobrou

  // O que veio depois de "na"/"no" e onde a coisa foi comprada. Isso e o nome
  // do lugar, nao do item: "comprei um bolo na padaria" e um bolo.
  const marcador = acharMarcadorDeLugar(semCategoria)
  const lugar = marcador >= 0 ? semCategoria.slice(marcador + 1) : []
  const foraDoLugar = marcador >= 0 ? semCategoria.slice(0, marcador) : semCategoria

  const nomeSemLugar = corrigirPeloHistorico(montarNome(foraDoLugar, mapa), contexto.conhecidos)
  const nomeDoLugar = corrigirPeloHistorico(montarNome(lugar, mapa), contexto.conhecidos)

  // Se sobrou nome fora do lugar, o lugar so serve de referencia. Se nao
  // sobrou nada — "gastei 12 na padaria" —, o lugar e o proprio nome, mas
  // continua valendo como referencia: e ele que vai para a memoria.
  const nomeBruto = nomeSemLugar || nomeDoLugar
  const referenciaBruta =
    nomeDoLugar || (ehLugar && naFrase ? normalizar(naFrase.categoria) : '') || ''
  const referencia = referenciaBruta ? normalizar(referenciaBruta) : null

  // Valor nao dito: se este lugar ja teve gasto antes, repete o ultimo — e o
  // "de sempre" do cafe da padaria, que a pessoa so confirma.
  const lembrado = achado ? null : valorLembrado(referencia, nomeBruto, contexto.valores)
  if (!achado && lembrado === null) return null

  const valor = achado ? achado.valor : (lembrado as number)

  const categoria = naFrase?.categoria || acharCategoria(nomeBruto || limpo, contexto.categorias)

  // Sem nome sobrando, a categoria vira o nome — "gastei 50" no mercado fica
  // "Mercado", que diz mais que um lancamento em branco. E quando o nome e a
  // propria categoria, vale a grafia dela: "mercados 30" fica "Mercado".
  const ehAPropriaCategoria =
    !!categoria &&
    nomeBruto.split(' ').length === normalizar(categoria).split(' ').length &&
    nomeBruto
      .split(' ')
      .every((palavra: string, i: number) =>
        mesmaPalavra(palavra, normalizar(categoria as string).split(' ')[i])
      )

  // "comprei 300 no cartao em 3 vezes" nao diz o que foi comprado; "Compra"
  // e mais util na fatura do que repetir o nome do cartao.
  const semNome = comCartao.noCartao
    ? 'Compra'
    : comRepeticao.repete
      ? 'Gasto fixo'
      : ehEntrada
        ? 'Entrada'
        : 'Saída'

  const nome = (ehAPropriaCategoria ? categoria : nomeBruto) || categoria || semNome

  const destino: DestinoFala = comCartao.noCartao
    ? comRepeticao.repete
      ? 'assinatura'
      : 'cartao'
    : comRepeticao.repete
      ? 'fixo'
      : 'variavel'

  return {
    tipo: ehEntrada && destino === 'variavel' ? 'entrada' : 'saida',
    nome: nome.charAt(0).toUpperCase() + nome.slice(1),
    valor: Math.round(valor * 100) / 100,
    categoria,
    dia: comData.dia,
    mes: comData.mes,
    ano: comData.ano,
    referencia,
    destino,
    cartao: comCartao.cartao,
    parcelas: destino === 'cartao' ? comParcelas.parcelas : null,
    valorDeMemoria: !achado,
    transcricao: String(transcricao || '').trim(),
  }
}

/**
 * O ultimo valor gasto naquele lugar.
 *
 * "um cafe na padaria", sem preco, quase sempre custa o mesmo do cafe da
 * semana passada — melhor mostrar esse numero para confirmar do que recusar a
 * frase inteira.
 */
function valorLembrado(
  referencia: string | null,
  nome: string,
  valores?: Record<string, number>
) {
  if (!valores) return null
  const chaves = [referencia, normalizar(nome)].filter(Boolean) as string[]
  for (const chave of chaves) {
    if (valores[chave] > 0) return valores[chave]
  }
  return null
}

/**
 * De volta aos acentos: "farmacia" -> "farmácia".
 *
 * A leitura acontece sem acento nenhum, senao "acai" e "açaí" seriam coisas
 * diferentes. Mas o nome que fica salvo e o que a pessoa ve, e ali o acento
 * faz falta — entao ele volta do texto original, palavra por palavra.
 */
function mapaDeAcentos(transcricao: string) {
  const mapa: Record<string, string> = {}

  String(transcricao || '')
    .split(/\s+/)
    .forEach((bruto) => {
      const limpo = bruto.replace(/[.,;:!?"'()[\]]/g, '').toLowerCase()
      if (!limpo) return
      const chave = normalizar(limpo)
      // So interessa quando o original tem acento: "MERCADO" continua virando
      // "Mercado", e nao "MERCADO".
      if (chave !== limpo && !mapa[chave]) mapa[chave] = limpo
    })

  return mapa
}

/**
 * Conserta o nome ouvido usando os que a pessoa ja usou.
 *
 * O reconhecimento erra nome proprio o tempo todo — "Semar" vira "cimar",
 * "cemar", "semard". Como o app sabe todos os lugares onde ela ja gastou, um
 * nome quase igual a um deles quase sempre e ele.
 */
function corrigirPeloHistorico(nome: string, conhecidos?: string[]) {
  if (!nome || !conhecidos?.length) return nome

  const alvo = normalizar(nome)
  if (alvo.length < 4) return nome

  let melhor: { nome: string; distancia: number } | null = null
  conhecidos.forEach((conhecido) => {
    const outro = normalizar(conhecido)
    if (!outro || outro === alvo) return
    // So compara nomes de tamanho parecido: "uber" e "supermercado" nunca
    // serao a mesma coisa, por mais letras iguais que tenham.
    if (Math.abs(outro.length - alvo.length) > 2) return

    const distancia = distanciaEntre(alvo, outro)
    if (distancia === 0) return
    // Uma letra trocada em nome curto, duas a partir de cinco letras — e o
    // que separa "cimar" de "Semar" sem transformar "bolo" em "bola".
    const limite = alvo.length >= 5 ? 2 : 1
    if (distancia <= limite && (!melhor || distancia < melhor.distancia)) {
      melhor = { nome: conhecido, distancia }
    }
  })

  return melhor ? (melhor as { nome: string }).nome : nome
}

/** Quantas letras precisam mudar para uma palavra virar a outra. */
function distanciaEntre(a: string, b: string) {
  const linha = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i += 1) {
    let anterior = linha[0]
    linha[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const guardado = linha[j]
      linha[j] = Math.min(
        linha[j] + 1,
        linha[j - 1] + 1,
        anterior + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
      anterior = guardado
    }
  }

  return linha[b.length]
}

/**
 * Junta o que sobrou num nome apresentavel.
 *
 * O ruido de comando sai de qualquer lugar; as ligacoes so das pontas, senao
 * "produtos de limpeza" viraria "produtos limpeza".
 */
function montarNome(palavras: string[], acentos: Record<string, string>) {
  const uteis = palavras
    .filter((palavra) => palavra && !RUIDO.includes(palavra))
    .map((palavra) => acentos[palavra] || palavra)

  let inicio = 0
  let fim = uteis.length
  while (inicio < fim && CONECTIVOS.includes(uteis[inicio])) inicio += 1
  while (fim > inicio && CONECTIVOS.includes(uteis[fim - 1])) fim -= 1

  return uteis.slice(inicio, fim).join(' ').trim()
}

/**
 * Onde comeca o lugar na frase, se houver.
 *
 * Vale o ultimo marcador: em "comprei um bolo na padaria no centro" o que
 * interessa e o conjunto final, e nao a primeira preposicao que aparecer.
 */
function acharMarcadorDeLugar(palavras: string[]) {
  for (let i = palavras.length - 2; i >= 0; i -= 1) {
    if (MARCADORES_DE_LUGAR.includes(palavras[i]) && palavras.slice(i + 1).some((p) => !RUIDO.includes(p))) {
      return i
    }
  }
  return -1
}

/** Mesma palavra, tolerando o plural: "mercados" e "mercado" sao uma so. */
function mesmaPalavra(a: string, b: string) {
  if (!a || !b) return false
  if (a === b) return true
  const semPlural = (palavra: string) => palavra.replace(/(oes|aes|ns|es|s)$/, '')
  return semPlural(a) === semPlural(b) && semPlural(a).length > 2
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
      if (candidato.termos.every((termo, j) => mesmaPalavra(palavras[i + j], termo))) {
        return { categoria: candidato.categoria, inicio: i, fim: i + total }
      }
    }
  }

  return null
}

/**
 * Categoria que este nome ja teve antes.
 *
 * "Padaria" nao e categoria nenhuma, mas se da primeira vez ela foi anotada
 * como Comida, toda padaria dita depois entra em Comida sozinha. A busca cai
 * para palavra solta porque "padaria do bairro" e a mesma padaria.
 */
export function categoriaLembrada(nome: string, memoria?: Record<string, string>) {
  if (!memoria) return null
  const chave = normalizar(nome)
  if (memoria[chave]) return memoria[chave]

  const palavras = chave.split(' ').filter((palavra) => palavra.length > 2)
  for (const palavra of palavras) {
    if (memoria[palavra]) return memoria[palavra]
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

/**
 * Palavras que emendam um lancamento no outro.
 *
 * "e" fica de fora desta lista porque ele tanto separa dois lancamentos
 * ("mercado 50 e uber 20") quanto faz parte de um numero so ("oitenta e
 * quatro"). Quem decide isso e a vizinhanca — ver `separaAqui`.
 */
const EMENDAS = ['mais', 'tambem', 'depois', 'dai', 'ai', 'entao', 'agora']

/** Esta palavra e pedaco de numero? */
function ehNumero(palavra: string) {
  if (!palavra) return false
  if (/^\d/.test(palavra)) return true
  return (
    palavra === 'mil' ||
    UNIDADES[palavra] !== undefined ||
    DEZENAS[palavra] !== undefined ||
    CENTENAS[palavra] !== undefined
  )
}

/** O "e" desta posicao termina um lancamento ou esta no meio de um numero? */
function separaAqui(palavras: string[], i: number) {
  const palavra = palavras[i]
  if (EMENDAS.includes(palavra)) return true
  if (palavra !== 'e') return false
  // "oitenta e quatro": numero dos dois lados, entao e o mesmo valor.
  return !(ehNumero(palavras[i - 1]) && ehNumero(palavras[i + 1]))
}

/**
 * Le uma fala inteira e devolve todos os lancamentos que couberem nela.
 *
 * "gastei 50 no mercado e 22 no uber" sao dois lancamentos, nao um. Quando a
 * frase tem um so, o resultado e uma lista de um — quem chama nao precisa
 * saber a diferenca.
 */
export function interpretarVarias(
  transcricao: string,
  contexto: ContextoFala
): FalaInterpretada[] {
  const limpo = limparFrase(transcricao)
  if (!limpo) return []

  const acentos = mapaDeAcentos(transcricao)
  const palavras = limpo.split(' ')
  // Cada pedaco guarda tambem a emenda que o fechou: se ele nao virar
  // lancamento sozinho, essa emenda volta junto com as palavras para o
  // pedaco seguinte — "mercado e padaria 50" e um item so, nao meio item.
  const pedacos: { palavras: string[]; emenda: string }[] = [{ palavras: [], emenda: '' }]
  palavras.forEach((palavra, i) => {
    const ultimo = pedacos[pedacos.length - 1]
    if (separaAqui(palavras, i)) {
      if (ultimo.palavras.length) {
        ultimo.emenda = palavra
        pedacos.push({ palavras: [], emenda: '' })
      }
      return
    }
    ultimo.palavras.push(palavra)
  })

  const achados: FalaInterpretada[] = []
  let tipoAnterior: 'entrada' | 'saida' | null = null
  let sobra: string[] = []

  pedacos.forEach((pedaco) => {
    if (!pedaco.palavras.length) return
    const juntas = [...sobra, ...pedaco.palavras]
    sobra = []
    const frase = juntas.join(' ')
    const lido = interpretarFala(frase, contexto, acentos)
    if (!lido) {
      sobra = pedaco.emenda ? [...juntas, pedaco.emenda] : juntas
      return
    }

    // "recebi 500 de freela e 200 de aula": o segundo pedaco nao repete o
    // "recebi", entao herda o tipo de quem veio antes.
    const temMarca =
      PALAVRAS_ENTRADA.some((termo) => frase.includes(normalizar(termo))) ||
      MARCAS_DE_SAIDA.some((termo) => frase.includes(termo))
    const tipo = temMarca || !tipoAnterior ? lido.tipo : tipoAnterior

    tipoAnterior = tipo
    achados.push({
      ...lido,
      tipo,
      categoria:
        lido.categoria ||
        categoriaLembrada(lido.referencia || '', contexto.memoria) ||
        categoriaLembrada(lido.nome, contexto.memoria),
      transcricao: String(transcricao || '').trim(),
    })
  })

  // Nenhum pedaco deu certo sozinho: tenta a frase inteira, que pode ser um
  // lancamento so com um "e" no meio do nome.
  if (!achados.length) {
    const unico = interpretarFala(transcricao, contexto)
    if (!unico) return []
    return [
      {
        ...unico,
        categoria:
          unico.categoria ||
          categoriaLembrada(unico.referencia || '', contexto.memoria) ||
          categoriaLembrada(unico.nome, contexto.memoria),
      },
    ]
  }

  return achados
}

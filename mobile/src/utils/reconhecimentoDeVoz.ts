// Ouvir o usuario, com o que o navegador tiver.
//
// O reconhecimento de fala e uma API do proprio navegador: nao ha servidor,
// chave nem custo. O Chrome implementa bem; o Safari implementa a mesma API
// (com prefixo webkit) mas erra mais e as vezes desiste sozinho.
//
// Por isso existe o plano B, que funciona em QUALQUER aparelho: em vez de o
// app ouvir, ele abre um campo de texto e quem dita e o teclado do sistema —
// aquele microfone ao lado da barra de espaco. O texto chega igual e o mesmo
// interpretador cuida do resto.

import { Platform } from 'react-native'

type Reconhecimento = {
  start: () => void
  stop: () => void
  abort: () => void
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((evento: any) => void) | null
  onerror: ((evento: any) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

function construtor(): (new () => Reconhecimento) | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null
  const janela = window as unknown as Record<string, unknown>
  return (janela.SpeechRecognition || janela.webkitSpeechRecognition) as
    | (new () => Reconhecimento)
    | null
}

/** O navegador consegue ouvir sozinho? */
export function navegadorOuve() {
  return construtor() !== null
}

type Opcoes = {
  onTexto: (texto: string) => void
  onErro: (motivo: string) => void
  onFim: () => void
}

/**
 * Um reconhecedor so, reaproveitado.
 *
 * Cada `new SpeechRecognition()` abre uma negociacao nova de microfone — e era
 * isso que fazia o navegador pedir permissao a cada frase, ja que o app reabre
 * a escuta depois de cada uma. Reusando o mesmo objeto, a permissao e pedida
 * uma vez e vale para a conversa inteira.
 */
let compartilhado: Reconhecimento | null = null

/** Safari nao aguenta `continuous`: termina sem devolver nada. */
function ehSafari() {
  if (typeof navigator === 'undefined') return false
  const agente = navigator.userAgent || ''
  return /safari/i.test(agente) && !/chrome|chromium|crios|android|edg/i.test(agente)
}

function obterReconhecimento() {
  if (compartilhado) return compartilhado

  const Reconhecedor = construtor()
  if (!Reconhecedor) return null

  const novo = new Reconhecedor()
  novo.lang = 'pt-BR'
  // Onde da, uma sessao so atende varias frases: menos aberturas de
  // microfone, menos pedido de permissao, menos piscar do indicador.
  novo.continuous = !ehSafari()
  novo.interimResults = false
  novo.maxAlternatives = 1

  compartilhado = novo
  return compartilhado
}

/**
 * Comeca a ouvir e devolve como parar.
 *
 * Cada frase entendida chega por `onTexto` — uma sessao pode trazer varias.
 */
export function ouvir({ onTexto, onErro, onFim }: Opcoes) {
  const reconhecimento = obterReconhecimento()
  if (!reconhecimento) {
    onErro('sem-suporte')
    onFim()
    return () => {}
  }

  let encerrado = false
  // Mandar parar antes de o navegador ter comecado nao para nada: o pedido se
  // perde e o microfone continua ligado depois que a tela ja fechou. Por isso
  // o pedido fica guardado e e refeito assim que ele comeca.
  let comecou = false
  let querParar = false

  const desligar = () => {
    reconhecimento.onresult = null
    reconhecimento.onerror = null
    reconhecimento.onend = null
    reconhecimento.onstart = null
    try {
      reconhecimento.stop()
    } catch {
      // Ja estava parado.
    }
    try {
      reconhecimento.abort()
    } catch {
      // Ja estava parado.
    }
  }

  reconhecimento.onstart = () => {
    comecou = true
    if (querParar) desligar()
  }

  reconhecimento.onresult = (evento: any) => {
    // Com `continuous`, cada frase nova chega no fim da lista; `resultIndex`
    // diz onde ela comeca. Sem ele, o app repetiria a primeira para sempre.
    const inicio = typeof evento?.resultIndex === 'number' ? evento.resultIndex : 0
    const resultados = evento?.results || []

    for (let i = inicio; i < resultados.length; i += 1) {
      const resultado = resultados[i]
      if (resultado?.isFinal === false) continue
      const texto = resultado?.[0]?.transcript
      if (texto) onTexto(String(texto))
    }
  }

  reconhecimento.onerror = (evento: any) => {
    const codigo = String(evento?.error || 'desconhecido')
    // "aborted" e o que acontece quando o proprio app manda parar.
    if (codigo !== 'aborted') onErro(codigo)
  }

  reconhecimento.onend = () => {
    if (encerrado) return
    encerrado = true
    onFim()
  }

  try {
    reconhecimento.start()
  } catch {
    onErro('falha-ao-iniciar')
    onFim()
  }

  return () => {
    encerrado = true
    querParar = true
    if (comecou) desligar()
    else {
      // Ainda nao comecou: mesmo assim tenta, e o onstart repete o pedido.
      try {
        reconhecimento.abort()
      } catch {
        // Ja estava parado.
      }
    }
  }
}

/** Mensagem para cada motivo de falha, em portugues de gente. */
export function explicarErro(motivo: string) {
  if (motivo === 'not-allowed' || motivo === 'service-not-allowed') {
    return 'O navegador bloqueou o microfone. Libere o acesso e tente de novo.'
  }
  if (motivo === 'no-speech') return 'Não ouvi nada. Toque e fale logo em seguida.'
  if (motivo === 'audio-capture') return 'Nenhum microfone disponível neste aparelho.'
  if (motivo === 'network') return 'O reconhecimento precisa de internet.'
  if (motivo === 'sem-suporte') return 'Este navegador não escuta — digite ou use o microfone do teclado.'
  return 'Não consegui entender. Tente de novo ou escreva.'
}

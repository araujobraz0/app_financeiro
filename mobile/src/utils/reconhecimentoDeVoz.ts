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
 * Comeca a ouvir e devolve como parar.
 *
 * Uma frase curta e so: `continuous` no Safari costuma terminar sem devolver
 * nada, e um lancamento cabe numa frase.
 */
export function ouvir({ onTexto, onErro, onFim }: Opcoes) {
  const Reconhecedor = construtor()
  if (!Reconhecedor) {
    onErro('sem-suporte')
    onFim()
    return () => {}
  }

  let encerrado = false
  const reconhecimento = new Reconhecedor()
  reconhecimento.lang = 'pt-BR'
  reconhecimento.continuous = false
  reconhecimento.interimResults = false
  reconhecimento.maxAlternatives = 1

  reconhecimento.onresult = (evento: any) => {
    const texto = evento?.results?.[0]?.[0]?.transcript
    if (texto) onTexto(String(texto))
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
    try {
      reconhecimento.abort()
    } catch {
      // Ja estava parado.
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

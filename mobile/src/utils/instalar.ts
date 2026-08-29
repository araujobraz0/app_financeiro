// Instalar o app na tela inicial.
//
// O site ja tem manifesto e service worker, entao o navegador aceita
// instala-lo — so que o convite fica escondido no menu de tres pontinhos, e
// quase ninguem vai la. Aqui ele vira um botao visivel, ao lado do selo de
// premium.
//
// Os dois caminhos sao bem diferentes:
//
//   - No Chrome (Android e computador) o navegador avisa por
//     `beforeinstallprompt` que a instalacao esta liberada. Guardamos o evento
//     e o disparamos quando a pessoa toca no botao.
//
//   - No iPhone nao existe esse evento. O Safari so instala pelo menu de
//     compartilhar, entao o botao ali explica o caminho em vez de tentar
//     abrir um dialogo que nao existe.

import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'

type EventoDeInstalacao = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** O app esta rodando da tela inicial, e nao de dentro do navegador. */
function jaInstalado() {
  if (typeof window === 'undefined') return false

  const comoApp = window.matchMedia?.('(display-mode: standalone)')?.matches
  // O Safari do iPhone nao implementa display-mode; ele marca isto.
  const noSafari = (window.navigator as unknown as { standalone?: boolean })?.standalone
  return Boolean(comoApp || noSafari)
}

function ehIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export type Instalacao = {
  /** Vale a pena mostrar o botao. */
  disponivel: boolean
  /** No iPhone o botao explica o caminho em vez de abrir um dialogo. */
  precisaDeInstrucoes: boolean
  /** Abre o dialogo do navegador. Devolve se a pessoa aceitou. */
  instalar: () => Promise<boolean>
}

export function useInstalacao(): Instalacao {
  const [evento, setEvento] = useState<EventoDeInstalacao | null>(null)
  const [instalado, setInstalado] = useState(() => Platform.OS === 'web' && jaInstalado())

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return

    const aoPoderInstalar = (e: Event) => {
      // Sem isto o Chrome mostra a propria barra de instalacao por cima do
      // app, competindo com o botao daqui.
      e.preventDefault()
      setEvento(e as EventoDeInstalacao)
    }

    const aoInstalar = () => {
      setInstalado(true)
      setEvento(null)
    }

    window.addEventListener('beforeinstallprompt', aoPoderInstalar)
    window.addEventListener('appinstalled', aoInstalar)

    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  const instalar = useCallback(async () => {
    if (!evento) return false

    try {
      await evento.prompt()
      const { outcome } = await evento.userChoice
      // O evento so serve uma vez: guardado, o segundo toque nao faria nada.
      setEvento(null)
      if (outcome === 'accepted') setInstalado(true)
      return outcome === 'accepted'
    } catch {
      setEvento(null)
      return false
    }
  }, [evento])

  const noIphone = Platform.OS === 'web' && !instalado && ehIos()

  return {
    disponivel: Platform.OS === 'web' && !instalado && (Boolean(evento) || noIphone),
    precisaDeInstrucoes: noIphone && !evento,
    instalar,
  }
}

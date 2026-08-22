// De onde vem o "modo escuro" quando o app segue a preferencia de fora.
//
// No aparelho isso e o tema do sistema. Na web quem responde e o navegador,
// atraves de `prefers-color-scheme` — e o navegador pode ter uma preferencia
// propria, diferente da do sistema. O `useColorScheme` do React Native le esse
// mesmo sinal, mas na web nem sempre reage quando ele muda com a pagina ja
// aberta; aqui a mudanca e ouvida direto na fonte.

import { useEffect, useState } from 'react'
import { Platform, useColorScheme } from 'react-native'

type Esquema = 'light' | 'dark'

/** Rotulo certo para a origem da preferencia, para a tela nao mentir. */
export const origemDoTema = Platform.OS === 'web' ? 'navegador' : 'sistema'

function consultarNavegador(): Esquema | null {
  if (Platform.OS !== 'web') return null
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function usePreferenciaDeCor(): Esquema {
  const doReactNative = useColorScheme()
  const [doNavegador, setDoNavegador] = useState<Esquema | null>(() => consultarNavegador())

  useEffect(() => {
    if (Platform.OS !== 'web') return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    const aoMudar = (evento: MediaQueryListEvent) => setDoNavegador(evento.matches ? 'dark' : 'light')

    // Safari antigo nao tem addEventListener nesta interface.
    if (typeof consulta.addEventListener === 'function') {
      consulta.addEventListener('change', aoMudar)
      return () => consulta.removeEventListener('change', aoMudar)
    }
    consulta.addListener(aoMudar)
    return () => consulta.removeListener(aoMudar)
  }, [])

  return doNavegador || (doReactNative === 'dark' ? 'dark' : 'light')
}

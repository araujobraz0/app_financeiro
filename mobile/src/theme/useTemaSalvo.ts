// O tema escolhido, guardado e recuperado — em um lugar so.
//
// Antes cada tela tinha a sua copia disto. A copia da pagina de premium nao
// esperava a leitura do que estava guardado: os efeitos de gravar rodavam
// junto com a montagem e escreviam "manual" por cima do "seguir o navegador"
// que o usuario tinha acabado de ligar. Sair da home e voltar desligava a
// opcao sozinha.
//
// Aqui a gravacao so acontece depois que a leitura terminou — e como e uma so,
// nao ha como duas telas discordarem.

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { SettingsThemeMode } from '../../app/types'
import { usePreferenciaDeCor } from '../utils/esquemaDeCor'
import { darkTheme, lightTheme, THEME_KEY, THEME_MODE_KEY } from './themes'

export function useTemaSalvo() {
  // Na web isto e a preferencia do navegador; no aparelho, a do sistema.
  const colorScheme = usePreferenciaDeCor()

  const [temaEscuro, setTemaEscuro] = useState(false)
  const [themeMode, setThemeMode] = useState<SettingsThemeMode>('manual')
  const [carregado, setCarregado] = useState(false)
  const carregadoRef = useRef(false)

  useEffect(() => {
    let vivo = true

    const ler = async () => {
      const temaSalvo = await AsyncStorage.getItem(THEME_KEY)
      const modoSalvo = await AsyncStorage.getItem(THEME_MODE_KEY)
      if (!vivo) return

      if (modoSalvo === 'system') {
        setThemeMode('system')
        setTemaEscuro(colorScheme === 'dark')
      } else {
        setThemeMode('manual')
        if (temaSalvo) setTemaEscuro(temaSalvo === 'dark')
      }

      carregadoRef.current = true
      setCarregado(true)
    }

    ler()
    return () => {
      vivo = false
    }
    // De proposito sem `colorScheme`: a leitura e uma vez so, e o efeito
    // abaixo cuida de acompanhar o navegador dali em diante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Enquanto a leitura nao terminou, nada e gravado: e essa trava que faltava.
  useEffect(() => {
    if (!carregadoRef.current) return
    if (themeMode === 'system') setTemaEscuro(colorScheme === 'dark')
    AsyncStorage.setItem(THEME_MODE_KEY, themeMode)
  }, [themeMode, colorScheme])

  useEffect(() => {
    if (!carregadoRef.current) return
    if (themeMode === 'manual') {
      AsyncStorage.setItem(THEME_KEY, temaEscuro ? 'dark' : 'light')
    }
  }, [temaEscuro, themeMode])

  /** Sol/lua: escolher a mao desliga o "seguir o sistema". */
  const alternarTema = useCallback(() => {
    setThemeMode('manual')
    AsyncStorage.setItem(THEME_MODE_KEY, 'manual')
    setTemaEscuro((prev) => {
      const proximo = !prev
      AsyncStorage.setItem(THEME_KEY, proximo ? 'dark' : 'light')
      return proximo
    })
  }, [])

  const alternarModoTemaSistema = useCallback(() => {
    setThemeMode((prev) => {
      const proximo: SettingsThemeMode = prev === 'system' ? 'manual' : 'system'
      AsyncStorage.setItem(THEME_MODE_KEY, proximo)

      if (proximo === 'system') setTemaEscuro(colorScheme === 'dark')
      else AsyncStorage.setItem(THEME_KEY, temaEscuro ? 'dark' : 'light')

      return proximo
    })
  }, [colorScheme, temaEscuro])

  return {
    theme: temaEscuro ? darkTheme : lightTheme,
    temaEscuro,
    setTemaEscuro,
    themeMode,
    /** A leitura do que estava guardado ja terminou. */
    carregado,
    alternarTema,
    alternarModoTemaSistema,
  }
}

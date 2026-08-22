// Destaque do item encontrado na busca.
//
// A primeira versao pintava o card inteiro de dourado: chamava atencao, mas
// borrava o proprio conteudo que a busca acabou de encontrar — voce achava o
// item e nao conseguia ler o valor dele.
//
// Aqui o card continua com a cara de sempre. O que muda e a moldura: um anel
// que acende, um brilho que percorre a linha uma vez, so, e uma marca na
// lateral que sobrevive um pouco mais para o olho reencontrar o item depois de
// rolar. Tudo se apaga sozinho.

import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import type { Tema } from '../../../app/types'
import { spring } from '../../../src/theme/motion'

type Props = {
  theme: Tema
  ativo: boolean
  /** Raio do card destacado, para a moldura acompanhar o mesmo canto. */
  raio?: number
}

export default function DestaqueBusca({ theme, ativo, raio = 16 }: Props) {
  const entrada = useSharedValue(0)
  const respiro = useSharedValue(0)
  const varredura = useSharedValue(0)

  useEffect(() => {
    if (!ativo) {
      entrada.value = withTiming(0, { duration: 240 })
      respiro.value = 0
      varredura.value = 0
      return
    }

    entrada.value = withSpring(1, spring.snappy)

    // Duas respiradas discretas e para: um pisca-pisca longo cansa.
    respiro.value = withSequence(
      withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), 4, true),
      withTiming(0, { duration: 300 })
    )

    // O brilho passa uma vez so, logo depois de a rolagem chegar.
    varredura.value = 0
    varredura.value = withDelay(
      160,
      withTiming(1, { duration: 780, easing: Easing.out(Easing.cubic) })
    )
  }, [ativo, entrada, respiro, varredura])

  const anel = useAnimatedStyle(() => ({
    opacity: entrada.value * interpolate(respiro.value, [0, 1], [0.45, 1]),
    borderWidth: interpolate(respiro.value, [0, 1], [1.5, 2]),
  }))

  const fundo = useAnimatedStyle(() => ({
    // Bem de leve: so o suficiente para o card se separar dos vizinhos.
    opacity: entrada.value * interpolate(respiro.value, [0, 1], [0.03, 0.08]),
  }))

  const brilho = useAnimatedStyle(() => ({
    opacity: interpolate(varredura.value, [0, 0.12, 0.8, 1], [0, 0.5, 0.28, 0]),
    transform: [
      { translateX: `${interpolate(varredura.value, [0, 1], [-140, 260])}%` },
      { skewX: '-18deg' },
    ],
  }))

  const marca = useAnimatedStyle(() => ({
    opacity: entrada.value,
    transform: [{ scaleY: interpolate(entrada.value, [0, 1], [0.2, 1]) }],
  }))

  if (!ativo) return null

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.camada, { borderRadius: raio, backgroundColor: theme.accent }, fundo]}
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.camada, { borderRadius: raio, borderColor: theme.accent }, anel]}
      />

      {/* Faixa clara atravessando: o "achei" acontece uma vez e passa */}
      <Animated.View
        pointerEvents="none"
        style={[styles.brilho, { backgroundColor: theme.accent }, brilho]}
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.marca, { backgroundColor: theme.accent }, marca]}
      />
    </>
  )
}

const styles = StyleSheet.create({
  camada: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  brilho: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '38%' },
  marca: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
})

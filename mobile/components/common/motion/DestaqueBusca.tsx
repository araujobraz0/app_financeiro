// Destaque do item encontrado na busca.
//
// Antes era uma borda que aparecia e sumia — no meio de uma lista de cartoes
// ja cheia de bordas, quase nao se notava qual item era. Aqui o item recebe um
// halo que respira algumas vezes e depois se apaga: chama o olho sem precisar
// gritar, e some sozinho quando ja cumpriu o papel.

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
  /** Raio do card destacado, para o halo acompanhar o mesmo canto. */
  raio?: number
}

export default function DestaqueBusca({ theme, ativo, raio = 16 }: Props) {
  const entrada = useSharedValue(0)
  const pulso = useSharedValue(0)

  useEffect(() => {
    if (!ativo) {
      entrada.value = withTiming(0, { duration: 260 })
      pulso.value = 0
      return
    }

    entrada.value = withSpring(1, spring.snappy)
    pulso.value = withSequence(
      withRepeat(withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }), 5, true),
      withTiming(0, { duration: 320 })
    )
  }, [ativo, entrada, pulso])

  const halo = useAnimatedStyle(() => ({
    opacity: entrada.value * interpolate(pulso.value, [0, 1], [0.16, 0.5]),
    transform: [{ scale: interpolate(entrada.value, [0, 1], [1.05, 1]) }],
  }))

  const anel = useAnimatedStyle(() => ({
    opacity: entrada.value * interpolate(pulso.value, [0, 1], [0.55, 1]),
    transform: [{ scale: interpolate(entrada.value, [0, 1], [1.06, 1]) }],
  }))

  const faixa = useAnimatedStyle(() => ({
    opacity: entrada.value * interpolate(pulso.value, [0, 0.5, 1], [0, 0.9, 0]),
  }))

  if (!ativo) return null

  return (
    <>
      {/* Preenchimento suave: tinge o item sem apagar o que esta escrito */}
      <Animated.View
        pointerEvents="none"
        style={[styles.camada, { borderRadius: raio, backgroundColor: theme.accent }, halo]}
      />

      {/* Anel: e ele que diz "e este aqui" */}
      <Animated.View
        pointerEvents="none"
        style={[styles.camada, { borderRadius: raio, borderColor: theme.accent }, styles.anel, anel]}
      />

      {/* Marca na lateral, para achar o item de relance ao rolar */}
      <Animated.View
        pointerEvents="none"
        style={[styles.faixa, { backgroundColor: theme.accent }, faixa]}
      />
    </>
  )
}

const styles = StyleSheet.create({
  camada: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  anel: { borderWidth: 2 },
  faixa: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
})

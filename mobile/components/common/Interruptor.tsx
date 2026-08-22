// Interruptor liga/desliga com o botao deslizando.
//
// A versao anterior trocava a posicao do circulo por estilo condicional, entao
// o salto era instantaneo e nao dava para perceber a direcao da mudanca.

import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import type { Tema } from '../../app/types'
import { spring } from '../../src/theme/motion'
import PressableScale from './motion/PressableScale'

const LARGURA = 50
const ALTURA = 30
const BOLA = 24
const CURSO = LARGURA - BOLA - 6

type Props = {
  theme: Tema
  ativo: boolean
  onAlternar: () => void
}

export default function Interruptor({ theme, ativo, onAlternar }: Props) {
  const progresso = useSharedValue(ativo ? 1 : 0)

  useEffect(() => {
    progresso.value = withSpring(ativo ? 1 : 0, spring.snappy)
  }, [ativo, progresso])

  const estiloTrilha = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progresso.value, [0, 1], [theme.backgroundSoft, theme.primary]),
    borderColor: interpolateColor(progresso.value, [0, 1], [theme.border, theme.primary]),
  }))

  const estiloBola = useAnimatedStyle(() => ({
    transform: [{ translateX: progresso.value * CURSO }],
    backgroundColor: interpolateColor(progresso.value, [0, 1], [theme.muted, theme.textInverse]),
  }))

  return (
    <PressableScale
      onPress={onAlternar}
      scaleTo={0.92}
      accessibilityRole="switch"
      accessibilityState={{ checked: ativo }}
    >
      <Animated.View style={[styles.trilha, estiloTrilha]}>
        <Animated.View style={[styles.bola, estiloBola]} />
      </Animated.View>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  trilha: {
    width: LARGURA,
    height: ALTURA,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  bola: { width: BOLA, height: BOLA, borderRadius: 999 },
})

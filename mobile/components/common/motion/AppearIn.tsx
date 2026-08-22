// Entrada em cascata: cada filho sobe e aparece com um pequeno atraso,
// criando a sensacao de que a tela se monta em vez de piscar pronta.

import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { duration, staggerDelay } from '../../../src/theme/motion'

type Props = {
  children: ReactNode
  /** Posicao na lista — define o atraso. */
  index?: number
  /** Distancia vertical percorrida na entrada. */
  distance?: number
  style?: ViewStyle | ViewStyle[]
  delayMs?: number
}

export default function AppearIn({
  children,
  index = 0,
  distance = 14,
  style,
  delayMs,
}: Props) {
  const delay = delayMs ?? staggerDelay(index)

  return (
    <Animated.View
      style={style}
      entering={FadeInDown.delay(delay).duration(duration.slow).springify().damping(18)}
    >
      {children}
    </Animated.View>
  )
}

// Pressable com resposta tatil: encolhe de leve e vibra ao toque.
//
// Drop-in do Pressable — repassa todas as props, entao trocar
// `<Pressable ...>` por `<PressableScale ...>` nao altera comportamento
// nenhum, so acrescenta o feedback.

import * as Haptics from 'expo-haptics'
import { type ComponentProps, useCallback } from 'react'
import { Platform, Pressable } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { PRESS_SCALE, spring } from '../../../src/theme/motion'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type Props = ComponentProps<typeof Pressable> & {
  /** Intensidade do encolhimento. Padrao 0.97. */
  scaleTo?: number
  /** Vibracao no toque. Padrao true (ignorado na web). */
  haptic?: boolean
  /** Peso da vibracao. */
  hapticStyle?: Haptics.ImpactFeedbackStyle
}

export default function PressableScale({
  scaleTo = PRESS_SCALE,
  haptic = true,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  onPressIn,
  onPressOut,
  style,
  disabled,
  ...rest
}: Props) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = useCallback(
    (event: any) => {
      if (!disabled) {
        scale.value = withSpring(scaleTo, spring.snappy)
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(hapticStyle).catch(() => {})
        }
      }
      onPressIn?.(event)
    },
    [disabled, hapticStyle, haptic, onPressIn, scale, scaleTo]
  )

  const handlePressOut = useCallback(
    (event: any) => {
      scale.value = withSpring(1, spring.snappy)
      onPressOut?.(event)
    },
    [onPressOut, scale]
  )

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style as any, animatedStyle]}
    />
  )
}

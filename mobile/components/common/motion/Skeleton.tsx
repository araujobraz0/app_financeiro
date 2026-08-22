// Placeholder de carregamento com brilho pulsante.

import { useEffect } from 'react'
import { type DimensionValue, StyleSheet, type ViewStyle } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import type { Tema } from '../../../app/types'
import { duration, easing } from '../../../src/theme/motion'

type Props = {
  theme: Tema
  width?: DimensionValue
  height?: number
  radius?: number
  style?: ViewStyle
}

export default function Skeleton({ theme, width = '100%', height = 16, radius = 10, style }: Props) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: duration.slower * 2, easing: easing.standard }),
      -1,
      true
    )
  }, [progress])

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [theme.skeleton, theme.skeletonHighlight]
    ),
  }))

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius }, animatedStyle, style]}
    />
  )
}

/** Bloco de varias linhas, para listas em carregamento. */
export function SkeletonList({ theme, rows = 3 }: { theme: Tema; rows?: number }) {
  return (
    <Animated.View style={listStyles.wrap}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} theme={theme} height={62} radius={18} />
      ))}
    </Animated.View>
  )
}

const listStyles = StyleSheet.create({
  wrap: { gap: 10, width: '100%' },
})

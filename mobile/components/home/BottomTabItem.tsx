// Item da barra inferior com pilula animada por tras do rotulo ativo.
//
// A barra e cortada ao meio pelo botao "+", entao um unico indicador
// deslizante atravessando as quatro abas nao teria por onde passar. Cada item
// anima a propria pilula — mesmo efeito, geometria correta.

import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import type { Tema } from '../../app/types'
import { duration, easing, spring } from '../../src/theme/motion'
import { styles as homeStyles } from '../../src/theme/homeStyles'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  label: string
  active: boolean
  theme: Tema
  onPress: () => void
}

export default function BottomTabItem({ label, active, theme, onPress }: Props) {
  const progress = useSharedValue(active ? 1 : 0)

  useEffect(() => {
    progress.value = active
      ? withSpring(1, spring.snappy)
      : withTiming(0, { duration: duration.fast, easing: easing.standard })
  }, [active, progress])

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.82 + progress.value * 0.18 }],
  }))

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [theme.muted, theme.primary]),
  }))

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={[homeStyles.bottomItem, localStyles.item]}
      accessibilityRole='tab'
      accessibilityState={{ selected: active }}
    >
      <Animated.View
        pointerEvents='none'
        style={[
          localStyles.pill,
          { backgroundColor: theme.accentSoft, borderColor: theme.primary },
          pillStyle,
        ]}
      />
      <Animated.Text style={[homeStyles.bottomItemText, textStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </PressableScale>
  )
}

const localStyles = StyleSheet.create({
  item: {
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
  },
})

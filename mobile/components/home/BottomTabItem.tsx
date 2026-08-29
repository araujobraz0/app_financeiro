// Item da barra inferior: icone, rotulo curto e pilula animada quando ativo.
//
// A barra e cortada ao meio pelo botao "+", entao um unico indicador
// deslizante atravessando as quatro abas nao teria por onde passar. Cada item
// anima a propria pilula — mesmo efeito, geometria correta.
//
// O rotulo e pequeno e sem caixa alta de proposito: em tela de 390px sobram
// cerca de 68px por aba, e "VARIAVEL" em maiusculas com espacamento passava
// disso e era cortado. O icone carrega o reconhecimento, o texto so confirma.

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
import Icon, { type IconName } from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  label: string
  icon: IconName
  active: boolean
  theme: Tema
  onPress: () => void
}

export default function BottomTabItem({ label, icon, active, theme, onPress }: Props) {
  const progress = useSharedValue(active ? 1 : 0)

  useEffect(() => {
    progress.value = active
      ? withSpring(1, spring.snappy)
      : withTiming(0, { duration: duration.fast, easing: easing.standard })
  }, [active, progress])

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.86 + progress.value * 0.14 }],
  }))

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [theme.muted, theme.primary]),
  }))

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.93}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.pill, { backgroundColor: theme.accentSoft }, pillStyle]}
      />
      <Icon name={icon} size={19} color={active ? theme.primary : theme.muted} />
      <Animated.Text style={[styles.label, textStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 7,
    paddingHorizontal: 2,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
    lineHeight: 13,
  },
})

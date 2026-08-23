// Cartao que acende quando a busca chega nele.
//
// A versao anterior desenhava um anel por cima do cartao. Como o cartao
// recorta o proprio conteudo, esse anel sobrava para dentro e passava por cima
// do texto — parecia um adesivo colado, nao o cartao em destaque.
//
// Aqui quem acende e a borda de verdade: a mesma linha que ja desenha o
// cartao muda de cor e ganha um halo, e volta ao normal sozinha. Nada e
// sobreposto, entao nao ha o que desalinhar.

import { forwardRef, useEffect } from 'react'
import { Platform, View, type ViewProps } from 'react-native'
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import type { Tema } from '../../../app/types'

type Props = ViewProps & {
  theme: Tema
  destacado: boolean
  /** Cor da borda em repouso — cada lista usa a sua. */
  corBorda: string
}

/** Componentes do hex, para montar a sombra com a opacidade animada. */
function separarRgb(cor: string) {
  const hex = cor.replace('#', '')
  const cheio = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const n = parseInt(cheio.slice(0, 6), 16)
  return Number.isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const CaixaDestacavel = forwardRef<View, Props>(function CaixaDestacavel(
  { theme, destacado, corBorda, style, children, ...rest },
  ref
) {
  const aceso = useSharedValue(0)

  useEffect(() => {
    if (!destacado) {
      aceso.value = withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) })
      return
    }

    // Acende devagar, respira algumas vezes e apaga devagar. O tempo de
    // subida e o que faz o destaque parecer que chegou junto com a rolagem em
    // vez de estourar na tela.
    aceso.value = withSequence(
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }),
      withRepeat(withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.sin) }), 4, true),
      withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
    )
  }, [destacado, aceso])

  // O halo tem caminhos diferentes: na web as quatro props de sombra viram um
  // box-shadow so na hora de montar o estilo, entao animar shadowOpacity nao
  // muda nada — la a sombra e escrita direto. No aparelho, as props animam.
  const [r, g, b] = separarRgb(theme.accent)

  const estilo = useAnimatedStyle(() => {
    const borda = interpolateColor(aceso.value, [0, 1], [corBorda, theme.accent])
    if (Platform.OS === 'web') {
      const raio = 6 + aceso.value * 12
      return {
        borderColor: borda,
        boxShadow: `0px 0px ${raio}px rgba(${r}, ${g}, ${b}, ${aceso.value * 0.38})`,
      }
    }
    return {
      borderColor: borda,
      shadowColor: theme.accent,
      shadowOpacity: aceso.value * 0.38,
      shadowRadius: 6 + aceso.value * 12,
      shadowOffset: { width: 0, height: 0 },
      elevation: aceso.value * 8,
    }
  })

  return (
    <Animated.View
      ref={ref}
      style={[style, estilo]}
      {...rest}
    >
      {children}
    </Animated.View>
  )
})

export default CaixaDestacavel

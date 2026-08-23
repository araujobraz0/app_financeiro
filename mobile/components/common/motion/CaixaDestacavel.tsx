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
import { View, type ViewProps } from 'react-native'
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

const CaixaDestacavel = forwardRef<View, Props>(function CaixaDestacavel(
  { theme, destacado, corBorda, style, children, ...rest },
  ref
) {
  const aceso = useSharedValue(0)

  useEffect(() => {
    if (!destacado) {
      aceso.value = withTiming(0, { duration: 280 })
      return
    }

    // Acende, respira algumas vezes e apaga: tempo de achar o item na tela
    // sem virar um pisca-pisca permanente.
    aceso.value = withSequence(
      withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }),
      withRepeat(withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.quad) }), 5, true),
      withTiming(0, { duration: 420 })
    )
  }, [destacado, aceso])

  const estilo = useAnimatedStyle(() => ({
    borderColor: interpolateColor(aceso.value, [0, 1], [corBorda, theme.accent]),
  }))

  return (
    <Animated.View
      ref={ref}
      style={[
        style,
        // O halo entra e sai com o booleano, nao pela animacao: na web o
        // box-shadow e montado a partir das quatro props de sombra juntas, e
        // animar so a opacidade deixava a sombra zerada — ela simplesmente
        // nao aparecia.
        destacado && {
          shadowColor: theme.accent,
          shadowOpacity: 0.4,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        },
        estilo,
      ]}
      {...rest}
    >
      {children}
    </Animated.View>
  )
})

export default CaixaDestacavel

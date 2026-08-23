// Anel de progresso.
//
// Uma barra reta comunica "quanto falta" pior que um anel quando o numero do
// meio importa tanto quanto a proporcao — o anel deixa o valor no centro e a
// fracao na borda, sem competir por espaco.

import { useEffect } from 'react'
import Svg, { Circle } from 'react-native-svg'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { duration, easing } from '../../src/theme/motion'

// O Circle do react-native-svg nao e animavel por padrao; isto o torna.
const CirculoAnimado = Animated.createAnimatedComponent(Circle)

type Props = {
  /** 0 a 1. */
  progresso: number
  tamanho?: number
  espessura?: number
  cor: string
  corFundo: string
  /** Texto grande no centro. */
  valor: string
  /** Texto pequeno abaixo do valor. */
  rotulo: string
  corValor: string
  corRotulo: string
  /** Tamanhos do texto central, para aneis menores que o padrao. */
  tamanhoValor?: number
  tamanhoRotulo?: number
}

export default function AnelProgresso({
  progresso,
  tamanho = 116,
  espessura = 11,
  cor,
  corFundo,
  valor,
  rotulo,
  corValor,
  corRotulo,
  tamanhoValor,
  tamanhoRotulo,
}: Props) {
  const raio = (tamanho - espessura) / 2
  const circunferencia = 2 * Math.PI * raio
  const preenchido = Math.min(1, Math.max(0, progresso))

  // O anel cresce ate a fracao atual em vez de aparecer pronto: ao marcar um
  // gasto como pago, da para ver o quanto aquilo mudou no total do mes.
  const animado = useSharedValue(0)

  useEffect(() => {
    animado.value = withTiming(preenchido, {
      duration: duration.slower,
      easing: easing.emphasized,
    })
  }, [animado, preenchido])

  const propsAnimadas = useAnimatedProps(() => ({
    strokeDashoffset: circunferencia * (1 - animado.value),
  }))

  return (
    <View style={{ width: tamanho, height: tamanho }}>
      <Svg width={tamanho} height={tamanho}>
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={corFundo}
          strokeWidth={espessura}
          fill="none"
        />
        <CirculoAnimado
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={cor}
          strokeWidth={espessura}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circunferencia} ${circunferencia}`}
          animatedProps={propsAnimadas}
          // Comeca no topo em vez de na direita.
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </Svg>

      <View style={styles.centro} pointerEvents="none">
        <Text
          style={[styles.valor, { color: corValor }, tamanhoValor ? { fontSize: tamanhoValor } : null]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {valor}
        </Text>
        {rotulo ? (
          <Text
            style={[styles.rotulo, { color: corRotulo }, tamanhoRotulo ? { fontSize: tamanhoRotulo } : null]}
            numberOfLines={1}
          >
            {rotulo}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  centro: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  valor: { fontSize: 22, fontWeight: '800', letterSpacing: -0.8 },
  rotulo: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
})

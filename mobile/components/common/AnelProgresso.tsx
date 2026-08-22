// Anel de progresso.
//
// Uma barra reta comunica "quanto falta" pior que um anel quando o numero do
// meio importa tanto quanto a proporcao — o anel deixa o valor no centro e a
// fracao na borda, sem competir por espaco.

import Svg, { Circle } from 'react-native-svg'
import { StyleSheet, Text, View } from 'react-native'

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
}: Props) {
  const raio = (tamanho - espessura) / 2
  const circunferencia = 2 * Math.PI * raio
  const preenchido = Math.min(1, Math.max(0, progresso))

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
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={cor}
          strokeWidth={espessura}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circunferencia} ${circunferencia}`}
          strokeDashoffset={circunferencia * (1 - preenchido)}
          // Comeca no topo em vez de na direita.
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </Svg>

      <View style={styles.centro} pointerEvents="none">
        <Text style={[styles.valor, { color: corValor }]} numberOfLines={1} adjustsFontSizeToFit>
          {valor}
        </Text>
        <Text style={[styles.rotulo, { color: corRotulo }]} numberOfLines={1}>
          {rotulo}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  centro: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  valor: { fontSize: 22, fontWeight: '800', letterSpacing: -0.8 },
  rotulo: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
})

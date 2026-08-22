// Seletor segmentado: alterna entre poucas opcoes mutuamente exclusivas.
//
// O indicador desliza ate a opcao escolhida em vez de piscar, o que deixa
// claro que as opcoes sao faces do mesmo controle, nao botoes soltos.

import { useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import type { Tema } from '../../app/types'
import { spring } from '../../src/theme/motion'
import Icon, { type IconName } from './Icon'
import PressableScale from './motion/PressableScale'

export type OpcaoSegmento<T extends string> = {
  valor: T
  label: string
  icone?: IconName
  /** Cor do indicador quando esta opcao esta ativa. Padrao: primary. */
  cor?: string
}

type Props<T extends string> = {
  theme: Tema
  opcoes: OpcaoSegmento<T>[]
  selecionado: T
  onSelecionar: (valor: T) => void
}

export default function Segmentado<T extends string>({
  theme,
  opcoes,
  selecionado,
  onSelecionar,
}: Props<T>) {
  const [largura, setLargura] = useState(0)
  const posicao = useSharedValue(0)

  const indice = Math.max(0, opcoes.findIndex((o) => o.valor === selecionado))
  const larguraItem = largura > 0 ? (largura - 8) / opcoes.length : 0

  const aoMedir = (evento: LayoutChangeEvent) => {
    const nova = evento.nativeEvent.layout.width
    setLargura(nova)
    posicao.value = ((nova - 8) / opcoes.length) * indice
  }

  const estiloIndicador = useAnimatedStyle(() => ({
    transform: [{ translateX: posicao.value }],
  }))

  const corAtiva = opcoes[indice]?.cor || theme.primary

  return (
    <View
      onLayout={aoMedir}
      style={[styles.trilha, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
    >
      {larguraItem > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicador,
            { width: larguraItem, backgroundColor: corAtiva },
            estiloIndicador,
          ]}
        />
      ) : null}

      {opcoes.map((opcao, i) => {
        const ativo = opcao.valor === selecionado
        return (
          <PressableScale
            key={opcao.valor}
            onPress={() => {
              posicao.value = withSpring(larguraItem * i, spring.snappy)
              onSelecionar(opcao.valor)
            }}
            scaleTo={0.97}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
          >
            {opcao.icone ? (
              <Icon
                name={opcao.icone}
                size={15}
                color={ativo ? theme.textInverse : theme.muted}
              />
            ) : null}
            <Text
              style={[styles.texto, { color: ativo ? theme.textInverse : theme.muted }]}
              numberOfLines={1}
            >
              {opcao.label}
            </Text>
          </PressableScale>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  trilha: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    position: 'relative',
  },
  indicador: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 6,
  },
  texto: { fontSize: 13, fontWeight: '800', letterSpacing: -0.1 },
})

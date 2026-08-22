// Barra de desfazer.
//
// Dois botoes no cabecalho resolvem "quero voltar", mas nao respondem a
// pergunta que vem logo depois de um toque errado: voltar o QUE. Esta barra
// aparece por alguns segundos com o nome da acao e o desfazer ao lado, que e
// como todo app moderno trata o arrependimento imediato.

import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import type { Tema } from '../../app/types'
import { spring } from '../../src/theme/motion'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

/** Quanto tempo a barra fica em pe antes de sumir sozinha. */
const DURACAO = 5000

type Props = {
  theme: Tema
  acao: { rotulo: string; id: number } | null
  podeDesfazer: boolean
  onDesfazer: () => void
  onDispensar: () => void
  /** Distancia do rodape, para nao cobrir a barra de abas. */
  margemInferior: number
}

export default function BarraDesfazer({
  theme,
  acao,
  podeDesfazer,
  onDesfazer,
  onDispensar,
  margemInferior,
}: Props) {
  const visivel = Boolean(acao && podeDesfazer)
  const progresso = useSharedValue(0)

  useEffect(() => {
    progresso.value = visivel ? withSpring(1, spring.snappy) : withTiming(0, { duration: 180 })
  }, [visivel, progresso])

  // Some sozinha: uma barra permanente viraria mais um elemento fixo na tela.
  useEffect(() => {
    if (!acao) return
    const relogio = setTimeout(onDispensar, DURACAO)
    return () => clearTimeout(relogio)
  }, [acao, onDispensar])

  const estilo = useAnimatedStyle(() => ({
    opacity: progresso.value,
    transform: [{ translateY: (1 - progresso.value) * 24 }, { scale: 0.96 + progresso.value * 0.04 }],
  }))

  if (!acao) return null

  return (
    <Animated.View
      pointerEvents={visivel ? 'auto' : 'none'}
      style={[styles.wrap, { bottom: margemInferior }, estilo]}
    >
      <View style={[styles.barra, { backgroundColor: theme.text, borderColor: theme.text }]}>
        <View style={[styles.marca, { backgroundColor: theme.accent }]}>
          <Icon name="confirmar" size={11} color={theme.textInverse} />
        </View>

        <Text style={[styles.rotulo, { color: theme.background }]} numberOfLines={2}>
          {acao.rotulo}
        </Text>

        <PressableScale
          onPress={() => {
            onDesfazer()
            onDispensar()
          }}
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel={`Desfazer: ${acao.rotulo}`}
          style={[styles.desfazer, { borderColor: theme.accent }]}
        >
          <Icon name="desfazer" size={13} color={theme.accent} />
          <Text style={[styles.desfazerTexto, { color: theme.accent }]}>Desfazer</Text>
        </PressableScale>

        <PressableScale
          onPress={onDispensar}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso"
          style={styles.fechar}
        >
          <Icon name="excluir" size={14} color={theme.background} />
        </PressableScale>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, zIndex: 40 },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 52,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  marca: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rotulo: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '700', letterSpacing: -0.2, lineHeight: 16 },
  desfazer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  desfazerTexto: { fontSize: 12, fontWeight: '800' },
  fechar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
})

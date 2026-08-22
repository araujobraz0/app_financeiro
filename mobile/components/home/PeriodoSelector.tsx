// Seletor de mes e ano.
//
// Antes eram dois botoes-dropdown grandes lado a lado, ocupando quase a mesma
// altura de um card de conteudo. Aqui vira uma barra unica com setas para o mes
// anterior e o proximo — que e o gesto mais frequente — e o rotulo central
// abrindo a escolha direta de mes e ano.

import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  theme: Tema
  mes: string
  ano: number
  onAbrirMes: () => void
  onAbrirAno: () => void
  onAnterior: () => void
  onProximo: () => void
  /** Volta para o mes corrente. Escondido quando ja se esta nele. */
  onHoje?: () => void
  ehMesAtual: boolean
}

function PeriodoSelector({
  theme,
  mes,
  ano,
  onAbrirMes,
  onAbrirAno,
  onAnterior,
  onProximo,
  onHoje,
  ehMesAtual,
}: Props) {
  return (
    <View style={[styles.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <PressableScale
        onPress={onAnterior}
        scaleTo={0.88}
        style={[styles.seta, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
        accessibilityLabel="Mês anterior"
      >
        <Icon name="seta_esquerda" size={17} color={theme.text} />
      </PressableScale>

      <View style={styles.centro}>
        <PressableScale onPress={onAbrirMes} scaleTo={0.97} style={styles.centroToque}>
          <Text style={[styles.mes, { color: theme.text }]} numberOfLines={1}>
            {mes}
          </Text>
          <Icon name="seta_baixo" size={14} color={theme.muted} />
        </PressableScale>

        <PressableScale onPress={onAbrirAno} scaleTo={0.95} style={styles.anoToque}>
          <Text style={[styles.ano, { color: theme.muted }]}>{ano}</Text>
        </PressableScale>
      </View>

      {!ehMesAtual && onHoje ? (
        <PressableScale
          onPress={onHoje}
          scaleTo={0.9}
          style={[styles.hoje, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
        >
          <Text style={[styles.hojeTexto, { color: theme.accent }]}>Hoje</Text>
        </PressableScale>
      ) : null}

      <PressableScale
        onPress={onProximo}
        scaleTo={0.88}
        style={[styles.seta, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
        accessibilityLabel="Próximo mês"
      >
        <Icon name="seta_direita" size={17} color={theme.text} />
      </PressableScale>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginBottom: 14,
  },
  seta: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: { flex: 1, minWidth: 0, alignItems: 'center' },
  centroToque: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  mes: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  anoToque: { marginTop: -1 },
  ano: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  hoje: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hojeTexto: { fontSize: 11, fontWeight: '800' },
})

export default memo(PeriodoSelector)

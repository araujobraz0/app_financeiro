// A faixa de premium, logo abaixo do cabecalho.
//
// O anel dourado no avatar era o unico sinal de que o plano estava ativo — e
// ninguem le um anel. Aqui a informacao aparece por extenso, com a data em que
// vence, e o brilho que atravessa a faixa de tempos em tempos e o que faz ela
// parecer o selo de um plano, e nao um aviso.
//
// Sem premium a mesma faixa fica quieta, em cinza, servindo de caminho para a
// tela de assinatura.

import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import type { Tema } from '../../app/types'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  theme: Tema
  ativo: boolean
  /** Quando o plano vence, em ISO. Null quando nao ha data. */
  expiraEm: string | null
  onPress: () => void
}

/** "até 12/09" — dia e mes bastam; o ano so polui. */
function ateQuando(iso: string | null) {
  if (!iso) return ''
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''
  return `até ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
}

/** Quantos dias faltam. Menos de 5 vira aviso, nao enfeite. */
function diasRestantes(iso: string | null) {
  if (!iso) return null
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return null
  return Math.ceil((data.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function FaixaPremium({ theme, ativo, expiraEm, onPress }: Props) {
  const brilho = useSharedValue(-1)

  useEffect(() => {
    if (!ativo) {
      brilho.value = -1
      return
    }
    // Uma passada, uma pausa longa: brilho continuo vira distracao.
    brilho.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withDelay(4200, withTiming(-1, { duration: 0 }))
      ),
      -1,
      false
    )
  }, [ativo, brilho])

  const estiloBrilho = useAnimatedStyle(() => ({
    opacity: brilho.value > -1 && brilho.value < 1.4 ? 0.5 : 0,
    transform: [{ translateX: `${brilho.value * 100}%` }, { rotate: '18deg' }],
  }))

  const dias = diasRestantes(expiraEm)
  const acabando = ativo && dias !== null && dias <= 5

  const fundo = ativo ? theme.accentSoft : theme.cardSoft
  const borda = ativo ? theme.accent : theme.border
  const cor = ativo ? theme.accent : theme.muted

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={ativo ? 'Premium ativo' : 'Ativar o premium'}
      style={[styles.faixa, { backgroundColor: fundo, borderColor: borda }]}
    >
      {ativo ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.brilho, { backgroundColor: theme.white }, estiloBrilho]}
        />
      ) : null}

      <View style={[styles.selo, { backgroundColor: ativo ? theme.accent : theme.border }]}>
        <Icon name="premium" size={11} color={ativo ? theme.textInverse : theme.muted} />
      </View>

      <Text style={[styles.texto, { color: cor }]} numberOfLines={1}>
        {ativo ? 'Premium ativo' : 'Ativar o premium'}
      </Text>

      {ativo && expiraEm ? (
        <Text
          style={[styles.detalhe, { color: acabando ? theme.red : cor }]}
          numberOfLines={1}
        >
          {acabando && dias !== null
            ? dias <= 0
              ? 'vence hoje'
              : `${dias} ${dias === 1 ? 'dia' : 'dias'}`
            : ateQuando(expiraEm)}
        </Text>
      ) : (
        <Text style={[styles.detalhe, { color: theme.faint }]} numberOfLines={1}>
          R$ 6,90/mês
        </Text>
      )}

      <Icon name="seta_direita" size={13} color={cor} />
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  brilho: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    left: 0,
    width: 46,
  },
  selo: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: '900', letterSpacing: -0.1 },
  detalhe: { fontSize: 11.5, fontWeight: '800' },
})

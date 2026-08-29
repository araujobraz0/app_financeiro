// O selo de premium, no alto do conteudo.
//
// O anel dourado no avatar era o unico sinal de que o plano estava ativo — e
// ninguem le um anel. Aqui a informacao aparece por extenso, com a data em que
// vence.
//
// E um selo pequeno, e nao uma faixa: fica junto do conteudo e sai de cena com
// a rolagem, em vez de ocupar o topo da tela o tempo todo. Sem premium ele
// continua ali, em cinza, servindo de caminho para a assinatura.

import { StyleSheet, Text, View } from 'react-native'

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
      <View style={[styles.selo, { backgroundColor: ativo ? theme.accent : theme.border }]}>
        <Icon name="premium" size={9} color={ativo ? theme.textInverse : theme.muted} />
      </View>

      <Text style={[styles.texto, { color: cor }]} numberOfLines={1}>
        {ativo ? 'Premium' : 'Ativar premium'}
      </Text>

      {ativo && expiraEm ? (
        <Text style={[styles.detalhe, { color: acabando ? theme.red : cor }]} numberOfLines={1}>
          {acabando && dias !== null
            ? dias <= 0
              ? '· vence hoje'
              : `· ${dias} ${dias === 1 ? 'dia' : 'dias'}`
            : `· ${ateQuando(expiraEm)}`}
        </Text>
      ) : null}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  faixa: {
    // A margem de baixo saiu daqui: quem posiciona e a linha que segura este
    // selo e o botao de instalar. Com ela, o selo subia 8px em relacao ao
    // botao ao lado e os dois ficavam tortos.
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 24,
    paddingLeft: 4,
    paddingRight: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  selo: {
    width: 17,
    height: 17,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.2, textTransform: 'uppercase' },
  detalhe: { fontSize: 10.5, fontWeight: '700' },
})

// Representacao visual de um cartao de credito.
//
// A aba antes listava cartoes como pilulas de texto, o que nao comunicava que
// aquilo eram cartoes. Aqui cada um vira um retangulo na proporcao de um
// cartao real (85.6 x 53.98mm), com chip, numero mascarado e cor propria.

import { StyleSheet, Text, View } from 'react-native'

import type { CardItem, Tema } from '../../app/types'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

/**
 * Paleta dos cartoes. Cada cartao recebe uma cor estavel derivada do proprio
 * id, para que o usuario reconheca "o roxo" e "o azul" sem ler o nome.
 */
const CORES_CARTAO = [
  { base: '#1B5E3F', luz: '#2E8A5C' },
  { base: '#2B4A73', luz: '#3E6A9E' },
  { base: '#6B3F7A', luz: '#8E5AA0' },
  { base: '#8A5A22', luz: '#B37C33' },
  { base: '#7A3340', luz: '#A34B5A' },
  { base: '#2F6B6B', luz: '#3F8F8F' },
]

function corDoCartao(id: string) {
  let soma = 0
  for (let i = 0; i < id.length; i += 1) soma += id.charCodeAt(i)
  return CORES_CARTAO[soma % CORES_CARTAO.length]
}

type Props = {
  card: CardItem
  theme: Tema
  ativo: boolean
  limiteTexto: string
  onPress: () => void
}

export default function CartaoVisual({ card, theme, ativo, limiteTexto, onPress }: Props) {
  const cor = corDoCartao(card.id)

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.96}
      style={[
        styles.wrap,
        { backgroundColor: cor.base },
        ativo ? { borderColor: theme.accent, borderWidth: 2 } : { borderColor: 'transparent', borderWidth: 2 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
    >
      {/* Brilho diagonal: da profundidade sem depender de biblioteca de gradiente. */}
      <View style={[styles.brilho, { backgroundColor: cor.luz }]} pointerEvents="none" />

      <View style={styles.topo}>
        <View style={styles.chip} />
        <Icon name="cartao" size={20} color="rgba(255,255,255,0.75)" />
      </View>

      <Text style={styles.numero}>•••• •••• •••• ••••</Text>

      <View style={styles.rodape}>
        <View style={styles.rodapeInfo}>
          <Text style={styles.rotulo}>CARTÃO</Text>
          <Text style={styles.nome} numberOfLines={1}>{card.nome}</Text>
        </View>
        <View style={styles.rodapeValor}>
          <Text style={styles.rotulo}>LIMITE</Text>
          <Text style={styles.valor} numberOfLines={1}>{limiteTexto}</Text>
        </View>
      </View>
    </PressableScale>
  )
}

const LARGURA = 250

const styles = StyleSheet.create({
  wrap: {
    width: LARGURA,
    height: Math.round(LARGURA / 1.586),
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  brilho: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 999,
    opacity: 0.5,
  },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    width: 30,
    height: 22,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  numero: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  rodape: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  rodapeInfo: { flex: 1, minWidth: 0 },
  rodapeValor: { alignItems: 'flex-end', maxWidth: '52%' },
  rotulo: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  nome: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  valor: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
})

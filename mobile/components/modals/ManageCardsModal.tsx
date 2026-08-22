import { StyleSheet, Text, View } from 'react-native'
import type { CardItem, Tema } from '../../app/types'
import { formatarMoeda } from '../../src/utils/currency'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

type ManageCardsModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  cards: CardItem[]
  onEdit: (card: CardItem) => void
  onDelete: (card: CardItem) => void
}

/** Formata "fecha dia X · vence dia Y" a partir dos campos do cartao. */
function datasDe(card: CardItem) {
  const partes: string[] = []
  if (card.fechamento) partes.push(`fecha ${card.fechamento}`)
  if (card.vencimento) partes.push(`vence ${card.vencimento}`)
  return partes.length > 0 ? partes.join(' · ') : 'Datas não definidas'
}

export default function ManageCardsModal({
  visible,
  onClose,
  theme,
  cards,
  onEdit,
  onDelete,
}: ManageCardsModalProps) {
  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Meus cartões"
      subtitulo={
        cards.length === 0
          ? 'Nenhum cartão cadastrado.'
          : `${cards.length} ${cards.length === 1 ? 'cartão' : 'cartões'}. Toque para editar limite e datas.`
      }
      acoes={[{ label: 'Concluir', onPress: onClose, primaria: true }]}
    >
      <View style={styles.lista}>
        {cards.map((card) => (
          <View
            key={card.id}
            style={[styles.linha, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          >
            <View style={[styles.icone, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Icon name="cartao" size={17} color={theme.muted} />
            </View>

            <View style={styles.textos}>
              <Text style={[styles.nome, { color: theme.text }]} numberOfLines={1}>
                {card.nome}
              </Text>
              <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
                {card.limite ? `${formatarMoeda(card.limite)} · ` : ''}
                {datasDe(card)}
              </Text>
            </View>

            <View style={styles.acoes}>
              <PressableScale
                onPress={() => onEdit(card)}
                style={[styles.botao, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Icon name="editar" size={14} color={theme.muted} />
              </PressableScale>
              <PressableScale
                onPress={() => onDelete(card)}
                style={[styles.botao, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Icon name="excluir" size={16} color={theme.red} />
              </PressableScale>
            </View>
          </View>
        ))}
      </View>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  lista: { gap: 8 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  icone: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0 },
  nome: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  meta: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  acoes: { flexDirection: 'row', gap: 7 },
  botao: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

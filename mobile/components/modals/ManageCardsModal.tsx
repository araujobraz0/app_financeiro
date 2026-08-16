import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { CardItem, Tema } from '../../app/types'
import AppModal from '../common/AppModal'

type ManageCardsModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  cards: CardItem[]
  onEdit: (card: CardItem) => void
  onDelete: (card: CardItem) => void
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
    <AppModal visible={visible} onClose={onClose}>
      <View style={[styles.modalCard, styles.modalCardManageCards, styles.modalCardScrollHint, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>Gerenciar cartões</Text>
        <Text style={[styles.modalHintText, { color: theme.muted }]}>Edite ou exclua um cartão ↓</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingBottom: 8, marginTop: 6 }}>
          {cards.map((card) => (
            <View key={card.id} style={[styles.categoryManageRow, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
              <Text style={[styles.categoryManageText, { color: theme.text }]} numberOfLines={1}>{card.nome}</Text>
              <View style={styles.categoryManageActions}>
                <Pressable onPress={() => onEdit(card)} style={[styles.manageMiniBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.manageMiniBtnText, { color: theme.text }]}>✎</Text>
                </Pressable>
                <Pressable onPress={() => onDelete(card)} style={[styles.manageMiniBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.manageMiniBtnText, { color: theme.red }]}>×</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={[styles.modalActions, styles.modalActionsLower]}>
          <Pressable onPress={onClose} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.modalActionText, { color: theme.white }]}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  modalCard: {
    width: '84%',
    maxWidth: 420,
    maxHeight: '94%',
    alignSelf: 'center',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  modalCardManageCards: { paddingBottom: 24, minHeight: 360 },
  modalCardScrollHint: { paddingBottom: 30 },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  modalHintText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  categoryScroll: { maxHeight: 340 },
  categoryManageRow: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryManageText: { fontSize: 14, fontWeight: '800', flex: 1, marginRight: 10 },
  categoryManageActions: { flexDirection: 'row', gap: 8 },
  manageMiniBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  manageMiniBtnText: { fontSize: 14, fontWeight: '900' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, width: '100%' },
  modalActionsLower: { marginTop: 16 },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
})

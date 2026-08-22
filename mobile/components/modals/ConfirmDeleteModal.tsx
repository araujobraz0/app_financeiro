import { StyleSheet, Text, View } from 'react-native'
import type { Tema } from '../../app/types'
import AppModal from '../common/AppModal'
import PressableScale from '../common/motion/PressableScale'

type ConfirmDeleteModalProps = {
  visible: boolean
  label?: string
  onClose: () => void
  onConfirm: () => void
  theme: Tema
}

export default function ConfirmDeleteModal({
  visible,
  label,
  onClose,
  onConfirm,
  theme,
}: ConfirmDeleteModalProps) {
  return (
    <AppModal visible={visible} onClose={onClose}>
      <View style={[styles.modalCard, styles.modalCardNewCategory, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>Confirmar exclusão</Text>
        <Text style={[styles.emptyChartText, { color: theme.muted, marginBottom: 16 }]}>
          Tem certeza que deseja excluir {label ? `"${label}"` : 'este item'}?
        </Text>
        <View style={styles.modalActions}>
          <PressableScale onPress={onClose} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
          </PressableScale>
          <PressableScale onPress={onConfirm} style={[styles.modalActionBtn, { backgroundColor: '#dc2626' }]}>
            <Text style={[styles.modalActionText, { color: theme.white }]}>Excluir</Text>
          </PressableScale>
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
  modalCardNewCategory: { paddingBottom: 20, minHeight: 204 },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  emptyChartText: { fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 19 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, width: '100%' },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
})

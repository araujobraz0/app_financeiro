import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { ModoCategoria, Tema } from '../../app/types'
import AppModal from '../common/AppModal'
import PressableScale from '../common/motion/PressableScale'

type CategoryNameModalProps = {
  visible: boolean
  onClose: () => void
  mode: ModoCategoria
  initialValue: string
  onSave: (value: string) => void
  theme: Tema
}

export default function CategoryNameModal({
  visible,
  onClose,
  mode,
  initialValue,
  onSave,
  theme,
}: CategoryNameModalProps) {
  // O campo e do modal: digitar aqui nao re-renderiza a tela inteira.
  const [value, setValue] = useState(initialValue)

  const handleSave = () => {
    onSave(value)
  }

  return (
    <AppModal visible={visible} onClose={onClose}>
      <View style={[styles.modalCard, styles.modalCardNewCategory, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          {mode === 'nova' ? 'Nova categoria' : 'Renomear categoria'}
        </Text>
        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder='Digite o nome'
            placeholderTextColor={theme.muted}
            style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
          />
        </View>
        <View style={styles.modalActions}>
          <PressableScale onPress={onClose} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
          </PressableScale>
          <PressableScale onPress={handleSave} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text>
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
  modalField: { marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: '800', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, width: '100%' },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
})

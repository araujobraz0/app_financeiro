import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { Tema } from '../../app/types'
import { handleMaskedMoneyInput } from '../../src/utils/currency'
import AppModal from '../common/AppModal'
import PressableScale from '../common/motion/PressableScale'

/**
 * Campos de texto do cartao. O modal e dono deles.
 *
 * As datas de fechamento e vencimento continuam vindo por prop: quem as
 * define e o modal de calendario, que vive na tela. Mesmo padrao usado no
 * ShoppingWishModal e no LaunchModal.
 */
export type CardEditorFormValues = {
  name: string
  limit: string
}

export const emptyCardEditorValues = (): CardEditorFormValues => ({
  name: '',
  limit: 'R$ 0,00',
})

type CardEditorModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  editing: boolean
  initialValues: CardEditorFormValues
  closing: string
  onClosingChange: (value: string) => void
  due: string
  onDueChange: (value: string) => void
  onOpenClosingCalendar: () => void
  onOpenDueCalendar: () => void
  onSave: (values: CardEditorFormValues) => void
}

const formatarInputDiaMes = (rawValue: string) => {
  const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export default function CardEditorModal({
  visible,
  onClose,
  theme,
  editing,
  initialValues,
  closing,
  onClosingChange,
  due,
  onDueChange,
  onOpenClosingCalendar,
  onOpenDueCalendar,
  onSave,
}: CardEditorModalProps) {
  const [name, setName] = useState(initialValues.name)
  const [limit, setLimit] = useState(initialValues.limit)

  const handleSave = () => {
    onSave({ name, limit })
  }

  return (
    <AppModal visible={visible} onClose={onClose}>
      <View style={[styles.modalCard, styles.modalCardNewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Editar cartão' : 'Novo cartão'}</Text>

        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome do cartão</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder='Ex.: Nubank, Inter...'
            placeholderTextColor={theme.muted}
            style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
          />
        </View>

        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: theme.muted }]}>Limite</Text>
          <TextInput
            value={limit}
            onChangeText={(rawValue) => handleMaskedMoneyInput(rawValue, setLimit)}
            placeholder='R$ 0,00'
            placeholderTextColor={theme.muted}
            keyboardType='number-pad'
            inputMode='numeric'
            style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
          />
        </View>

        <View style={styles.dualFieldRow}>
          <View style={[styles.modalField, styles.dualFieldItem]}>
            <Text style={[styles.modalLabel, { color: theme.muted }]}>Fechamento (dia/mês)</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                value={closing}
                onChangeText={(rawValue) => onClosingChange(formatarInputDiaMes(rawValue))}
                placeholder='DD/MM'
                placeholderTextColor={theme.muted}
                keyboardType='number-pad'
                inputMode='numeric'
                style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
              />
              <PressableScale onPress={onOpenClosingCalendar} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text>
              </PressableScale>
            </View>
          </View>
          <View style={[styles.modalField, styles.dualFieldItem]}>
            <Text style={[styles.modalLabel, { color: theme.muted }]}>Vencimento (dia/mês)</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                value={due}
                onChangeText={(rawValue) => onDueChange(formatarInputDiaMes(rawValue))}
                placeholder='DD/MM'
                placeholderTextColor={theme.muted}
                keyboardType='number-pad'
                inputMode='numeric'
                style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
              />
              <PressableScale onPress={onOpenDueCalendar} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text>
              </PressableScale>
            </View>
          </View>
        </View>

        <View style={styles.modalActions}>
          <PressableScale onPress={onClose} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
          </PressableScale>
          <PressableScale onPress={handleSave} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.modalActionText, { color: theme.white }]}>{editing ? 'Salvar' : 'Adicionar'}</Text>
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
  modalCardNewCard: { paddingBottom: 30, minHeight: 225 },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  modalField: { marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: '800', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontWeight: '700' },
  dualFieldRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dualFieldItem: { flex: 1 },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateInputField: { flex: 1, minWidth: 0 },
  calendarBtn: { width: 42, minHeight: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calendarBtnText: { fontSize: 18 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, width: '100%' },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
})

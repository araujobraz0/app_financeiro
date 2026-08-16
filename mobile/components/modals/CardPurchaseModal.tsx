import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { CardItem, Tema } from '../../app/types'
import { handleMaskedMoneyInput } from '../../src/utils/currency'
import AppModal from '../common/AppModal'

type CardPurchaseModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  editingInstallment: boolean
  cards: CardItem[]
  selectedCardId: string | null
  onSelectedCardIdChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  totalValue: string
  onTotalValueChange: (value: string) => void
  totalInstallments: string
  onTotalInstallmentsChange: (value: string) => void
  day: string
  onDayChange: (value: string) => void
  onOpenDayCalendar: () => void
  onSave: () => void
}

export default function CardPurchaseModal({
  visible,
  onClose,
  theme,
  editingInstallment,
  cards,
  selectedCardId,
  onSelectedCardIdChange,
  description,
  onDescriptionChange,
  totalValue,
  onTotalValueChange,
  totalInstallments,
  onTotalInstallmentsChange,
  day,
  onDayChange,
  onOpenDayCalendar,
  onSave,
}: CardPurchaseModalProps) {
  return (
    <AppModal visible={visible} onClose={onClose}>
      <View style={[styles.modalCard, styles.modalCardCartaoCompra, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          {editingInstallment ? 'Editar parcela' : 'Nova compra parcelada'}
        </Text>

        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: theme.muted }]}>CARTÃO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {cards.map((card) => (
              <Pressable
                key={card.id}
                onPress={() => onSelectedCardIdChange(card.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: selectedCardId === card.id ? theme.primary : theme.cardSoft,
                    borderColor: selectedCardId === card.id ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.filterPillText, { color: selectedCardId === card.id ? theme.white : theme.text }]}>
                  {card.nome}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: theme.muted }]}>Descrição</Text>
          <TextInput
            value={description}
            onChangeText={onDescriptionChange}
            placeholder='Ex.: tênis, curso...'
            placeholderTextColor={theme.muted}
            style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
          />
        </View>

        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: theme.muted }]}>Valor total da compra</Text>
          <TextInput
            value={totalValue}
            onChangeText={(rawValue) => handleMaskedMoneyInput(rawValue, onTotalValueChange)}
            keyboardType='number-pad'
            inputMode='numeric'
            placeholder='R$ 0,00'
            placeholderTextColor={theme.muted}
            style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
          />
        </View>

        <View style={[styles.modalField, styles.totalParcelasField, styles.totalParcelasFieldWide]}>
          <Text style={[styles.modalLabel, styles.dualFieldLabel, { color: theme.muted }]}>Total de parcelas</Text>
          <TextInput
            value={totalInstallments}
            onChangeText={onTotalInstallmentsChange}
            keyboardType='number-pad'
            inputMode='numeric'
            placeholder='Exemplo: 1'
            placeholderTextColor={theme.muted}
            style={[
              styles.modalInput,
              styles.totalParcelasInput,
              styles.totalParcelasInputWide,
              { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text },
            ]}
          />
        </View>

        {editingInstallment ? (
          <View style={styles.modalField}>
            <Text style={[styles.modalLabel, { color: theme.muted }]}>Dia</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                value={day}
                onChangeText={onDayChange}
                keyboardType='number-pad'
                inputMode='numeric'
                placeholder='1'
                placeholderTextColor={theme.muted}
                style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
              />
              <Pressable onPress={onOpenDayCalendar} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.modalActions}>
          <Pressable onPress={onClose} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={onSave} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text>
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
  modalCardCartaoCompra: { paddingBottom: 36, minHeight: 430 },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  modalField: { marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: '800', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontWeight: '700' },
  filterRow: { gap: 8, paddingRight: 10 },
  filterPill: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  filterPillText: { fontSize: 12, fontWeight: '800' },
  totalParcelasField: { alignItems: 'center' },
  totalParcelasFieldWide: { alignItems: 'stretch' },
  dualFieldLabel: { textAlign: 'center' },
  totalParcelasInput: { width: '48%', minWidth: 120, textAlign: 'center' },
  totalParcelasInputWide: { width: '100%', minWidth: 0 },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateInputField: { flex: 1, minWidth: 0 },
  calendarBtn: { width: 42, minHeight: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calendarBtnText: { fontSize: 18 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, width: '100%' },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
})

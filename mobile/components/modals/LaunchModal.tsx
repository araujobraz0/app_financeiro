import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { CardItem, ModoModal, QuickAddType, Tema, TipoFormularioLancamento } from '../../app/types'
import { handleMaskedMoneyInput } from '../../src/utils/currency'
import AppModal from '../common/AppModal'

type LaunchModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  formType: TipoFormularioLancamento
  mode: ModoModal
  keyboardOpen: boolean
  title: string
  isOutputForm: boolean
  isInputForm: boolean
  cards: CardItem[]
  selectedCardId: string | null
  onSelectedCardIdChange: (value: string) => void
  installmentDescription: string
  onInstallmentDescriptionChange: (value: string) => void
  installmentValue: string
  onInstallmentValueChange: (value: string) => void
  installmentTotal: string
  onInstallmentTotalChange: (value: string) => void
  name: string
  onNameChange: (value: string) => void
  categories: string[]
  selectedCategory: string
  onSelectedCategoryChange: (value: string) => void
  value: string
  onValueChange: (value: string) => void
  day: string
  onDayChange: (value: string) => void
  onOpenDayCalendar: () => void
  onTypeChange: (type: QuickAddType) => void
  onSave: () => void
}

export default function LaunchModal({
  visible,
  onClose,
  theme,
  formType,
  mode,
  keyboardOpen,
  title,
  isOutputForm,
  isInputForm,
  cards,
  selectedCardId,
  onSelectedCardIdChange,
  installmentDescription,
  onInstallmentDescriptionChange,
  installmentValue,
  onInstallmentValueChange,
  installmentTotal,
  onInstallmentTotalChange,
  name,
  onNameChange,
  categories,
  selectedCategory,
  onSelectedCategoryChange,
  value,
  onValueChange,
  day,
  onDayChange,
  onOpenDayCalendar,
  onTypeChange,
  onSave,
}: LaunchModalProps) {
  const usesScrollableBody = formType === 'parcela' || isOutputForm || isInputForm

  const cardStyle = [
    styles.modalCard,
    usesScrollableBody && styles.modalCardWithFixedFooter,
    mode === 'editar'
      ? formType === 'saida'
        ? styles.modalCardEditSaida
        : formType === 'fixo'
          ? styles.modalCardEditFixo
          : styles.modalCardEditEntrada
      : formType === 'saida'
        ? keyboardOpen
          ? styles.modalCardLancamentoSaidaKeyboard
          : styles.modalCardLancamentoSaida
        : formType === 'parcela'
          ? keyboardOpen
            ? styles.modalCardLancamentoParcelaKeyboard
            : styles.modalCardLancamentoParcela
          : keyboardOpen
            ? styles.modalCardLancamentoSaidaKeyboard
            : styles.modalCardLancamentoEntrada,
    { backgroundColor: theme.card, borderColor: theme.border },
  ]

  const typeSelector = mode === 'novo' ? (
    <View style={styles.switchRowThree}>
      {([
        ['entrada', 'Entrada'],
        ['saida', 'Saída'],
        ['fixo', 'Fixo'],
        ['parcela', 'Parcela'],
      ] as [QuickAddType, string][]).map(([type, label]) => (
        <Pressable
          key={type}
          onPress={() => onTypeChange(type)}
          style={[
            styles.switchBtnThree,
            {
              backgroundColor: formType === type ? theme.primary : theme.cardSoft,
              borderColor: formType === type ? theme.primary : theme.border,
            },
          ]}
        >
          <Text style={[styles.switchBtnText, { color: formType === type ? theme.white : theme.text }]}> 
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  ) : null

  const dayField = (label: string) => (
    <View style={styles.modalField}>
      <Text style={[styles.modalLabel, { color: theme.muted }]}>{label}</Text>
      <View style={styles.dateInputRow}>
        <TextInput
          value={day}
          onChangeText={onDayChange}
          keyboardType='number-pad'
          inputMode='numeric'
          placeholder='1'
          placeholderTextColor={theme.muted}
          style={[
            styles.modalInput,
            styles.dateInputField,
            { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text },
          ]}
        />
        <Pressable
          onPress={onOpenDayCalendar}
          style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
        >
          <Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text>
        </Pressable>
      </View>
    </View>
  )

  const commonFields = (
    <>
      <View style={styles.modalField}>
        <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={onNameChange}
          placeholder='Digite o nome'
          placeholderTextColor={theme.muted}
          style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
        />
      </View>

      {formType === 'saida' ? (
        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: theme.muted }]}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {categories.map((category) => (
              <Pressable
                key={category}
                onPress={() => onSelectedCategoryChange(category)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: selectedCategory === category ? theme.primary : theme.cardSoft,
                    borderColor: selectedCategory === category ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.filterPillText, { color: selectedCategory === category ? theme.white : theme.text }]}> 
                  {category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.modalField}>
        <Text style={[styles.modalLabel, { color: theme.muted }]}>Valor</Text>
        <TextInput
          value={value}
          onChangeText={(rawValue) => handleMaskedMoneyInput(rawValue, onValueChange)}
          placeholder='R$ 0,00'
          placeholderTextColor={theme.muted}
          keyboardType='number-pad'
          inputMode='numeric'
          style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
        />
      </View>
    </>
  )

  const installmentFields = (
    <>
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
          value={installmentDescription}
          onChangeText={onInstallmentDescriptionChange}
          placeholder='Ex.: tênis, curso...'
          placeholderTextColor={theme.muted}
          style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
        />
      </View>

      <View style={styles.modalField}>
        <Text style={[styles.modalLabel, { color: theme.muted }]}>Valor total da compra</Text>
        <TextInput
          value={installmentValue}
          onChangeText={(rawValue) => handleMaskedMoneyInput(rawValue, onInstallmentValueChange)}
          placeholder='R$ 0,00'
          placeholderTextColor={theme.muted}
          keyboardType='number-pad'
          inputMode='numeric'
          style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
        />
      </View>

      <View style={[styles.modalField, styles.totalParcelasField, styles.totalParcelasFieldWide]}>
        <Text style={[styles.modalLabel, styles.dualFieldLabel, { color: theme.muted }]}>Total de parcelas</Text>
        <TextInput
          value={installmentTotal}
          onChangeText={onInstallmentTotalChange}
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

      {dayField('Dia da compra')}
    </>
  )

  const actions = (
    <View style={styles.modalActions}>
      <Pressable
        onPress={onClose}
        style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
      >
        <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
      </Pressable>
      <Pressable onPress={onSave} style={[styles.modalActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}> 
        <Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text>
      </Pressable>
    </View>
  )

  return (
    <AppModal visible={visible} onClose={onClose}>
      <View style={cardStyle}>
        {usesScrollableBody ? (
          <View style={styles.modalContentFill}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={[styles.modalScrollContent, styles.modalScrollContentWithFooter]}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps='always'
              nestedScrollEnabled
              scrollEnabled
            >
              <View style={styles.modalContentWrap}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
                {typeSelector}
                {formType === 'parcela' ? installmentFields : <>{commonFields}{dayField('Dia')}</>}
              </View>
            </ScrollView>
            <View style={[styles.modalActionsSticky, { borderTopColor: theme.border, backgroundColor: theme.card }]}> 
              {actions}
            </View>
          </View>
        ) : (
          <View style={styles.modalContentWrap}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
            {typeSelector}
            {commonFields}
            {mode === 'editar' ? dayField('Dia') : null}
            {actions}
          </View>
        )}
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
  modalCardLancamentoEntrada: { paddingBottom: 0, minHeight: 378, maxHeight: '86%' },
  modalCardEditEntrada: { paddingBottom: 0, minHeight: 330, maxHeight: '86%' },
  modalCardEditFixo: { paddingBottom: 35, minHeight: 330 },
  modalCardEditSaida: { paddingBottom: 0, minHeight: 440, maxHeight: '86%' },
  modalCardLancamentoSaida: { paddingBottom: 0, minHeight: 470, maxHeight: '86%' },
  modalCardLancamentoSaidaKeyboard: { paddingBottom: 0, minHeight: 336, maxHeight: '68%' },
  modalCardLancamentoParcela: { paddingBottom: 0, minHeight: 500, maxHeight: '86%' },
  modalCardLancamentoParcelaKeyboard: { paddingBottom: 0, minHeight: 336, maxHeight: '68%' },
  modalCardWithFixedFooter: { overflow: 'hidden' },
  modalContentFill: { flex: 1 },
  modalScroll: { width: '100%' },
  modalScrollContent: { paddingBottom: 4, flexGrow: 1 },
  modalScrollContentWithFooter: { paddingBottom: 26 },
  modalContentWrap: { width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  switchRowThree: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  switchBtnThree: { width: '48%', minHeight: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  switchBtnText: { fontSize: 13, fontWeight: '900' },
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
  modalActionsSticky: { borderTopWidth: 1, paddingTop: 1, paddingHorizontal: 2, paddingBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, width: '100%' },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
})

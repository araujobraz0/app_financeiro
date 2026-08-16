import { useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { Tema } from '../../app/types'
import { handleMaskedMoneyInput } from '../../src/utils/currency'
import { formatarInputDiaMes } from '../../src/utils/dates'
import AppModal from '../common/AppModal'

/**
 * Campos do item da lista de compras desejadas. O modal e dono deles.
 *
 * A data fica de fora: ela e compartilhada com o modal de calendario, que
 * vive no HomeScreen, entao continua vindo por prop.
 */
export type ShoppingWishFormValues = {
  nome: string
  preco: string
  loja: string
  observacao: string
}

export const emptyShoppingWishValues = (): ShoppingWishFormValues => ({
  nome: '',
  preco: 'R$ 0,00',
  loja: '',
  observacao: '',
})

type ShoppingWishModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  editing: boolean
  initialValues: ShoppingWishFormValues
  data: string
  onDataChange: (value: string) => void
  onOpenCalendar: () => void
  onSave: (values: ShoppingWishFormValues) => void
}

export default function ShoppingWishModal({
  visible,
  onClose,
  theme,
  editing,
  initialValues,
  data,
  onDataChange,
  onOpenCalendar,
  onSave,
}: ShoppingWishModalProps) {
  const [nome, setNome] = useState(initialValues.nome)
  const [preco, setPreco] = useState(initialValues.preco)
  const [loja, setLoja] = useState(initialValues.loja)
  const [observacao, setObservacao] = useState(initialValues.observacao)

  // Rolagem automatica ate o campo focado: e um detalhe visual do proprio
  // modal, entao mora aqui em vez de no HomeScreen.
  const scrollRef = useRef<ScrollView | null>(null)
  const fieldLayoutsRef = useRef<Record<string, number>>({})

  const registrarFieldLayout = (field: string, y: number) => {
    fieldLayoutsRef.current[field] = y
  }

  const scrollToField = (field: string) => {
    const targetY = fieldLayoutsRef.current[field]
    if (typeof targetY !== 'number') return
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(targetY - 26, 0), animated: true })
    }, 160)
  }

  const handleSave = () => {
    onSave({ nome, preco, loja, observacao })
  }

  return (
    <AppModal visible={visible} onClose={onClose}>
      <View style={[styles.modalCard, styles.modalCardNotesFixedFooter, styles.modalCardWithFixedFooter, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.modalContentFill}>
          <ScrollView
            ref={scrollRef}
            style={styles.modalScroll}
            contentContainerStyle={[styles.modalScrollContent, styles.modalScrollContentWithFooter]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps='always'
            nestedScrollEnabled
            scrollEnabled
          >
            <View style={styles.modalContentWrap}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Editar item' : 'Novo item para comprar'}</Text>

              <View style={styles.modalField} onLayout={(event) => registrarFieldLayout('nome', event.nativeEvent.layout.y)}>
                <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome do item</Text>
                <TextInput
                  value={nome}
                  onChangeText={setNome}
                  onFocus={() => scrollToField('nome')}
                  placeholder='Ex.: Fone, tênis, mochila...'
                  placeholderTextColor={theme.muted}
                  style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                />
              </View>

              <View style={styles.modalField} onLayout={(event) => registrarFieldLayout('preco', event.nativeEvent.layout.y)}>
                <Text style={[styles.modalLabel, { color: theme.muted }]}>Preço encontrado</Text>
                <TextInput
                  value={preco}
                  onChangeText={(value) => handleMaskedMoneyInput(value, setPreco)}
                  onFocus={() => scrollToField('preco')}
                  placeholder='R$ 0,00'
                  placeholderTextColor={theme.muted}
                  keyboardType='number-pad'
                  inputMode='numeric'
                  style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                />
              </View>

              <View style={styles.modalField} onLayout={(event) => registrarFieldLayout('loja', event.nativeEvent.layout.y)}>
                <Text style={[styles.modalLabel, { color: theme.muted }]}>Loja</Text>
                <TextInput
                  value={loja}
                  onChangeText={setLoja}
                  onFocus={() => scrollToField('loja')}
                  placeholder='Onde você encontrou'
                  placeholderTextColor={theme.muted}
                  style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                />
              </View>

              <View style={styles.modalField} onLayout={(event) => registrarFieldLayout('data', event.nativeEvent.layout.y)}>
                <Text style={[styles.modalLabel, { color: theme.muted }]}>Data que viu</Text>
                <View style={styles.dateInputRow}>
                  <TextInput
                    value={data}
                    onChangeText={(value) => onDataChange(formatarInputDiaMes(value))}
                    onFocus={() => scrollToField('data')}
                    keyboardType='number-pad'
                    inputMode='numeric'
                    placeholder='dd/mm'
                    placeholderTextColor={theme.muted}
                    style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                  />
                  <Pressable onPress={onOpenCalendar} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                    <Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.modalField} onLayout={(event) => registrarFieldLayout('obs', event.nativeEvent.layout.y)}>
                <Text style={[styles.modalLabel, { color: theme.muted }]}>Observação</Text>
                <TextInput
                  value={observacao}
                  onChangeText={setObservacao}
                  onFocus={() => scrollToField('obs')}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical='top'
                  placeholder='Cor, modelo, condição, prioridade...'
                  placeholderTextColor={theme.muted}
                  style={[styles.modalInput, styles.modalInputMultilineSmall, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.modalActionsSticky, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.modalActions}>
              <Pressable onPress={onClose} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
                <Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text>
              </Pressable>
            </View>
          </View>
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
  modalCardNotesFixedFooter: { width: '88%', maxWidth: 440, minHeight: 430, maxHeight: '86%', paddingBottom: 0 },
  modalCardWithFixedFooter: { overflow: 'hidden' },
  modalContentFill: { flex: 1 },
  modalScroll: { width: '100%' },
  modalScrollContent: { paddingBottom: 4, flexGrow: 1 },
  modalScrollContentWithFooter: { paddingBottom: 26 },
  modalContentWrap: { width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  modalField: { marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: '800', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontWeight: '700' },
  modalInputMultilineSmall: { minHeight: 96, maxHeight: 118, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateInputField: { flex: 1, minWidth: 0 },
  calendarBtn: { width: 42, minHeight: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calendarBtnText: { fontSize: 18 },
  modalActionsSticky: { borderTopWidth: 1, paddingTop: 1, paddingHorizontal: 2, paddingBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, width: '100%' },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
})

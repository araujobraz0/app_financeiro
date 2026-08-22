import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { CardItem, ModoModal, QuickAddType, Tema, TipoFormularioLancamento } from '../../app/types'
import { handleMaskedMoneyInput } from '../../src/utils/currency'
import Campo from '../common/Campo'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

/**
 * Valores dos campos do formulario. O modal e dono deles: o HomeScreen
 * informa os valores iniciais e recebe o resultado de volta no onSave.
 * Isso evita que cada tecla digitada re-renderize a tela inteira.
 */
export type LaunchFormValues = {
  name: string
  selectedCategory: string
  value: string
  installmentDescription: string
  installmentValue: string
  installmentTotal: string
}

export const emptyLaunchFormValues = (category = ''): LaunchFormValues => ({
  name: '',
  selectedCategory: category,
  value: 'R$ 0,00',
  installmentDescription: '',
  installmentValue: 'R$ 0,00',
  installmentTotal: '1',
})

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
  categories: string[]
  initialValues: LaunchFormValues
  day: string
  onDayChange: (value: string) => void
  onOpenDayCalendar: () => void
  onTypeChange: (type: QuickAddType) => void
  onSave: (values: LaunchFormValues) => void
}

const TIPOS: [QuickAddType, string, Parameters<typeof Icon>[0]['name']][] = [
  ['entrada', 'Entrada', 'seta_cima'],
  ['saida', 'Saída', 'seta_baixo'],
  ['fixo', 'Fixo', 'aba_fixo'],
  ['parcela', 'Parcela', 'cartao'],
]

export default function LaunchModal({
  visible,
  onClose,
  theme,
  formType,
  mode,
  title,
  cards,
  selectedCardId,
  onSelectedCardIdChange,
  categories,
  initialValues,
  day,
  onDayChange,
  onOpenDayCalendar,
  onTypeChange,
  onSave,
}: LaunchModalProps) {
  const [name, setName] = useState(initialValues.name)
  const [selectedCategory, setSelectedCategory] = useState(initialValues.selectedCategory)
  const [value, setValue] = useState(initialValues.value)
  const [installmentDescription, setInstallmentDescription] = useState(initialValues.installmentDescription)
  const [installmentValue, setInstallmentValue] = useState(initialValues.installmentValue)
  const [installmentTotal, setInstallmentTotal] = useState(initialValues.installmentTotal)

  const ehParcela = formType === 'parcela'

  const podeSalvar = ehParcela
    ? installmentDescription.trim().length > 0 && !!selectedCardId
    : name.trim().length > 0

  const handleSave = () => {
    onSave({ name, selectedCategory, value, installmentDescription, installmentValue, installmentTotal })
  }

  /** Faixa horizontal de opcoes (categorias, cartoes). */
  const faixa = (
    itens: { chave: string; label: string }[],
    selecionado: string | null,
    onSelecionar: (chave: string) => void
  ) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faixa}>
      {itens.map((item) => {
        const ativo = selecionado === item.chave
        return (
          <PressableScale
            key={item.chave}
            onPress={() => onSelecionar(item.chave)}
            style={[
              styles.pilula,
              {
                backgroundColor: ativo ? theme.primary : theme.cardSoft,
                borderColor: ativo ? theme.primary : theme.border,
              },
            ]}
          >
            <Text style={[styles.pilulaTexto, { color: ativo ? theme.textInverse : theme.text }]}>
              {item.label}
            </Text>
          </PressableScale>
        )
      })}
    </ScrollView>
  )

  const campoDia = (rotulo: string) => (
    <Campo
      theme={theme}
      rotulo={rotulo}
      value={day}
      onChangeText={onDayChange}
      keyboardType="number-pad"
      inputMode="numeric"
      placeholder="1"
      sufixo={
        <PressableScale onPress={onOpenDayCalendar} hitSlop={8}>
          <Icon name="calendario" size={19} color={theme.muted} />
        </PressableScale>
      }
    />
  )

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={title}
      acoes={[
        { label: 'Cancelar', onPress: onClose },
        { label: 'Salvar', onPress: handleSave, primaria: true, desabilitada: !podeSalvar },
      ]}
    >
      {/* Tipo do lancamento — so ao criar */}
      {mode === 'novo' ? (
        <View style={styles.tipos}>
          {TIPOS.map(([tipo, label, icone]) => {
            const ativo = formType === tipo
            return (
              <PressableScale
                key={tipo}
                onPress={() => onTypeChange(tipo)}
                style={[
                  styles.tipo,
                  {
                    backgroundColor: ativo ? theme.accentSoft : theme.cardSoft,
                    borderColor: ativo ? theme.accent : theme.border,
                  },
                ]}
              >
                <Icon name={icone} size={17} color={ativo ? theme.accent : theme.muted} />
                <Text style={[styles.tipoTexto, { color: ativo ? theme.accent : theme.muted }]}>
                  {label}
                </Text>
              </PressableScale>
            )
          })}
        </View>
      ) : null}

      {ehParcela ? (
        <>
          <Text style={[styles.rotuloFaixa, { color: theme.muted }]}>Cartão</Text>
          {cards.length === 0 ? (
            <Text style={[styles.aviso, { color: theme.red }]}>
              Cadastre um cartão antes de lançar uma compra parcelada.
            </Text>
          ) : (
            faixa(
              cards.map((card) => ({ chave: card.id, label: card.nome })),
              selectedCardId,
              onSelectedCardIdChange
            )
          )}

          <Campo
            theme={theme}
            rotulo="Descrição"
            value={installmentDescription}
            onChangeText={setInstallmentDescription}
            placeholder="Ex.: tênis, curso..."
          />

          <Campo
            theme={theme}
            rotulo="Valor total da compra"
            value={installmentValue}
            onChangeText={(bruto) => handleMaskedMoneyInput(bruto, setInstallmentValue)}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="R$ 0,00"
            dica="O valor de cada parcela é calculado automaticamente."
          />

          <Campo
            theme={theme}
            rotulo="Total de parcelas"
            value={installmentTotal}
            onChangeText={setInstallmentTotal}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="1"
            maxLength={3}
          />

          {campoDia('Dia da compra')}
        </>
      ) : (
        <>
          <Campo
            theme={theme}
            rotulo="Nome"
            value={name}
            onChangeText={setName}
            placeholder="Digite o nome"
            autoFocus={mode === 'novo'}
          />

          {formType === 'saida' ? (
            <>
              <Text style={[styles.rotuloFaixa, { color: theme.muted }]}>Categoria</Text>
              {faixa(
                categories.map((c) => ({ chave: c, label: c })),
                selectedCategory,
                setSelectedCategory
              )}
            </>
          ) : null}

          <Campo
            theme={theme}
            rotulo="Valor"
            value={value}
            onChangeText={(bruto) => handleMaskedMoneyInput(bruto, setValue)}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="R$ 0,00"
          />

          {campoDia('Dia')}
        </>
      )}
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  tipo: {
    width: '47.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  tipoTexto: { fontSize: 13, fontWeight: '800' },

  rotuloFaixa: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  faixa: { gap: 8, paddingRight: 8, marginBottom: 16 },
  pilula: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pilulaTexto: { fontSize: 12, fontWeight: '700' },
  aviso: { fontSize: 12, fontWeight: '600', marginBottom: 16, lineHeight: 17 },
})

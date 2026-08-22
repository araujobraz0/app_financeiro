import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { Tema } from '../../app/types'
import { handleMaskedMoneyInput, moneyStringToNumber } from '../../src/utils/currency'
import Campo from '../common/Campo'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
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

/** Dia extraido de "DD/MM"; 0 quando ainda nao ha data valida. */
function diaDe(texto: string) {
  const n = Number(String(texto || '').slice(0, 2))
  return Number.isNaN(n) ? 0 : n
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

  const diaFechamento = diaDe(closing)
  const diaVencimento = diaDe(due)

  // Quantos dias o usuario tem entre a compra fechar e a fatura vencer. Se o
  // vencimento cai antes do fechamento, ele pertence ao mes seguinte.
  const diasParaPagar =
    diaFechamento > 0 && diaVencimento > 0
      ? diaVencimento > diaFechamento
        ? diaVencimento - diaFechamento
        : 30 - diaFechamento + diaVencimento
      : null

  /** Comprar logo depois do fechamento joga a compra para a fatura mais distante. */
  const melhorDiaCompra = diaFechamento > 0 ? (diaFechamento % 31) + 1 : null

  const podeSalvar = name.trim().length > 0

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={editing ? 'Editar cartão' : 'Novo cartão'}
      subtitulo="As datas definem em qual fatura cada compra entra."
      acoes={[
        { label: 'Cancelar', onPress: onClose },
        {
          label: 'Salvar',
          onPress: () => onSave({ name, limit }),
          primaria: true,
          desabilitada: !podeSalvar,
        },
      ]}
    >
      {/* Previa: o cartao vai se parecer com isto na aba */}
      <View style={[styles.previa, { backgroundColor: theme.backgroundSoft, borderColor: theme.border }]}>
        <View style={[styles.chip, { backgroundColor: theme.borderStrong }]} />
        <Text style={[styles.previaNome, { color: theme.text }]} numberOfLines={1}>
          {name.trim() || 'Nome do cartão'}
        </Text>
        <Text style={[styles.previaLimite, { color: theme.muted }]}>
          Limite {moneyStringToNumber(limit) > 0 ? limit : 'não informado'}
        </Text>
        {diaFechamento > 0 || diaVencimento > 0 ? (
          <Text style={[styles.previaDatas, { color: theme.faint }]} numberOfLines={1}>
            {diaFechamento > 0 ? `Fecha ${closing}` : 'Fechamento em aberto'}
            {' · '}
            {diaVencimento > 0 ? `vence ${due}` : 'vencimento em aberto'}
          </Text>
        ) : null}
      </View>

      <Campo
        theme={theme}
        rotulo="Nome do cartão"
        value={name}
        onChangeText={setName}
        placeholder="Ex.: Nubank, Inter Gold"
        autoFocus={!editing}
      />

      <Campo
        theme={theme}
        rotulo="Limite"
        value={limit}
        onChangeText={(bruto) => handleMaskedMoneyInput(bruto, setLimit)}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="R$ 0,00"
        dica="Opcional. Serve para calcular quanto do limite já foi usado."
      />

      <View style={styles.duplo}>
        <View style={styles.metade}>
          <Campo
            theme={theme}
            rotulo="Fecha dia"
            value={closing}
            onChangeText={(valor) => onClosingChange(formatarInputDiaMes(valor))}
            placeholder="DD/MM"
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={5}
            sufixo={
              <PressableScale onPress={onOpenClosingCalendar} hitSlop={8}>
                <Icon name="calendario" size={18} color={theme.muted} />
              </PressableScale>
            }
          />
        </View>
        <View style={styles.metade}>
          <Campo
            theme={theme}
            rotulo="Vence dia"
            value={due}
            onChangeText={(valor) => onDueChange(formatarInputDiaMes(valor))}
            placeholder="DD/MM"
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={5}
            sufixo={
              <PressableScale onPress={onOpenDueCalendar} hitSlop={8}>
                <Icon name="calendario" size={18} color={theme.muted} />
              </PressableScale>
            }
          />
        </View>
      </View>

      {diasParaPagar !== null ? (
        <View style={[styles.explicacao, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
          <Icon name="calendario" size={15} color={theme.accent} />
          <Text style={[styles.explicacaoTexto, { color: theme.accent }]}>
            Compras feitas depois do dia {diaFechamento} entram na fatura seguinte. Você tem{' '}
            {diasParaPagar} dias entre o fechamento e o vencimento.
          </Text>
        </View>
      ) : null}

      {melhorDiaCompra !== null ? (
        <View style={[styles.explicacao, { backgroundColor: theme.greenSoft, borderColor: theme.green }]}>
          <Icon name="carrinho" size={15} color={theme.green} />
          <Text style={[styles.explicacaoTexto, { color: theme.green }]}>
            Melhor dia de compra: dia {melhorDiaCompra}. Comprar logo depois do fechamento joga a
            despesa para a fatura mais distante, que é o maior prazo que este cartão consegue dar.
          </Text>
        </View>
      ) : null}
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  previa: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  chip: { width: 26, height: 19, borderRadius: 4, marginBottom: 10 },
  previaNome: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  previaLimite: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  previaDatas: { fontSize: 10.5, fontWeight: '600', marginTop: 2 },

  duplo: { flexDirection: 'row', gap: 12 },
  metade: { flex: 1, minWidth: 0 },

  explicacao: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginTop: 10,
  },
  explicacaoTexto: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
})

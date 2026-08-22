// Assinatura do cartao: uma cobranca que se repete todo mes.
//
// O formulario e curto de proposito — nome e valor. Data nao entra: a cobranca
// e do mes, e o dia exato nao muda nada no calculo da fatura.

import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import { handleMaskedMoneyInput, moneyStringToNumber } from '../../src/utils/currency'
import Campo from '../common/Campo'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'

export type CardSubscriptionValues = { nome: string; valor: string }

export const emptyCardSubscriptionValues = (): CardSubscriptionValues => ({
  nome: '',
  valor: 'R$ 0,00',
})

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  editando: boolean
  /** Nome do cartao, para o texto dizer onde a cobranca vai cair. */
  cartaoNome: string
  /** Competencia em edicao, formatada ("Ago/2026"). */
  competencia: string
  initialValues: CardSubscriptionValues
  onSave: (values: CardSubscriptionValues) => void
}

/** Sugestoes: assinar algo e quase sempre uma destas. */
const SUGESTOES = ['Spotify', 'Netflix', 'Amazon Prime', 'Disney+', 'YouTube Premium', 'iCloud']

export default function CardSubscriptionModal({
  visible,
  onClose,
  theme,
  editando,
  cartaoNome,
  competencia,
  initialValues,
  onSave,
}: Props) {
  const [nome, setNome] = useState(initialValues.nome)
  const [valor, setValor] = useState(initialValues.valor)

  const podeSalvar = nome.trim().length > 0 && moneyStringToNumber(valor) > 0

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={editando ? 'Editar assinatura' : 'Nova assinatura'}
      subtitulo={
        editando
          ? `A mudança vale de ${competencia} em diante; os meses anteriores ficam como estavam.`
          : `Entra na fatura de ${cartaoNome} todo mês, a partir de ${competencia}.`
      }
      acoes={[
        { label: 'Cancelar', onPress: onClose },
        {
          label: 'Salvar',
          onPress: () => onSave({ nome, valor }),
          primaria: true,
          desabilitada: !podeSalvar,
        },
      ]}
    >
      <Campo
        theme={theme}
        rotulo="Nome"
        value={nome}
        onChangeText={setNome}
        placeholder="Ex.: Spotify"
        autoFocus={!editando}
      />

      {!editando && !nome.trim() ? (
        <View style={styles.sugestoes}>
          {SUGESTOES.map((sugestao) => (
            <Text
              key={sugestao}
              onPress={() => setNome(sugestao)}
              style={[
                styles.sugestao,
                { color: theme.muted, backgroundColor: theme.cardSoft, borderColor: theme.border },
              ]}
            >
              {sugestao}
            </Text>
          ))}
        </View>
      ) : null}

      <Campo
        theme={theme}
        rotulo="Valor por mês"
        value={valor}
        onChangeText={(bruto) => handleMaskedMoneyInput(bruto, setValor)}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="R$ 0,00"
      />

      <View style={[styles.aviso, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
        <Icon name="aba_fixo" size={15} color={theme.accent} />
        <Text style={[styles.avisoTexto, { color: theme.accent }]}>
          Cobra sozinha todo mês. Quando cancelar, é só excluir no mês em que a cobrança parou.
        </Text>
      </View>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  sugestoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: -8, marginBottom: 18 },
  sugestao: {
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
  },
  avisoTexto: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
})

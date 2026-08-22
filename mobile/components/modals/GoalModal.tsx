import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { Tema } from '../../app/types'
import { handleMaskedMoneyInput } from '../../src/utils/currency'
import AppModal from '../common/AppModal'
import PressableScale from '../common/motion/PressableScale'

/**
 * Campos do formulario de objetivo. O modal e dono deles: recebe os valores
 * iniciais e devolve o resultado no onSave, para que digitar aqui nao
 * re-renderize a tela inteira.
 */
export type GoalFormValues = {
  titulo: string
  alvo: string
  atual: string
}

export const emptyGoalFormValues = (): GoalFormValues => ({
  titulo: '',
  alvo: 'R$ 0,00',
  atual: 'R$ 0,00',
})

type GoalModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  editing: boolean
  initialValues: GoalFormValues
  onSave: (values: GoalFormValues) => void
}

export default function GoalModal({
  visible,
  onClose,
  theme,
  editing,
  initialValues,
  onSave,
}: GoalModalProps) {
  const [titulo, setTitulo] = useState(initialValues.titulo)
  const [alvo, setAlvo] = useState(initialValues.alvo)
  const [atual, setAtual] = useState(initialValues.atual)

  const handleSave = () => {
    onSave({ titulo, alvo, atual })
  }

  return (
    <AppModal visible={visible} onClose={onClose}>
      <View style={[styles.modalCard, styles.modalCardGoal, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Editar objetivo' : 'Novo objetivo'}</Text>

        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: theme.muted }]}>Título</Text>
          <TextInput
            value={titulo}
            onChangeText={setTitulo}
            placeholder='Ex.: Reserva de emergência'
            placeholderTextColor={theme.muted}
            style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
          />
        </View>

        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: theme.muted }]}>Valor alvo</Text>
          <TextInput
            value={alvo}
            onChangeText={(value) => handleMaskedMoneyInput(value, setAlvo)}
            placeholder='R$ 0,00'
            placeholderTextColor={theme.muted}
            keyboardType='number-pad'
            inputMode='numeric'
            style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
          />
        </View>

        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: theme.muted }]}>Quanto já tenho</Text>
          <TextInput
            value={atual}
            onChangeText={(value) => handleMaskedMoneyInput(value, setAtual)}
            placeholder='R$ 0,00'
            placeholderTextColor={theme.muted}
            keyboardType='number-pad'
            inputMode='numeric'
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
  modalCardGoal: { paddingBottom: 40, minHeight: 270 },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  modalField: { marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: '800', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, width: '100%' },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
})

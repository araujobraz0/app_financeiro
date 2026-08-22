import { useState } from 'react'
import type { ModoCategoria, Tema } from '../../app/types'
import { handleMaskedMoneyInput, moneyStringToNumber } from '../../src/utils/currency'
import Campo from '../common/Campo'
import ModalSheet from '../common/ModalSheet'

type CategoryNameModalProps = {
  visible: boolean
  onClose: () => void
  mode: ModoCategoria
  initialValue: string
  /** Limite mensal ja gravado, formatado como moeda. Vazio = sem limite. */
  initialLimit: string
  onSave: (value: string, limite: number) => void
  theme: Tema
}

export default function CategoryNameModal({
  visible,
  onClose,
  mode,
  initialValue,
  initialLimit,
  onSave,
  theme,
}: CategoryNameModalProps) {
  // Os campos sao do modal: digitar aqui nao re-renderiza a tela inteira.
  const [value, setValue] = useState(initialValue)
  const [limite, setLimite] = useState(initialLimit)

  const salvar = () => onSave(value, moneyStringToNumber(limite))

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={mode === 'nova' ? 'Nova categoria' : 'Editar categoria'}
      subtitulo="Categorias organizam suas saídas no gráfico."
      acoes={[
        { label: 'Cancelar', onPress: onClose },
        { label: 'Salvar', onPress: salvar, primaria: true, desabilitada: !value.trim() },
      ]}
    >
      <Campo
        theme={theme}
        rotulo="Nome"
        value={value}
        onChangeText={setValue}
        placeholder="Ex.: Mercado"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => value.trim() && salvar()}
      />

      <Campo
        theme={theme}
        rotulo="Limite do mês"
        value={limite}
        onChangeText={(bruto) => handleMaskedMoneyInput(bruto, setLimite)}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="R$ 0,00"
        dica="Opcional. Com um limite, a categoria mostra quanto já foi gasto dele."
      />
    </ModalSheet>
  )
}

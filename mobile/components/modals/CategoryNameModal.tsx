import { useState } from 'react'
import type { ModoCategoria, Tema } from '../../app/types'
import Campo from '../common/Campo'
import ModalSheet from '../common/ModalSheet'

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

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={mode === 'nova' ? 'Nova categoria' : 'Renomear categoria'}
      subtitulo="Categorias organizam suas saídas no gráfico."
      acoes={[
        { label: 'Cancelar', onPress: onClose },
        { label: 'Salvar', onPress: () => onSave(value), primaria: true, desabilitada: !value.trim() },
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
        onSubmitEditing={() => value.trim() && onSave(value)}
      />
    </ModalSheet>
  )
}

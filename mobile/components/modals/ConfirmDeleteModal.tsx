import { Text, StyleSheet } from 'react-native'
import type { Tema } from '../../app/types'
import ModalSheet from '../common/ModalSheet'

type ConfirmDeleteModalProps = {
  visible: boolean
  label?: string
  onClose: () => void
  onConfirm: () => void
  theme: Tema
}

export default function ConfirmDeleteModal({
  visible,
  label,
  onClose,
  onConfirm,
  theme,
}: ConfirmDeleteModalProps) {
  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Confirmar exclusão"
      acoes={[
        { label: 'Cancelar', onPress: onClose },
        { label: 'Excluir', onPress: onConfirm, perigo: true },
      ]}
    >
      <Text style={[styles.texto, { color: theme.muted }]}>
        Tem certeza que deseja excluir {label ? `"${label}"` : 'este item'}? Esta ação não pode ser
        desfeita.
      </Text>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  texto: { fontSize: 14, fontWeight: '500', lineHeight: 21 },
})

import { StyleSheet, Text, View } from 'react-native'
import type { Tema } from '../../app/types'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

type ManageCategoriesModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  categories: string[]
  onEdit: (category: string) => void
  onDelete: (category: string) => void
}

export default function ManageCategoriesModal({
  visible,
  onClose,
  theme,
  categories,
  onEdit,
  onDelete,
}: ManageCategoriesModalProps) {
  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Categorias"
      subtitulo={`${categories.length} ${categories.length === 1 ? 'categoria' : 'categorias'} para classificar suas saídas.`}
      acoes={[{ label: 'Concluir', onPress: onClose, primaria: true }]}
    >
      <View style={styles.lista}>
        {categories.map((categoria) => (
          <View
            key={categoria}
            style={[styles.linha, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          >
            <Text style={[styles.nome, { color: theme.text }]} numberOfLines={1}>
              {categoria}
            </Text>
            <View style={styles.acoes}>
              <PressableScale
                onPress={() => onEdit(categoria)}
                style={[styles.botao, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Icon name="editar" size={14} color={theme.muted} />
              </PressableScale>
              <PressableScale
                onPress={() => onDelete(categoria)}
                style={[styles.botao, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Icon name="excluir" size={16} color={theme.red} />
              </PressableScale>
            </View>
          </View>
        ))}
      </View>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  lista: { gap: 8 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  nome: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  acoes: { flexDirection: 'row', gap: 7 },
  botao: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

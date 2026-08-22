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
  onCreate: () => void
  onEdit: (category: string) => void
  onDelete: (category: string) => void
}

export default function ManageCategoriesModal({
  visible,
  onClose,
  theme,
  categories,
  onCreate,
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
      <PressableScale
        onPress={onCreate}
        style={[styles.adicionar, { borderColor: theme.borderStrong }]}
        accessibilityRole="button"
        accessibilityLabel="Nova categoria"
      >
        <Icon name="adicionar" size={15} color={theme.muted} />
        <Text style={[styles.adicionarTexto, { color: theme.muted }]}>Nova categoria</Text>
      </PressableScale>

      <View style={styles.lista}>
        {categories.length === 0 ? (
          <Text style={[styles.vazio, { color: theme.faint }]}>
            Nenhuma categoria ainda. Crie a primeira para classificar as saídas.
          </Text>
        ) : null}

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
  lista: { gap: 8, marginTop: 12 },
  vazio: { fontSize: 13, fontWeight: '500', lineHeight: 19, paddingVertical: 6 },
  adicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  adicionarTexto: { fontSize: 13, fontWeight: '700' },
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

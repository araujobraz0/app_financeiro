import { StyleSheet, Text, View } from 'react-native'
import type { Tema } from '../../app/types'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

type ConfirmDeleteModalProps = {
  visible: boolean
  label?: string
  /** Texto no lugar do padrao, quando a exclusao tem regra propria. */
  descricao?: string
  onClose: () => void
  onConfirm: () => void
  theme: Tema
  /**
   * Quando o item faz parte de um conjunto — as parcelas de uma mesma compra —
   * o usuario escolhe apagar so aquela ou a compra inteira. Sem essa opcao,
   * apagar uma compra de 12x exigia excluir parcela por parcela.
   */
  escopo?: {
    quantidade: number
    descricaoConjunto: string
    onConfirmarTodos: () => void
  }
}

export default function ConfirmDeleteModal({
  visible,
  label,
  descricao,
  onClose,
  onConfirm,
  theme,
  escopo,
}: ConfirmDeleteModalProps) {
  const temEscopo = Boolean(escopo && escopo.quantidade > 1)

  if (temEscopo && escopo) {
    return (
      <ModalSheet
        theme={theme}
        visible={visible}
        onClose={onClose}
        titulo="O que você quer excluir?"
        subtitulo={`"${label}" faz parte de uma compra de ${escopo.quantidade} parcelas.`}
        acoes={[{ label: 'Cancelar', onPress: onClose }]}
      >
        <PressableScale
          onPress={onConfirm}
          style={[styles.opcao, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
        >
          <View style={[styles.icone, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Icon name="excluir" size={17} color={theme.muted} />
          </View>
          <View style={styles.textos}>
            <Text style={[styles.titulo, { color: theme.text }]}>Somente esta parcela</Text>
            <Text style={[styles.descricao, { color: theme.muted }]}>
              As outras parcelas continuam na fatura.
            </Text>
          </View>
          <Icon name="seta_direita" size={16} color={theme.faint} />
        </PressableScale>

        <PressableScale
          onPress={escopo.onConfirmarTodos}
          style={[styles.opcao, { backgroundColor: theme.redSoft, borderColor: theme.red }]}
        >
          <View style={[styles.icone, { backgroundColor: theme.card, borderColor: theme.red }]}>
            <Icon name="excluir" size={17} color={theme.red} />
          </View>
          <View style={styles.textos}>
            <Text style={[styles.titulo, { color: theme.red }]}>A compra inteira</Text>
            <Text style={[styles.descricao, { color: theme.muted }]}>
              Remove as {escopo.quantidade} parcelas de {escopo.descricaoConjunto}.
            </Text>
          </View>
          <Icon name="seta_direita" size={16} color={theme.red} />
        </PressableScale>
      </ModalSheet>
    )
  }

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
        {descricao ||
          `Tem certeza que deseja excluir ${label ? `"${label}"` : 'este item'}? Dá para voltar atrás no botão de desfazer, lá em cima.`}
      </Text>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  texto: { fontSize: 14, fontWeight: '500', lineHeight: 21 },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  icone: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0 },
  titulo: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  descricao: { fontSize: 11, fontWeight: '500', marginTop: 3, lineHeight: 15 },
})

// Campo de busca global com icone embutido e botao de limpar.

import { memo } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'

import type { Tema } from '../../app/types'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  theme: Tema
  valor: string
  onChange: (texto: string) => void
}

function BuscaGlobal({ theme, valor, onChange }: Props) {
  return (
    <View style={[styles.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Icon name="busca" size={17} color={theme.faint} />
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder="Buscar em todo o app"
        placeholderTextColor={theme.faint}
        style={[styles.input, { color: theme.text }]}
        returnKeyType="search"
      />
      {valor.length > 0 ? (
        <PressableScale
          onPress={() => onChange('')}
          scaleTo={0.85}
          hitSlop={8}
          style={[styles.limpar, { backgroundColor: theme.cardSoft }]}
          accessibilityLabel="Limpar busca"
        >
          <Icon name="excluir" size={13} color={theme.muted} />
        </PressableScale>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 48,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 14, fontWeight: '600', paddingVertical: 0 },
  limpar: { width: 22, height: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
})

export default memo(BuscaGlobal)

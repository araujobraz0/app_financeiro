import { StyleSheet, Text, View } from 'react-native'
import type { Tema } from '../../app/types'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

type SelectionOption = {
  value: string | number
  label: string
}

type SelectionModalProps = {
  visible: boolean
  onClose: () => void
  title: string
  options: SelectionOption[]
  selectedValue: string | number
  onSelect: (value: string | number) => void
  theme: Tema
  /** Mantido por compatibilidade: a rolagem agora e automatica. */
  scrollable?: boolean
  hint?: string
}

/**
 * Escolha de um valor numa lista (mes, ano, filtro).
 *
 * A rolagem nao precisa mais ser pedida por prop: o corpo do ModalSheet rola
 * sozinho quando a lista passa da altura maxima.
 */
export default function SelectionModal({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  theme,
  hint,
}: SelectionModalProps) {
  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={title}
      subtitulo={hint}
      level={2}
    >
      <View style={styles.lista}>
        {options.map((option) => {
          const ativo = selectedValue === option.value
          return (
            <PressableScale
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.opcao,
                {
                  backgroundColor: ativo ? theme.accentSoft : theme.cardSoft,
                  borderColor: ativo ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[styles.texto, { color: ativo ? theme.accent : theme.text }]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
              {ativo ? <Icon name="confirmar" size={16} color={theme.accent} /> : null}
            </PressableScale>
          )
        })}
      </View>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  lista: { gap: 8 },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  texto: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, flex: 1 },
})

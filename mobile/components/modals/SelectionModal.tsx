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
 * Listas curtas — meses e anos — aparecem em grade: as doze opcoes cabem numa
 * olhada so, e escolher vira um toque em vez de rolar procurando. Listas
 * longas continuam empilhadas, onde ler o rotulo inteiro importa mais.
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
  // Rotulos curtos cabem lado a lado; longos precisam da linha inteira.
  const rotuloMaisLongo = options.reduce((maior, o) => Math.max(maior, o.label.length), 0)
  const emGrade = options.length >= 5 && rotuloMaisLongo <= 12

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={title}
      subtitulo={hint}
      level={2}
    >
      <View style={emGrade ? styles.grade : styles.lista}>
        {options.map((option) => {
          const ativo = selectedValue === option.value

          if (emGrade) {
            return (
              <PressableScale
                key={option.value}
                onPress={() => onSelect(option.value)}
                scaleTo={0.94}
                style={[
                  styles.celula,
                  {
                    backgroundColor: ativo ? theme.primary : theme.cardSoft,
                    borderColor: ativo ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[styles.celulaTexto, { color: ativo ? theme.textInverse : theme.text }]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </PressableScale>
            )
          }

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
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  texto: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, flex: 1 },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  celula: {
    flexGrow: 1,
    flexBasis: '28%',
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  celulaTexto: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
})

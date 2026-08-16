import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Tema } from '../../app/types'
import AppModal from '../common/AppModal'

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
  scrollable?: boolean
  hint?: string
}

export default function SelectionModal({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  theme,
  scrollable,
  hint,
}: SelectionModalProps) {
  const list = options.map((option) => (
    <Pressable
      key={option.value}
      style={[
        styles.modalOption,
        {
          backgroundColor: selectedValue === option.value ? theme.cardSoft : 'transparent',
          borderColor: theme.border,
        },
      ]}
      onPress={() => onSelect(option.value)}
    >
      <Text style={[styles.modalOptionText, { color: selectedValue === option.value ? theme.text : theme.muted }]}>
        {option.label}
      </Text>
    </Pressable>
  ))

  return (
    <AppModal visible={visible} onClose={onClose}>
      <View
        style={[
          styles.modalCard,
          scrollable ? styles.modalCardScrollHint : styles.modalCardYear,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>

        {scrollable ? (
          <>
            {hint ? (
              <View style={[styles.modalHintWrap, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.modalHintText, { color: theme.muted }]}>{hint}</Text>
              </View>
            ) : null}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.monthModalScroll}>
              {list}
            </ScrollView>
          </>
        ) : (
          list
        )}
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
  modalCardYear: { paddingBottom: 34 },
  modalCardScrollHint: { paddingBottom: 30 },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  modalHintWrap: {
    alignSelf: 'center',
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHintText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  monthModalScroll: { maxHeight: 340 },
  modalOption: {
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    paddingHorizontal: 12,
  },
  modalOptionText: { fontSize: 15, fontWeight: '800' },
})

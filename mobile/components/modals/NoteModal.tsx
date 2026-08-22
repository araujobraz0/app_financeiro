import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { NoteModalMode, Tema } from '../../app/types'
import AppModal from '../common/AppModal'
import PressableScale from '../common/motion/PressableScale'

/**
 * Campos do formulario de Pix / anotacao. O modal e dono deles: recebe os
 * valores iniciais e devolve o resultado no onSave, para que digitar aqui
 * nao re-renderize a tela inteira.
 */
export type NoteFormValues = {
  pixNome: string
  pixChave: string
  pixObservacao: string
  pixLinks: string[]
  notaTitulo: string
  notaConteudo: string
  notaLinks: string[]
}

export const emptyNoteFormValues = (): NoteFormValues => ({
  pixNome: '',
  pixChave: '',
  pixObservacao: '',
  pixLinks: [''],
  notaTitulo: '',
  notaConteudo: '',
  notaLinks: [''],
})

type NoteModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  type: NoteModalMode
  initialValues: NoteFormValues
  onSave: (values: NoteFormValues) => void
}

export default function NoteModal({
  visible,
  onClose,
  theme,
  type,
  initialValues,
  onSave,
}: NoteModalProps) {
  const [pixNome, setPixNome] = useState(initialValues.pixNome)
  const [pixChave, setPixChave] = useState(initialValues.pixChave)
  const [pixObservacao, setPixObservacao] = useState(initialValues.pixObservacao)
  const [pixLinks, setPixLinks] = useState<string[]>(initialValues.pixLinks)
  const [notaTitulo, setNotaTitulo] = useState(initialValues.notaTitulo)
  const [notaConteudo, setNotaConteudo] = useState(initialValues.notaConteudo)
  const [notaLinks, setNotaLinks] = useState<string[]>(initialValues.notaLinks)

  const atualizarCampoLink = (
    setter: (value: string[] | ((prev: string[]) => string[])) => void,
    index: number,
    value: string
  ) => {
    setter((prev) => prev.map((item, idx) => (idx === index ? value : item)))
  }

  const adicionarCampoLink = (setter: (value: string[] | ((prev: string[]) => string[])) => void) => {
    setter((prev) => [...prev, ''])
  }

  const removerCampoLink = (setter: (value: string[] | ((prev: string[]) => string[])) => void, index: number) => {
    setter((prev) => {
      if (prev.length <= 1) return ['']
      return prev.filter((_, idx) => idx !== index)
    })
  }

  const handleSave = () => {
    onSave({ pixNome, pixChave, pixObservacao, pixLinks, notaTitulo, notaConteudo, notaLinks })
  }

  const linksField = (
    links: string[],
    setter: (value: string[] | ((prev: string[]) => string[])) => void,
    keyPrefix: string
  ) => (
    <View style={styles.modalField}>
      <View style={styles.linkFieldHeader}>
        <Text style={[styles.modalLabel, { color: theme.muted }]}>Links</Text>
        <PressableScale
          onPress={() => adicionarCampoLink(setter)}
          style={[styles.smallActionBtn, styles.linkAddBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
        >
          <Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>＋</Text>
        </PressableScale>
      </View>
      {links.map((link, index) => (
        <View key={`${keyPrefix}-link-${index}`} style={styles.linkInputRow}>
          <TextInput
            value={link}
            onChangeText={(value) => atualizarCampoLink(setter, index, value)}
            placeholder='Cole um link aqui'
            placeholderTextColor={theme.muted}
            autoCapitalize='none'
            autoCorrect={false}
            keyboardType='url'
            style={[styles.modalInput, styles.linkInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
          />
          <PressableScale
            onPress={() => removerCampoLink(setter, index)}
            style={[styles.linkRemoveBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          >
            <Text style={[styles.linkRemoveBtnText, { color: theme.red }]}>×</Text>
          </PressableScale>
        </View>
      ))}
    </View>
  )

  return (
    <AppModal visible={visible} onClose={onClose}>
      <View style={[styles.modalCard, styles.modalCardNotesFixedFooter, styles.modalCardWithFixedFooter, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.modalContentFill}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={[styles.modalScrollContent, styles.modalScrollContentWithFooter]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps='always'
            nestedScrollEnabled
            scrollEnabled
          >
            <View style={styles.modalContentWrap}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{type === 'pix' ? 'Salvar Pix' : 'Salvar anotação'}</Text>

              {type === 'pix' ? (
                <>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome</Text>
                    <TextInput
                      value={pixNome}
                      onChangeText={setPixNome}
                      placeholder='Ex.: Mãe, João, fornecedor...'
                      placeholderTextColor={theme.muted}
                      style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.muted }]}>Chave Pix</Text>
                    <TextInput
                      value={pixChave}
                      onChangeText={setPixChave}
                      placeholder='CPF, e-mail, telefone...'
                      placeholderTextColor={theme.muted}
                      style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.muted }]}>Observação</Text>
                    <TextInput
                      value={pixObservacao}
                      onChangeText={setPixObservacao}
                      placeholder='Apelido, banco, detalhe...'
                      placeholderTextColor={theme.muted}
                      style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                    />
                  </View>

                  {linksField(pixLinks, setPixLinks, 'pix')}
                </>
              ) : (
                <>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.muted }]}>Título</Text>
                    <TextInput
                      value={notaTitulo}
                      onChangeText={setNotaTitulo}
                      placeholder='Digite o título'
                      placeholderTextColor={theme.muted}
                      style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.muted }]}>Conteúdo</Text>
                    <TextInput
                      value={notaConteudo}
                      onChangeText={setNotaConteudo}
                      multiline
                      scrollEnabled
                      textAlignVertical='top'
                      placeholder='Escreva sua anotação'
                      placeholderTextColor={theme.muted}
                      style={[styles.modalInput, styles.modalInputMultiline, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                    />
                  </View>

                  {linksField(notaLinks, setNotaLinks, 'nota')}
                </>
              )}
            </View>
          </ScrollView>

          <View style={[styles.modalActionsSticky, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.modalActions}>
              <PressableScale onPress={onClose} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
              </PressableScale>
              <PressableScale onPress={handleSave} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
                <Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text>
              </PressableScale>
            </View>
          </View>
        </View>
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
  modalCardNotesFixedFooter: { width: '88%', maxWidth: 440, minHeight: 430, maxHeight: '86%', paddingBottom: 0 },
  modalCardWithFixedFooter: { overflow: 'hidden' },
  modalContentFill: { flex: 1 },
  modalScroll: { width: '100%' },
  modalScrollContent: { paddingBottom: 4, flexGrow: 1 },
  modalScrollContentWithFooter: { paddingBottom: 26 },
  modalContentWrap: { width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  modalField: { marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: '800', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontWeight: '700' },
  modalInputMultiline: { minHeight: 120, maxHeight: 140, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 },
  linkFieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  linkInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  linkInputField: { flex: 1, minHeight: 44 },
  linkAddBtn: { minWidth: 30, minHeight: 30, paddingHorizontal: 0, borderRadius: 10 },
  linkRemoveBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  linkRemoveBtnText: { fontSize: 18, fontWeight: '900', lineHeight: 18 },
  smallActionBtn: { minHeight: 34, minWidth: 34, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  smallActionBtnIcon: { fontSize: 14, fontWeight: '900' },
  modalActionsSticky: { borderTopWidth: 1, paddingTop: 1, paddingHorizontal: 2, paddingBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, width: '100%' },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
})

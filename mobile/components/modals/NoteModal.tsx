import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NoteModalMode, Tema } from '../../app/types'
import Campo from '../common/Campo'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
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

  const ehPix = type === 'pix'

  const salvar = () =>
    onSave({ pixNome, pixChave, pixObservacao, pixLinks, notaTitulo, notaConteudo, notaLinks })

  const podeSalvar = ehPix
    ? pixNome.trim().length > 0 && pixChave.trim().length > 0
    : notaTitulo.trim().length > 0

  const links = ehPix ? pixLinks : notaLinks
  const setLinks = ehPix ? setPixLinks : setNotaLinks

  const atualizarLink = (indice: number, valor: string) =>
    setLinks((anteriores) => anteriores.map((link, i) => (i === indice ? valor : link)))

  const removerLink = (indice: number) =>
    setLinks((anteriores) => anteriores.filter((_, i) => i !== indice))

  const adicionarLink = () => setLinks((anteriores) => [...anteriores, ''])

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={ehPix ? 'Chave Pix' : 'Nova anotação'}
      subtitulo={
        ehPix
          ? 'Salve uma chave para copiar com um toque depois.'
          : 'Guarde lembretes, senhas e links importantes.'
      }
      acoes={[
        { label: 'Cancelar', onPress: onClose },
        { label: 'Salvar', onPress: salvar, primaria: true, desabilitada: !podeSalvar },
      ]}
    >
      {ehPix ? (
        <>
          <Campo
            theme={theme}
            rotulo="Nome do contato"
            value={pixNome}
            onChangeText={setPixNome}
            placeholder="Ex.: Maria, Padaria do Zé"
            autoFocus
          />

          <Campo
            theme={theme}
            rotulo="Chave"
            value={pixChave}
            onChangeText={setPixChave}
            placeholder="CPF, telefone, e-mail ou chave aleatória"
            autoCapitalize="none"
            dica="Cole do jeito que estiver — o app guarda igual."
          />

          <Campo
            theme={theme}
            rotulo="Observação"
            value={pixObservacao}
            onChangeText={setPixObservacao}
            placeholder="Ex.: banco, para que serve"
            dica="Opcional"
          />
        </>
      ) : (
        <>
          <Campo
            theme={theme}
            rotulo="Título"
            value={notaTitulo}
            onChangeText={setNotaTitulo}
            placeholder="Ex.: Renovar seguro do carro"
            autoFocus
          />

          <Campo
            theme={theme}
            rotulo="Conteúdo"
            value={notaConteudo}
            onChangeText={setNotaConteudo}
            placeholder="Escreva o que precisa lembrar"
            multilinha
          />
        </>
      )}

      {/* Links, comuns aos dois tipos */}
      <Text style={[styles.rotulo, { color: theme.muted }]}>Links</Text>
      {links.length === 0 ? (
        <Text style={[styles.vazio, { color: theme.faint }]}>Nenhum link adicionado.</Text>
      ) : (
        links.map((link, indice) => (
          <View key={indice} style={styles.linkBloco}>
            {/* O botao de remover vive na linha do rotulo: assim ele fica
                centralizado por construcao, sem chutar a altura do campo. */}
            <View style={styles.linkTopo}>
              <Text style={[styles.rotuloLink, { color: theme.muted }]}>{`Link ${indice + 1}`}</Text>
              <PressableScale
                onPress={() => removerLink(indice)}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel={`Remover link ${indice + 1}`}
                style={[styles.remover, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Icon name="excluir" size={14} color={theme.red} />
              </PressableScale>
            </View>

            <Campo
              theme={theme}
              value={link}
              onChangeText={(valor) => atualizarLink(indice, valor)}
              placeholder="https://"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        ))
      )}

      <PressableScale
        onPress={adicionarLink}
        style={[styles.adicionar, { borderColor: theme.borderStrong }]}
      >
        <Icon name="adicionar" size={15} color={theme.muted} />
        <Text style={[styles.adicionarTexto, { color: theme.muted }]}>Adicionar link</Text>
      </PressableScale>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  rotulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  vazio: { fontSize: 12, fontWeight: '500', marginBottom: 12 },
  linkBloco: { marginBottom: 2 },
  linkTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  rotuloLink: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
    minWidth: 0,
  },
  remover: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
})

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

/** Tipos de chave Pix, para o app formatar e o teclado abrir certo. */
type TipoChave = 'cpf' | 'telefone' | 'email' | 'aleatoria'

const TIPOS_CHAVE: { valor: TipoChave; label: string; teclado: 'default' | 'number-pad' | 'email-address' }[] = [
  { valor: 'cpf', label: 'CPF/CNPJ', teclado: 'number-pad' },
  { valor: 'telefone', label: 'Telefone', teclado: 'number-pad' },
  { valor: 'email', label: 'E-mail', teclado: 'email-address' },
  { valor: 'aleatoria', label: 'Aleatória', teclado: 'default' },
]

/** Adivinha o tipo a partir do que ja esta salvo, ao editar. */
function detectarTipo(chave: string): TipoChave {
  const texto = String(chave || '')
  if (texto.includes('@')) return 'email'
  const digitos = texto.replace(/\D/g, '')
  if (digitos.length === 11 && texto.includes('(')) return 'telefone'
  if (digitos.length === 11 || digitos.length === 14) return 'cpf'
  if (digitos.length >= 10 && digitos.length <= 13) return 'telefone'
  return 'aleatoria'
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
  const [tipoChave, setTipoChave] = useState<TipoChave>(detectarTipo(initialValues.pixChave))

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

  const tecladoDaChave = TIPOS_CHAVE.find((t) => t.valor === tipoChave)?.teclado ?? 'default'

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

          <Text style={[styles.rotulo, { color: theme.muted }]}>Tipo da chave</Text>
          <View style={styles.tipos}>
            {TIPOS_CHAVE.map((item) => {
              const ativo = tipoChave === item.valor
              return (
                <PressableScale
                  key={item.valor}
                  onPress={() => setTipoChave(item.valor)}
                  style={[
                    styles.tipo,
                    {
                      backgroundColor: ativo ? theme.accentSoft : theme.cardSoft,
                      borderColor: ativo ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.tipoTexto, { color: ativo ? theme.accent : theme.muted }]}>
                    {item.label}
                  </Text>
                </PressableScale>
              )
            })}
          </View>

          <Campo
            theme={theme}
            rotulo="Chave"
            value={pixChave}
            onChangeText={setPixChave}
            placeholder={
              tipoChave === 'email'
                ? 'nome@email.com'
                : tipoChave === 'telefone'
                  ? '(11) 90000-0000'
                  : tipoChave === 'cpf'
                    ? '000.000.000-00'
                    : 'Cole a chave aleatória'
            }
            keyboardType={tecladoDaChave}
            autoCapitalize="none"
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
          <View key={indice} style={styles.linkLinha}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Campo
                theme={theme}
                rotulo={`Link ${indice + 1}`}
                value={link}
                onChangeText={(valor) => atualizarLink(indice, valor)}
                placeholder="https://"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            <PressableScale
              onPress={() => removerLink(indice)}
              style={[styles.remover, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
            >
              <Icon name="excluir" size={15} color={theme.red} />
            </PressableScale>
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
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  tipo: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoTexto: { fontSize: 12, fontWeight: '700' },

  vazio: { fontSize: 12, fontWeight: '500', marginBottom: 12 },
  linkLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  remover: {
    width: 44,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
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

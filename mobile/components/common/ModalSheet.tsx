// Moldura padrao dos modais.
//
// Antes cada modal carregava seu proprio `minHeight` — havia 23 variantes de
// tamanho no StyleSheet, uma por formulario. Isso e fragil por natureza: o
// numero certo depende do conteudo, do teclado aberto e do tamanho da tela,
// entao uns sobravam espaco e outros cortavam.
//
// Aqui a altura vem do conteudo, limitada por um teto; passando disso, o corpo
// rola sozinho e o rodape de acoes fica fixo, sempre alcancavel.

import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import AppModal from './AppModal'
import PressableScale from './motion/PressableScale'

type Acao = {
  label: string
  onPress: () => void
  /** Destaque visual. Use no botao que conclui a tarefa. */
  primaria?: boolean
  /** Acao destrutiva (excluir). */
  perigo?: boolean
  desabilitada?: boolean
}

type Props = {
  theme: Tema
  visible: boolean
  onClose: () => void
  titulo: string
  subtitulo?: string
  children: ReactNode
  acoes?: Acao[]
  /** Empilhamento, para modais abertos por cima de outros. */
  level?: number
  /** Deixa o corpo ocupar toda a altura disponivel (listas longas). */
  alto?: boolean
}

export default function ModalSheet({
  theme,
  visible,
  onClose,
  titulo,
  subtitulo,
  children,
  acoes,
  level,
  alto = false,
}: Props) {
  return (
    <AppModal visible={visible} onClose={onClose} level={level}>
      <View
        style={[
          styles.card,
          alto && styles.cardAlto,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.cabecalho}>
          <Text style={[styles.titulo, { color: theme.text }]}>{titulo}</Text>
          {subtitulo ? (
            <Text style={[styles.subtitulo, { color: theme.muted }]}>{subtitulo}</Text>
          ) : null}
        </View>

        <ScrollView
          style={styles.corpo}
          contentContainerStyle={styles.corpoConteudo}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        {acoes && acoes.length > 0 ? (
          <View style={[styles.rodape, { borderTopColor: theme.border }]}>
            {acoes.map((acao) => {
              const fundo = acao.perigo
                ? theme.red
                : acao.primaria
                  ? theme.primary
                  : theme.cardSoft
              const borda = acao.perigo
                ? theme.red
                : acao.primaria
                  ? theme.primary
                  : theme.border
              const cor = acao.perigo || acao.primaria ? theme.textInverse : theme.text

              return (
                <PressableScale
                  key={acao.label}
                  onPress={acao.onPress}
                  disabled={acao.desabilitada}
                  style={[
                    styles.botao,
                    { backgroundColor: fundo, borderColor: borda, opacity: acao.desabilitada ? 0.5 : 1 },
                  ]}
                >
                  <Text style={[styles.botaoTexto, { color: cor }]} numberOfLines={1}>
                    {acao.label}
                  </Text>
                </PressableScale>
              )
            })}
          </View>
        ) : null}
      </View>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '88%',
    maxWidth: 440,
    maxHeight: '86%',
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  cardAlto: { height: '86%' },
  cabecalho: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 14 },
  titulo: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  subtitulo: { fontSize: 13, fontWeight: '500', lineHeight: 18, marginTop: 4 },
  corpo: { flexGrow: 0, flexShrink: 1 },
  corpoConteudo: { paddingHorizontal: 20, paddingBottom: 18 },
  rodape: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: 1,
  },
  botao: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  botaoTexto: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
})

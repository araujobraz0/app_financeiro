// Campo de formulario padrao dos modais.
//
// Centraliza rotulo, entrada, dica e erro para que todos os formularios do app
// coletem informacao do mesmo jeito, com o mesmo espacamento e os mesmos
// estados visuais.

import { forwardRef, type ReactNode } from 'react'
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native'

import type { Tema } from '../../app/types'

type Props = TextInputProps & {
  theme: Tema
  rotulo: string
  /** Texto de apoio abaixo do campo. */
  dica?: string
  erro?: string
  /** Elemento a direita, dentro da moldura (botao de calendario, sufixo). */
  sufixo?: ReactNode
  /** Cresce em altura, para observacoes. */
  multilinha?: boolean
}

const Campo = forwardRef<TextInput, Props>(function Campo(
  { theme, rotulo, dica, erro, sufixo, multilinha = false, style, ...rest },
  ref
) {
  const corBorda = erro ? theme.red : theme.border

  return (
    <View style={styles.wrap}>
      <Text style={[styles.rotulo, { color: theme.muted }]}>{rotulo}</Text>

      <View
        style={[
          styles.moldura,
          multilinha && styles.molduraAlta,
          { backgroundColor: theme.cardSoft, borderColor: corBorda },
        ]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={theme.faint}
          multiline={multilinha}
          style={[styles.input, multilinha && styles.inputAlto, { color: theme.text }, style]}
          {...rest}
        />
        {sufixo}
      </View>

      {erro ? (
        <Text style={[styles.mensagem, { color: theme.red }]}>{erro}</Text>
      ) : dica ? (
        <Text style={[styles.mensagem, { color: theme.faint }]}>{dica}</Text>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  rotulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 7,
  },
  moldura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  molduraAlta: { minHeight: 108, alignItems: 'flex-start', paddingVertical: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 0 },
  inputAlto: { minHeight: 84, textAlignVertical: 'top', paddingTop: 0 },
  mensagem: { fontSize: 11, fontWeight: '600', marginTop: 6 },
})

export default Campo

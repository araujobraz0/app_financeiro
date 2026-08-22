import { useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native'

import type { Tema } from '../app/types'
import Icon from './common/Icon'
import PressableScale from './common/motion/PressableScale'

type PdfPreviewProps = {
  uri: string
  theme: Tema
  /** Nome sugerido ao baixar. */
  nomeArquivo?: string
  style?: any
}

/**
 * Previa do PDF exportado.
 *
 * O <iframe> so exibe PDF em navegador de computador: Chrome no Android e
 * Safari no iOS nao tem visualizador embutido para quadro, e mostram uma area
 * em branco sem qualquer aviso — era esse o "nao da para visualizar".
 *
 * Entao a previa embutida fica so onde funciona, e no celular o componente
 * oferece as duas acoes que o navegador movel realmente sabe executar: abrir
 * o arquivo no visualizador do proprio sistema, ou baixar.
 */
export default function PdfPreview({ uri, theme, nomeArquivo = 'relatorio.pdf', style }: PdfPreviewProps) {
  const { width } = useWindowDimensions()
  const [falhou, setFalhou] = useState(false)

  // Telas estreitas e qualquer plataforma nativa nao embutem PDF.
  const podeEmbutir = Platform.OS === 'web' && width >= 820 && !falhou

  useEffect(() => {
    setFalhou(false)
  }, [uri])

  const abrir = () => {
    if (typeof window !== 'undefined') window.open(uri, '_blank')
  }

  const baixar = () => {
    if (typeof document === 'undefined') return
    const link = document.createElement('a')
    link.href = uri
    link.download = nomeArquivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (podeEmbutir) {
    return (
      <View style={[styles.wrap, style]}>
        {/* @ts-ignore - iframe e elemento web puro */}
        <iframe
          src={uri}
          onError={() => setFalhou(true)}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          title="Prévia do PDF"
        />
        <PressableScale onPress={abrir} style={[styles.flutuante, { backgroundColor: theme.overlay }]}>
          <Icon name="link" size={14} color="#FFFFFF" />
          <Text style={styles.flutuanteTexto}>Abrir</Text>
        </PressableScale>
      </View>
    )
  }

  return (
    <View style={[styles.wrap, styles.centro, { backgroundColor: theme.cardSoft }, style]}>
      <View style={[styles.folha, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.folhaTopo, { backgroundColor: theme.redSoft }]}>
          <Icon name="nota" size={26} color={theme.red} />
        </View>
        <View style={styles.folhaLinhas}>
          {[1, 0.85, 0.95, 0.6].map((largura, i) => (
            <View
              key={i}
              style={[styles.linhaFalsa, { width: `${largura * 100}%`, backgroundColor: theme.border }]}
            />
          ))}
        </View>
      </View>

      <Text style={[styles.titulo, { color: theme.text }]}>Relatório pronto</Text>
      <Text style={[styles.explicacao, { color: theme.muted }]}>
        O navegador do celular não exibe PDF aqui dentro. Abra no visualizador do seu aparelho ou
        baixe o arquivo.
      </Text>

      <View style={styles.acoes}>
        <PressableScale
          onPress={abrir}
          style={[styles.botao, { backgroundColor: theme.primary, borderColor: theme.primary }]}
        >
          <Icon name="link" size={16} color={theme.textInverse} />
          <Text style={[styles.botaoTexto, { color: theme.textInverse }]}>Abrir PDF</Text>
        </PressableScale>

        <PressableScale
          onPress={baixar}
          style={[styles.botao, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Icon name="seta_baixo" size={16} color={theme.text} />
          <Text style={[styles.botaoTexto, { color: theme.text }]}>Baixar</Text>
        </PressableScale>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', minHeight: 320, position: 'relative' },
  centro: { alignItems: 'center', justifyContent: 'center', padding: 22, gap: 4 },

  folha: {
    width: 92,
    height: 118,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  folhaTopo: { height: 54, alignItems: 'center', justifyContent: 'center' },
  folhaLinhas: { padding: 11, gap: 7 },
  linhaFalsa: { height: 5, borderRadius: 999 },

  titulo: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  explicacao: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    maxWidth: 300,
  },

  acoes: { flexDirection: 'row', gap: 10 },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
  },
  botaoTexto: { fontSize: 13, fontWeight: '800' },

  flutuante: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: 999,
  },
  flutuanteTexto: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
})

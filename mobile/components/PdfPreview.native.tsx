import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import * as Sharing from 'expo-sharing'

type PdfPreviewProps = {
  uri: string
  style?: any
}

/**
 * Previa de PDF no Android/iOS.
 *
 * O PdfView vem de um modulo nativo (@kishannareshpal/expo-pdf). Se ele nao
 * estiver presente no build instalado, o import falha ou o componente
 * renderiza um espaco vazio — sem erro visivel. Por isso carregamos o modulo
 * com guarda e sempre oferecemos o botao de abrir no visualizador do sistema.
 */

let PdfView: any = null
try {
  PdfView = require('@kishannareshpal/expo-pdf').PdfView
} catch {
  PdfView = null
}

export default function PdfPreview({ uri, style }: PdfPreviewProps) {
  const [falhou, setFalhou] = useState(false)

  const abrirNoSistema = async () => {
    try {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Abrir PDF',
        UTI: 'com.adobe.pdf',
      })
    } catch (error) {
      console.warn('[pdf] Não foi possível abrir o PDF no visualizador:', error)
    }
  }

  const podeRenderizar = !!PdfView && !falhou

  return (
    <View style={[styles.wrap, style]}>
      {podeRenderizar ? (
        <PdfView style={styles.pdf} uri={uri} onError={() => setFalhou(true)} />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            A prévia não está disponível neste build. Use o botão abaixo para abrir o arquivo.
          </Text>
        </View>
      )}

      <Pressable onPress={abrirNoSistema} style={styles.openBtn}>
        <Text style={styles.openBtnText}>Abrir PDF</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', minHeight: 320, position: 'relative' },
  pdf: { flex: 1, width: '100%' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  fallbackText: { fontSize: 13, fontWeight: '700', textAlign: 'center', color: '#64748b' },
  openBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 12,
    minHeight: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
  },
  openBtnText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
})

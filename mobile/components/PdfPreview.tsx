import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type PdfPreviewProps = {
  uri: string
  style?: any
}

/**
 * Previa de PDF na web.
 *
 * O iframe usa posicionamento absoluto para preencher o container. A versao
 * anterior aplicava height:100% direto no iframe e ignorava a prop `style`,
 * entao a altura colapsava para zero e a area ficava em branco sem aviso.
 */
export default function PdfPreview({ uri, style }: PdfPreviewProps) {
  const [falhou, setFalhou] = useState(false)

  const abrirEmNovaAba = () => {
    if (typeof window !== 'undefined') {
      window.open(uri, '_blank')
    }
  }

  return (
    <View style={[styles.wrap, style]}>
      {!falhou ? (
        // @ts-ignore - iframe é elemento web puro
        <iframe
          src={uri}
          onError={() => setFalhou(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title='Preview PDF'
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Não foi possível exibir o PDF aqui.</Text>
        </View>
      )}

      <Pressable onPress={abrirEmNovaAba} style={styles.openBtn}>
        <Text style={styles.openBtnText}>Abrir em nova aba</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', minHeight: 320, position: 'relative' },
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

import { PdfView } from '@kishannareshpal/expo-pdf'

export default function PdfPreview({ uri, style }: { uri: string; style: any }) {
  return <PdfView style={style} uri={uri} />
}

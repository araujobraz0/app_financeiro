export default function PdfPreview({ uri, style }: { uri: string; style: any }) {
  return (
    // @ts-ignore - iframe é elemento web puro
    <iframe src={uri} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview PDF" />
  )
}

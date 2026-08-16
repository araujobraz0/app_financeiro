import type { Tema } from '../../app/types'

type ImageCropModalProps = {
  visible: boolean
  imageUri: string | null
  theme: Tema
  onCancel: () => void
  onConfirm: (dataUrl: string) => void
}

// No app nativo (Android/iOS), o recorte de imagem já é feito pela galeria
// do próprio sistema (allowsEditing do expo-image-picker), então este
// componente não renderiza nada. As props existem apenas para manter a
// mesma assinatura da versão web — sem elas o TypeScript acusa erro no
// home.tsx, porque resolve o sufixo .native antes do .web.
export default function ImageCropModal(_props: ImageCropModalProps) {
  return null
}
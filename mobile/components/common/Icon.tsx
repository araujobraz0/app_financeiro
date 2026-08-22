// Icones do app.
//
// Antes o app desenhava acoes com caracteres de texto ("✎", "×", "＋", "☷").
// Eles herdam a fonte do sistema, entao mudavam de tamanho, peso e alinhamento
// vertical conforme a plataforma — e por isso pareciam tortos. Aqui os nomes
// semanticos viram glifos vetoriais, com metrica previsivel.

import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps } from 'react'

type IoniconName = ComponentProps<typeof Ionicons>['name']

/** Nome semantico -> glifo. Usar sempre o nome semantico nas telas. */
const GLYPHS = {
  editar: 'pencil',
  excluir: 'close',
  adicionar: 'add',
  filtrar: 'funnel',
  ordenar: 'funnel',
  confirmar: 'checkmark',
  copiar: 'copy-outline',
  link: 'link-outline',
  cartao: 'card',
  calendario: 'calendar-outline',
  configuracoes: 'settings-outline',
  seta_baixo: 'chevron-down',
  seta_cima: 'chevron-up',
  seta_direita: 'chevron-forward',
  seta_esquerda: 'chevron-back',
  olho: 'eye-outline',
  olho_fechado: 'eye-off-outline',
  alvo: 'flag-outline',
  carrinho: 'cart-outline',
  nota: 'document-text-outline',
  pix: 'flash-outline',
  grafico: 'pie-chart-outline',
  investir: 'trending-up',
  sair: 'log-out-outline',
  // Abas da barra inferior
  aba_home: 'home',
  aba_cartao: 'card',
  aba_fixo: 'repeat',
  aba_variavel: 'swap-horizontal',
  // Tema
  sol: 'sunny',
  lua: 'moon',
  busca: 'search',
  // Configuracoes
  camera: 'camera',
  premium: 'star',
  exportar: 'download-outline',
  importar: 'cloud-upload-outline',
  atualizar: 'refresh',
  backup: 'time-outline',
  planilha: 'grid-outline',
  documento: 'document-outline',
  abrir_link: 'open-outline',
  desfazer: 'arrow-undo-outline',
  refazer: 'arrow-redo-outline',
} satisfies Record<string, IoniconName>

export type IconName = keyof typeof GLYPHS

type Props = {
  name: IconName
  size?: number
  color: string
}

export default function Icon({ name, size = 18, color }: Props) {
  return <Ionicons name={GLYPHS[name]} size={size} color={color} />
}

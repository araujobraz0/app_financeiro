// Ponto único de importação do pacote de exportação.
// No home.tsx basta: import { buildPdfHtml, ... } from '../src/utils/export'

export { buildExportRows } from './rows'
export { buildExportWorkbook } from './workbook'
export { buildPdfHtml, escapeHtml, renderPdfRows } from './pdf'
export { montarNomeArquivoExportacao, normalizarNomeMesArquivo } from './types'
export type {
  ExportCategoria,
  ExportData,
  ExportParcela,
  ExportResumo,
} from './types'

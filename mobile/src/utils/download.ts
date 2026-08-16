/**
 * Download e leitura de arquivos no navegador.
 *
 * Substitui o par expo-file-system + expo-sharing, que dependia de APIs
 * nativas: na web o cacheDirectory e nulo e o compartilhamento nao existe,
 * entao exportar CSV e Excel simplesmente falhava.
 */

/** Dispara o download de um Blob com o nome informado. */
export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob)
  baixarUrl(url, nomeArquivo)
  // Da tempo do navegador iniciar o download antes de liberar a URL.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/** Dispara o download de uma URL ja existente (blob: ou http:). */
export function baixarUrl(url: string, nomeArquivo: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** CSV com BOM, para o Excel em portugues abrir os acentos corretamente. */
export function baixarCsv(conteudo: string, nomeArquivo: string) {
  const blob = new Blob(['\ufeff', conteudo], { type: 'text/csv;charset=utf-8;' })
  baixarBlob(blob, nomeArquivo)
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function baixarXlsx(dados: ArrayBuffer, nomeArquivo: string) {
  baixarBlob(new Blob([dados], { type: MIME_XLSX }), nomeArquivo)
}

/**
 * Abre o seletor de arquivos do navegador.
 * Resolve com null se o usuario fechar sem escolher nada.
 */
export function escolherArquivo(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'

    let resolvido = false
    const finalizar = (arquivo: File | null) => {
      if (resolvido) return
      resolvido = true
      if (input.parentNode) document.body.removeChild(input)
      resolve(arquivo)
    }

    input.onchange = () => finalizar(input.files?.[0] ?? null)

    // Nem todo navegador dispara 'cancel'; o focus serve de rede de
    // seguranca para nao deixar a Promise pendurada para sempre.
    input.oncancel = () => finalizar(null)
    window.addEventListener(
      'focus',
      () => setTimeout(() => finalizar(input.files?.[0] ?? null), 400),
      { once: true }
    )

    document.body.appendChild(input)
    input.click()
  })
}

export function lerArquivoComoTexto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(arquivo)
  })
}

export function lerArquivoComoArrayBuffer(arquivo: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(arquivo)
  })
}

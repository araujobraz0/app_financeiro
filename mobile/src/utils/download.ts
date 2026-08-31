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
 *
 * `accept` vazio nao filtra nada, e e assim que a importacao chama. O filtro
 * parecia inofensivo e nao era: extensao que o sistema nao conhece — .ofx e o
 * caso — some da janela ou aparece apagada, entao o arquivo do banco ficava
 * impossivel de escolher. Quem decide se o arquivo serve e o leitor, que olha
 * o conteudo e explica na previa quando nao reconhece.
 */
export function escolherArquivo(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    input.style.display = 'none'

    let resolvido = false
    const finalizar = (arquivo: File | null) => {
      if (resolvido) return
      resolvido = true
      window.removeEventListener('focus', aoVoltarOFoco)
      window.removeEventListener('blur', aoPerderOFoco)
      document.removeEventListener('visibilitychange', aoTrocarDeTela)
      if (input.parentNode) document.body.removeChild(input)
      resolve(arquivo)
    }

    input.onchange = () => finalizar(input.files?.[0] ?? null)
    input.oncancel = () => finalizar(null)

    /**
     * A rede de seguranca para o navegador que nao dispara 'cancel'.
     *
     * Ela so pode agir DEPOIS que a janela perdeu o foco para a janela de
     * arquivos. Sem essa trava, um 'focus' que chegasse antes — a propria
     * pagina voltando a si — resolvia null com a janela ainda aberta: a
     * pessoa escolhia o arquivo e nada acontecia, como se o app nao
     * deixasse selecionar.
     */
    let janelaAbriu = false
    const aoPerderOFoco = () => {
      janelaAbriu = true
    }
    const aoTrocarDeTela = () => {
      // No celular a janela de arquivos e outra tela, e nem sempre ha 'blur'.
      if (document.visibilityState === 'hidden') janelaAbriu = true
    }

    const aoVoltarOFoco = () => {
      if (!janelaAbriu) return
      // O 'change' costuma chegar depois do 'focus'. Duas chances antes de
      // desistir, porque com arquivo grande o navegador demora a preencher.
      setTimeout(() => {
        if (input.files?.length) return finalizar(input.files[0])
        setTimeout(() => finalizar(input.files?.[0] ?? null), 1500)
      }, 600)
    }

    window.addEventListener('blur', aoPerderOFoco)
    window.addEventListener('focus', aoVoltarOFoco)
    document.addEventListener('visibilitychange', aoTrocarDeTela)

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

import html2pdf from 'html2pdf.js'

// A4 em 96dpi. Sem uma largura explicita o container fica com largura zero
// fora da tela, e o html2canvas captura uma area vazia — PDF em branco.
const LARGURA_A4_PX = 794

// Equivale ao @page { margin: 26mm 16mm 24mm } do HTML. O html2canvas
// ignora @page, entao a margem precisa ser informada aqui.
const MARGEM_MM: [number, number, number, number] = [26, 16, 24, 16]

/**
 * Separa o CSS e o conteudo do corpo do documento.
 *
 * Motivo: atribuir um documento HTML completo ao innerHTML de uma <div>
 * faz o navegador descartar as tags <html>, <head> e <body>. Dependendo do
 * navegador o <style> vai junto, e o relatorio sai sem estilo nenhum.
 * Extraindo as duas partes e remontando, o resultado e previsivel.
 */
function separarHtml(html: string) {
  const estilos = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1])
    .join('\n')

  const corpo = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]

  return {
    estilos,
    corpo: corpo ?? html,
  }
}

/** Espera o layout assentar antes de capturar. */
function aguardarLayout() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

/**
 * Gera o PDF no navegador e devolve uma URL de blob para preview/download.
 */
export async function gerarArquivoPdfWeb(html: string): Promise<string> {
  const { estilos, corpo } = separarHtml(html)

  const container = document.createElement('div')
  container.innerHTML = `<style>${estilos}</style><div class="pdf-root">${corpo}</div>`

  // Fica fora da area visivel, mas continua participando do layout — e por
  // isso que usamos left negativo em vez de display:none ou visibility.
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '-10000px'
  container.style.width = `${LARGURA_A4_PX}px`
  container.style.backgroundColor = '#ffffff'

  document.body.appendChild(container)

  try {
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      await (document as any).fonts.ready
    }
    await aguardarLayout()

    const blob: Blob = await html2pdf()
      .set({
        margin: MARGEM_MM,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: LARGURA_A4_PX,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container)
      .outputPdf('blob')

    return URL.createObjectURL(blob)
  } finally {
    // No finally para que o container nao fique preso na pagina se a
    // geracao falhar no meio.
    if (container.parentNode) {
      document.body.removeChild(container)
    }
  }
}

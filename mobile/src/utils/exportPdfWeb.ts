import html2pdf from 'html2pdf.js'

export async function gerarArquivoPdfWeb(html: string): Promise<string> {
  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  document.body.appendChild(container)

  const blob: Blob = await html2pdf().from(container).outputPdf('blob')
  document.body.removeChild(container)

  return URL.createObjectURL(blob)
}

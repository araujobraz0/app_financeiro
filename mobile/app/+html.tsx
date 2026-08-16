import { ScrollViewStyleReset } from 'expo-router/html'
import { type PropsWithChildren } from 'react'

// Este arquivo só é usado no build web. Ele define o HTML raiz da página
// e evita que a página inteira role junto com o conteúdo do app
// (o app já controla sua própria rolagem internamente).
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang='pt-BR'>
      <head>
        <meta charSet='utf-8' />
        <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
        <meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no' />

        {/* Remove o comportamento padrão de rolagem do navegador para
            que apenas as áreas de rolagem internas do app funcionem. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: rootStyle }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

const rootStyle = `
  html, body, #root {
    height: 100%;
  }
  #root {
    display: flex;
  }
`

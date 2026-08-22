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

  /* Navegadores moveis aproximam a tela ao focar um campo cuja fonte seja
     menor que 16px. O maximum-scale=1 do viewport nao resolve: o Safari o
     ignora desde o iOS 10, por acessibilidade. Garantir 16px no proprio
     campo e o unico jeito confiavel de evitar o zoom.
     O !important e necessario porque o React Native Web aplica os estilos
     inline, e so uma regra de folha com !important os sobrepoe. */
  @media (pointer: coarse) {
    input,
    textarea,
    select {
      font-size: 16px !important;
    }
  }

  /* Tira o realce azul de toque padrao do navegador, que aparecia por cima
     do feedback proprio do app. */
  * {
    -webkit-tap-highlight-color: transparent;
  }
`

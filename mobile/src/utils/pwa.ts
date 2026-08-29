// O que faz o Brazllet virar aplicativo na tela inicial.
//
// Sao tres coisas: o manifesto (icone e nome para a tela inicial, abertura em
// tela cheia sem a barra de endereco), as cores da barra do sistema, e o
// service worker, que faz o site continuar abrindo quando a internet cai.
// Antes disso, sem sinal, batia-se numa tela branca do navegador — mesmo com
// todos os dados do mes ja gravados no aparelho.
//
// Tudo e injetado em tempo de execucao, como os ajustes de CSS ao lado, e
// pelo mesmo motivo: o `app/+html.tsx` e descartado na geracao do index.html
// enquanto o export roda em modo SPA. Tentar o modo 'static', que o usaria, o
// build quebra ao empacotar o jspdf para Node.
//
// O manifesto, o service worker e os icones sao arquivos estaticos em
// `public/`, copiados para a raiz do site pelo proprio Expo.

import { Platform } from 'react-native'

/** Cria a tag so se ela ainda nao existe, para nao duplicar em hot reload. */
function garantirTag(seletor: string, criar: () => HTMLElement) {
  if (document.head.querySelector(seletor)) return
  document.head.appendChild(criar())
}

function link(rel: string, href: string, extras?: Record<string, string>) {
  const el = document.createElement('link')
  el.rel = rel
  el.href = href
  for (const [chave, valor] of Object.entries(extras || {})) el.setAttribute(chave, valor)
  return el
}

function meta(name: string, content: string, media?: string) {
  const el = document.createElement('meta')
  el.setAttribute('name', name)
  el.setAttribute('content', content)
  if (media) el.setAttribute('media', media)
  return el
}

export function prepararPwa() {
  if (Platform.OS !== 'web') return
  if (typeof document === 'undefined') return

  // O idioma da pagina: o template padrao do Expo escreve lang="en".
  document.documentElement.lang = 'pt-BR'

  garantirTag('link[rel="manifest"]', () => link('manifest', '/manifest.json'))

  // A barra do sistema acompanha o tema do aparelho.
  garantirTag('meta[name="theme-color"][media*="light"]', () =>
    meta('theme-color', '#F8F7F2', '(prefers-color-scheme: light)')
  )
  garantirTag('meta[name="theme-color"][media*="dark"]', () =>
    meta('theme-color', '#0A100D', '(prefers-color-scheme: dark)')
  )

  // O iOS ignora o manifesto e le estas. Sem elas o atalho salvo na tela
  // inicial abre dentro do Safari, com barra de endereco e tudo.
  garantirTag('meta[name="apple-mobile-web-app-capable"]', () =>
    meta('apple-mobile-web-app-capable', 'yes')
  )
  garantirTag('meta[name="apple-mobile-web-app-status-bar-style"]', () =>
    meta('apple-mobile-web-app-status-bar-style', 'default')
  )
  garantirTag('meta[name="apple-mobile-web-app-title"]', () =>
    meta('apple-mobile-web-app-title', 'Brazllet')
  )
  garantirTag('link[rel="apple-touch-icon"]', () =>
    link('apple-touch-icon', '/icones/apple-180.png')
  )

  garantirTag('meta[name="description"]', () =>
    meta(
      'description',
      'Sua wallet sob controle: salário, gastos fixos, cartões e categorias no mesmo lugar.'
    )
  )

  registrarServiceWorker()
}

/**
 * Registra o service worker depois que a pagina termina de carregar.
 *
 * Registrar durante o carregamento disputa banda com o proprio app, e a
 * primeira abertura e justamente a que nao pode ficar lenta. Falha em
 * silencio: sem service worker o site continua funcionando, so perde a parte
 * de abrir sem internet.
 */
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  const registrar = () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Modo anonimo, http sem TLS, permissao negada: nada a fazer.
    })
  }

  if (document.readyState === 'complete') registrar()
  else window.addEventListener('load', registrar, { once: true })
}

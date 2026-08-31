// Service worker do Brazllet.
//
// Serve para duas coisas: deixar o site abrir da tela inicial como aplicativo
// e continuar abrindo quando a internet cai. Antes disso, sem sinal, a pessoa
// batia numa tela branca do navegador — mesmo com todos os dados do mes ja
// gravados no aparelho.
//
// A versao anterior guardava a casca (o index.html) e mais nada util: o
// JavaScript do app so entrava no cache se fosse pedido DEPOIS que o service
// worker assumisse a pagina, e ele assume no fim do primeiro carregamento —
// quando o JavaScript ja tinha sido baixado. Resultado: a casca abria sem
// internet e ficava numa tela branca, porque o app em si nao estava guardado.
//
// Agora a instalacao le o proprio index.html, tira dali os endereços dos
// arquivos que ele carrega e guarda todos. E a pagina, depois de carregar,
// manda a lista do que realmente usou (fontes, pedacos carregados sob demanda)
// para o service worker guardar tambem.
//
// A estrategia de resposta muda conforme o pedido, e a diferenca importa:
//
//   - Os arquivos de codigo tem o hash do conteudo no nome (/_expo/static/...).
//     Um nome nunca aponta para dois conteudos, entao guardar para sempre e
//     seguro e nao ha como servir versao velha.
//
//   - A navegacao vai na rede primeiro. E ela que traz a versao nova depois de
//     um deploy; o cache so entra quando a rede falha. Ao contrario, um deploy
//     novo levaria dias para chegar em quem ja tinha o site aberto — o defeito
//     classico de service worker mal ajustado.
//
//   - Nada do Supabase e guardado. Sao os dados da conta: servir uma copia
//     velha faria o app mostrar saldo errado, que e pior do que nao abrir.

const VERSAO = 'brazllet-v2'
const CASCA = `${VERSAO}-casca`
const ESTATICOS = `${VERSAO}-estaticos`

/** O que existe independente do build. */
const FIXOS = ['/', '/index.html', '/manifest.json', '/icones/icone-192.png']

/**
 * Os arquivos que o index.html carrega.
 *
 * O nome deles muda a cada build (tem o hash do conteudo), entao nao da para
 * escrever aqui uma lista fixa: ela envelheceria no primeiro deploy. Ler o
 * HTML e tirar os endereços de dentro dele funciona em qualquer build.
 */
async function arquivosDoIndex() {
  try {
    const resposta = await fetch('/index.html', { cache: 'reload' })
    if (!resposta.ok) return []

    const html = await resposta.text()
    const achados = html.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)

    return Array.from(achados, (achado) => achado[1]).filter(
      (endereco) => endereco.startsWith('/') && !endereco.startsWith('//')
    )
  } catch {
    return []
  }
}

/** Guarda um por um: um endereco que falhe nao derruba os outros. */
async function guardarTodos(nomeDoCache, enderecos) {
  const cache = await caches.open(nomeDoCache)

  await Promise.all(
    enderecos.map(async (endereco) => {
      try {
        const resposta = await fetch(endereco, { cache: 'reload' })
        if (resposta.ok) await cache.put(endereco, resposta)
      } catch {
        // Sem rede ou arquivo que nao existe neste build: seguir.
      }
    })
  )
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const doIndex = await arquivosDoIndex()
      await guardarTodos(CASCA, FIXOS)
      await guardarTodos(ESTATICOS, doIndex)
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          // Some tudo que nao e desta versao: e o que evita cache velho
          // sobrevivendo a uma troca de estrategia.
          chaves.filter((chave) => !chave.startsWith(VERSAO)).map((chave) => caches.delete(chave))
        )
      )
      .then(() => self.clients.claim())
  )
})

/**
 * A pagina conta o que carregou, e o que ainda nao esta guardado entra.
 *
 * Cobre o que o index.html nao lista: as fontes dos icones e os pedacos de
 * codigo carregados sob demanda. Sem isto, eles so entravam no cache na
 * segunda visita, e a primeira visita seguida de queda de internet dava tela
 * branca.
 */
self.addEventListener('message', (evento) => {
  const dados = evento.data
  if (!dados || dados.tipo !== 'guardar-o-que-usei' || !Array.isArray(dados.enderecos)) return

  evento.waitUntil(
    (async () => {
      const cache = await caches.open(ESTATICOS)

      await Promise.all(
        dados.enderecos.slice(0, 120).map(async (endereco) => {
          try {
            if (await cache.match(endereco)) return
            const resposta = await fetch(endereco)
            if (resposta.ok && resposta.status === 200) await cache.put(endereco, resposta)
          } catch {
            // Nada a fazer: e so um aquecimento de cache.
          }
        })
      )
    })()
  )
})

/** Guarda uma copia sem deixar o erro de escrita derrubar a resposta. */
async function guardar(nomeDoCache, pedido, resposta) {
  try {
    const cache = await caches.open(nomeDoCache)
    await cache.put(pedido, resposta)
  } catch {
    // Cota cheia ou modo anonimo: seguir sem cache e melhor que falhar.
  }
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  if (pedido.method !== 'GET') return

  let url
  try {
    url = new URL(pedido.url)
  } catch {
    return
  }

  // Outro dominio — Supabase, Mercado Pago — passa direto.
  if (url.origin !== self.location.origin) return

  // Navegacao: rede primeiro, cache como rede de seguranca.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          guardar(CASCA, '/index.html', resposta.clone())
          return resposta
        })
        .catch(async () => {
          const guardado = (await caches.match('/index.html')) || (await caches.match('/'))
          return (
            guardado ||
            new Response('<h1>Sem conexão</h1><p>Abra de novo quando a internet voltar.</p>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 503,
            })
          )
        })
    )
    return
  }

  // Arquivo com hash no nome: se ja esta guardado, e o certo.
  evento.respondWith(
    caches.match(pedido).then((guardado) => {
      if (guardado) return guardado

      return fetch(pedido).then((resposta) => {
        // Resposta parcial ou de erro nao serve de cache.
        if (resposta.ok && resposta.status === 200) {
          guardar(ESTATICOS, pedido, resposta.clone())
        }
        return resposta
      })
    })
  )
})

// Service worker do Brazllet.
//
// Serve para duas coisas: deixar o site abrir da tela inicial como aplicativo
// e continuar abrindo quando a internet cai. Antes disso, sem sinal, a pessoa
// batia numa tela branca do navegador — mesmo com todos os dados do mes ja
// gravados no aparelho.
//
// A estrategia muda conforme o pedido, e a diferenca importa:
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

const VERSAO = 'brazllet-v1'
const CASCA = `${VERSAO}-casca`
const ESTATICOS = `${VERSAO}-estaticos`

/** O minimo para a primeira tela existir sem rede. */
const ESSENCIAIS = ['/', '/index.html', '/manifest.json', '/icones/icone-192.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CASCA)
      .then((cache) => cache.addAll(ESSENCIAIS))
      // Um essencial que falhe nao pode impedir a instalacao inteira.
      .catch(() => undefined)
      .then(() => self.skipWaiting())
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
          const guardado = await caches.match('/index.html')
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

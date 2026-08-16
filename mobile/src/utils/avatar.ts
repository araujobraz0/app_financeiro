import { supabase } from '../lib/supabase'

const BUCKET = 'avatars'

/** Converte base64 em bytes. */
function base64ParaBytes(base64: string): Uint8Array {
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i)
  }
  return bytes
}

/**
 * Sobe a foto de perfil e devolve a URL publica.
 *
 * Antes o app guardava apenas o caminho local do arquivo, que so existia
 * naquela instalacao — a foto sumia ao reinstalar ou trocar de dispositivo.
 * Agora o arquivo vai para o Storage e fica salva uma URL que funciona em
 * qualquer lugar.
 *
 * @param userId  Id do usuario autenticado (define a pasta no bucket)
 * @param uri     data:image/... vindo do recorte, ou uma URL de blob
 */
export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  if (!userId) throw new Error('Usuário não identificado para enviar a foto.')

  const ehDataUrl = uri.startsWith('data:')

  const contentType = ehDataUrl
    ? uri.slice(5, uri.indexOf(';')) || 'image/jpeg'
    : 'image/jpeg'

  const corpo: Uint8Array | Blob = ehDataUrl
    ? base64ParaBytes(uri.split(',')[1] || '')
    : await (await fetch(uri)).blob()

  // A policy do bucket exige que a primeira pasta seja o id do usuario.
  // O upsert evita acumular arquivos antigos.
  const caminho = `${userId}/avatar`

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, corpo, {
    contentType,
    upsert: true,
  })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho)

  // O caminho e sempre o mesmo, entao sem este parametro o navegador
  // continuaria mostrando a imagem antiga em cache.
  return `${data.publicUrl}?v=${Date.now()}`
}

/** Remove a foto de perfil do Storage. */
export async function removerAvatar(userId: string): Promise<void> {
  if (!userId) return
  await supabase.storage.from(BUCKET).remove([`${userId}/avatar`])
}

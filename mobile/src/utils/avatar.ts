import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '../lib/supabase'

const BUCKET = 'avatars'

/**
 * Converte uma string base64 em bytes.
 * O cliente do Supabase aceita Uint8Array direto no upload, o que evita
 * depender de Blob a partir de file:// (que se comporta de forma
 * inconsistente no React Native).
 */
function base64ParaBytes(base64: string): Uint8Array {
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i)
  }
  return bytes
}

function tipoPorExtensao(uri: string): string {
  const ext = (uri.split('?')[0].split('.').pop() || '').toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

/**
 * Sobe a foto de perfil e devolve a URL publica.
 *
 * Antes o app guardava apenas o caminho local (file:///.../files/foo.jpg).
 * Esse caminho so existe naquela instalacao, entao a foto sumia ao
 * reinstalar o app, trocar de aparelho ou abrir na web. Agora o arquivo
 * vai para o Storage e o que fica salvo e uma URL que funciona em
 * qualquer lugar.
 *
 * @param userId  Id do usuario autenticado (define a pasta no bucket)
 * @param uri     file:// no nativo, ou data:image/... na web
 */
export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  if (!userId) throw new Error('Usuário não identificado para enviar a foto.')

  const ehDataUrl = uri.startsWith('data:')
  const contentType = ehDataUrl
    ? uri.slice(5, uri.indexOf(';')) || 'image/jpeg'
    : tipoPorExtensao(uri)

  let corpo: Uint8Array | Blob

  if (ehDataUrl) {
    // Web: o recorte devolve um data URL, ja em base64.
    corpo = base64ParaBytes(uri.split(',')[1] || '')
  } else if (Platform.OS === 'web') {
    const resposta = await fetch(uri)
    corpo = await resposta.blob()
  } else {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
    corpo = base64ParaBytes(base64)
  }

  // Caminho fixo por usuario: a policy do bucket exige que a primeira pasta
  // seja o id do usuario, e o upsert evita acumular arquivos antigos.
  const caminho = `${userId}/avatar`

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, corpo, {
    contentType,
    upsert: true,
  })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho)

  // O caminho e sempre o mesmo, entao sem este parametro o app continuaria
  // mostrando a imagem antiga que ficou em cache.
  return `${data.publicUrl}?v=${Date.now()}`
}

/**
 * Remove a foto de perfil do Storage.
 */
export async function removerAvatar(userId: string): Promise<void> {
  if (!userId) return
  await supabase.storage.from(BUCKET).remove([`${userId}/avatar`])
}

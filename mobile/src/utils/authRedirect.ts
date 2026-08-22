// URL de retorno dos fluxos de autenticacao.
//
// Na web o destino precisa ser a origem real do site (o dominio da Vercel,
// localhost em desenvolvimento). Passando isso explicitamente, o Supabase nao
// cai no "Site URL" do painel quando decide para onde voltar — que era o que
// mandava o usuario para a landing page depois do login com Google.
//
// No nativo continua valendo o scheme do app (brazllet://).

import { makeRedirectUri } from 'expo-auth-session'
import { Platform } from 'react-native'

export const APP_SCHEME = 'brazllet'

export function buildAuthRedirectUri(path: string): string {
  const cleanPath = path.replace(/^\/+/, '')

  if (Platform.OS === 'web') {
    // `window` existe na web, mas a checagem protege renderizacao estatica.
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : ''

    return origin ? `${origin}/${cleanPath}` : `/${cleanPath}`
  }

  return makeRedirectUri({ scheme: APP_SCHEME, path: cleanPath })
}

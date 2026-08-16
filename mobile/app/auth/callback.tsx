import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import * as Linking from 'expo-linking'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

type AuthParams = {
  accessToken: string | null
  refreshToken: string | null
  code: string | null
}

const extrairAuthParams = (rawUrl: string): AuthParams => {
  const [basePart, hashPart = ''] = rawUrl.split('#')
  const queryPart = basePart.includes('?') ? basePart.split('?')[1] : ''
  const params = new URLSearchParams([queryPart, hashPart].filter(Boolean).join('&'))

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    code: params.get('code'),
  }
}

async function aplicarSessaoViaUrl(rawUrl: string) {
  const { accessToken, refreshToken, code } = extrairAuthParams(rawUrl)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return true
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error) throw error
    return true
  }

  return false
}

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ authUrl?: string }>()
  const [mensagem, setMensagem] = useState('Validando seu acesso com segurança...')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    const finalizarLogin = async () => {
      try {
        setErro('')
        setMensagem('Validando seu acesso com segurança...')

        const initialUrl = await Linking.getInitialURL()
        const authUrlParam = typeof params.authUrl === 'string' ? params.authUrl : ''
        const urlsCandidatas = [authUrlParam, initialUrl].filter(Boolean) as string[]

        let sessaoAplicada = false

        for (const rawUrl of urlsCandidatas) {
          try {
            sessaoAplicada = await aplicarSessaoViaUrl(rawUrl)
            if (sessaoAplicada) break
          } catch (error) {
            console.warn('[login] Falha ao aplicar sessão via URL de callback:', error)
            sessaoAplicada = false
          }
        }

        if (!sessaoAplicada) {
          const {
            data: { session },
          } = await supabase.auth.getSession()

          if (!session?.user) {
            throw new Error('Não foi possível concluir o login com Google.')
          }
        }

        if (!ativo) return

        setMensagem('Login concluído. Entrando no app...')
        setTimeout(() => {
          router.replace('/home')
        }, 250)
      } catch (error: any) {
        if (!ativo) return
        setErro(error?.message || 'Não foi possível concluir o login agora.')
        setMensagem('Redirecionando para o login...')
        setTimeout(() => {
          router.replace('/login')
        }, 1200)
      }
    }

    finalizarLogin()

    const subscription = Linking.addEventListener('url', async ({ url }) => {
      try {
        await aplicarSessaoViaUrl(url)
        if (!ativo) return
        router.replace('/home')
      } catch (error) {
        console.warn('[login] Falha ao aplicar sessão recebida via deep link:', error)
      }
    })

    return () => {
      ativo = false
      subscription.remove()
    }
  }, [params.authUrl])

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require('../../assets/images/icon-removebg.png')}
            style={styles.logo}
            resizeMode='contain'
          />

          <Text style={styles.brand}>
            <Text style={styles.brandGreen}>Braz</Text>
            <Text style={styles.brandGold}>llet</Text>
          </Text>

          <Text style={styles.tagline}>Sua wallet sob controle</Text>
        </View>

        <View style={styles.card}>
          <ActivityIndicator size='large' color='#173927' />
          <Text style={styles.title}>Autenticando</Text>
          <Text style={styles.subtitle}>{mensagem}</Text>
          {!!erro && <Text style={styles.errorText}>{erro}</Text>}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef2ec',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    width: 96,
    height: 96,
  },
  brand: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: -2,
  },
  brandGreen: {
    color: '#1f4f37',
  },
  brandGold: {
    color: '#b79039',
  },
  tagline: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: '#b79039',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: '#d9e2d8',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    alignItems: 'center',
  },
  title: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: '900',
    color: '#173927',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#6a7c6e',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: '#dc2626',
    textAlign: 'center',
  },
})

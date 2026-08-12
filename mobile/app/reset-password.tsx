import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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

async function prepararSessaoRecuperacao(rawUrl: string) {
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

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets()

  const scrollRef = useRef<ScrollView>(null)
  const senhaRef = useRef<TextInput>(null)
  const confirmarSenhaRef = useRef<TextInput>(null)

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [validandoSessao, setValidandoSessao] = useState(true)
  const [sessaoPronta, setSessaoPronta] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [keyboardAberto, setKeyboardAberto] = useState(false)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSub = Keyboard.addListener(showEvent as any, () => {
      setKeyboardAberto(true)
    })

    const hideSub = Keyboard.addListener(hideEvent as any, () => {
      setKeyboardAberto(false)
      senhaRef.current?.blur()
      confirmarSenhaRef.current?.blur()

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false })
      })
    })

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  useEffect(() => {
    let ativo = true

    const validarSessao = async () => {
      try {
        setErro('')
        setValidandoSessao(true)
        setSessaoPronta(false)

        const initialUrl = await Linking.getInitialURL()
        if (initialUrl) {
          try {
            await prepararSessaoRecuperacao(initialUrl)
          } catch {}
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!ativo) return

        if (!session?.user) {
          setErro('Link de redefinição inválido ou expirado. Solicite um novo e-mail de recuperação.')
          setSessaoPronta(false)
          return
        }

        setSessaoPronta(true)
      } catch (error: any) {
        if (!ativo) return
        setErro(error?.message || 'Não foi possível validar sua sessão de redefinição.')
        setSessaoPronta(false)
      } finally {
        if (ativo) setValidandoSessao(false)
      }
    }

    validarSessao()

    const subscription = Linking.addEventListener('url', async ({ url }) => {
      try {
        await prepararSessaoRecuperacao(url)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!ativo) return
        setSessaoPronta(!!session?.user)
        if (session?.user) setErro('')
      } catch (error: any) {
        if (!ativo) return
        setSessaoPronta(false)
        setErro(error?.message || 'Não foi possível validar o link de redefinição.')
      } finally {
        if (ativo) setValidandoSessao(false)
      }
    })

    return () => {
      ativo = false
      subscription.remove()
    }
  }, [])

  const fecharTecladoETirarFoco = () => {
    senhaRef.current?.blur()
    confirmarSenhaRef.current?.blur()
    Keyboard.dismiss()

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    })
  }

  const atualizarSenha = async () => {
    setErro('')
    setMensagem('')

    if (!sessaoPronta) {
      setErro('Sua sessão de recuperação ainda não está pronta. Abra novamente o link enviado para seu e-mail.')
      return
    }

    if (!novaSenha.trim() || !confirmarSenha.trim()) {
      setErro('Preencha os dois campos.')
      return
    }

    if (novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    try {
      setCarregando(true)

      const { error } = await supabase.auth.updateUser({
        password: novaSenha,
      })

      if (error) {
        setErro(error.message)
        return
      }

      setMensagem('Senha atualizada com sucesso.')

      setTimeout(() => {
        Alert.alert('Senha alterada', 'Agora você já pode entrar com sua nova senha.')
        router.replace('/login')
      }, 500)
    } finally {
      setCarregando(false)
    }
  }

  const scrollBottom = keyboardAberto
    ? Math.max(insets.bottom, 16) + 28
    : Math.max(insets.bottom, 16)

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={fecharTecladoETirarFoco}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 14 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: scrollBottom },
            ]}
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode='never'
            scrollEnabled={keyboardAberto}
          >
            <View style={styles.contentInner}>
              <View style={styles.hero}>
                <View style={styles.logoWrap}>
                  <Image
                    source={require('../assets/images/icon-removebg.png')}
                    style={styles.logo}
                    resizeMode='contain'
                  />
                </View>

                <Text style={styles.brand}>
                  <Text style={styles.brandGreen}>Braz</Text>
                  <Text style={styles.brandGold}>llet</Text>
                </Text>

                <Text style={styles.tagline}>Sua wallet sob controle</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.title}>Nova senha</Text>
                  <Text style={styles.subtitle}>
                    Defina uma nova senha para voltar ao app.
                  </Text>
                </View>

                <View style={styles.form}>
                  {validandoSessao ? (
                    <View style={styles.sessionLoadingBox}>
                      <ActivityIndicator color='#173927' />
                      <Text style={styles.sessionLoadingText}>Validando link seguro...</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.field}>
                        <Text style={styles.label}>Nova senha</Text>
                        <View style={styles.passwordWrap}>
                          <TextInput
                            ref={senhaRef}
                            value={novaSenha}
                            onChangeText={setNovaSenha}
                            placeholder='Digite a nova senha'
                            placeholderTextColor='#8ca08d'
                            secureTextEntry={!mostrarSenha}
                            autoCapitalize='none'
                            style={[styles.input, styles.passwordInput]}
                            returnKeyType='next'
                            editable={sessaoPronta && !carregando}
                            onFocus={() => {
                              setTimeout(() => {
                                scrollRef.current?.scrollTo({ y: 160, animated: true })
                              }, 120)
                            }}
                          />
                          <Pressable
                            style={styles.toggleButton}
                            onPress={() => setMostrarSenha((prev) => !prev)}
                            disabled={!sessaoPronta}
                          >
                            <Text style={styles.toggleButtonText}>
                              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.label}>Confirmar senha</Text>
                        <View style={styles.passwordWrap}>
                          <TextInput
                            ref={confirmarSenhaRef}
                            value={confirmarSenha}
                            onChangeText={setConfirmarSenha}
                            placeholder='Repita a nova senha'
                            placeholderTextColor='#8ca08d'
                            secureTextEntry={!mostrarConfirmarSenha}
                            autoCapitalize='none'
                            style={[styles.input, styles.passwordInput]}
                            returnKeyType='done'
                            editable={sessaoPronta && !carregando}
                            onFocus={() => {
                              setTimeout(() => {
                                scrollRef.current?.scrollTo({ y: 220, animated: true })
                              }, 120)
                            }}
                          />
                          <Pressable
                            style={styles.toggleButton}
                            onPress={() => setMostrarConfirmarSenha((prev) => !prev)}
                            disabled={!sessaoPronta}
                          >
                            <Text style={styles.toggleButtonText}>
                              {mostrarConfirmarSenha ? 'Ocultar' : 'Mostrar'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </>
                  )}

                  {!!erro && <Text style={[styles.feedback, styles.feedbackError]}>{erro}</Text>}
                  {!!mensagem && (
                    <Text style={[styles.feedback, styles.feedbackSuccess]}>{mensagem}</Text>
                  )}

                  <Pressable
                    style={[
                      styles.submitButton,
                      (carregando || validandoSessao || !sessaoPronta) && styles.submitButtonDisabled,
                    ]}
                    onPress={atualizarSenha}
                    disabled={carregando || validandoSessao || !sessaoPronta}
                  >
                    {carregando ? (
                      <ActivityIndicator color='#ffffff' />
                    ) : (
                      <Text style={styles.submitButtonText}>Salvar nova senha</Text>
                    )}
                  </Pressable>

                  <Pressable style={styles.linkButton} onPress={() => router.replace('/login')}>
                    <Text style={styles.linkButtonText}>Voltar para login</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef2ec',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  contentInner: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
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
    padding: 18,
    borderWidth: 1,
    borderColor: '#d9e2d8',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#173927',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6a7c6e',
    textAlign: 'center',
  },
  form: {
    gap: 10,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#617264',
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d4ddd2',
    backgroundColor: '#fbfcfa',
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#173927',
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 104,
  },
  toggleButton: {
    position: 'absolute',
    right: 10,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e7df',
    backgroundColor: '#f5f7f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#173927',
  },
  sessionLoadingBox: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9e2d8',
    backgroundColor: '#f7faf7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sessionLoadingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#173927',
  },
  feedback: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  feedbackError: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    color: '#dc2626',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.18)',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    color: '#15803d',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.18)',
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#173927',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  linkButton: {
    alignSelf: 'center',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: 2,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b79039',
  },
})

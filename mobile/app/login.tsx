import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import * as WebBrowser from 'expo-web-browser'
import { buildAuthRedirectUri } from '../src/utils/authRedirect'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PressableScale from '../components/common/motion/PressableScale'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()

  const scrollRef = useRef<ScrollView>(null)
  const nomeRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const senhaRef = useRef<TextInput>(null)

  const [modo, setModo] = useState<'login' | 'cadastro' | 'recuperar'>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [carregandoGoogle, setCarregandoGoogle] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [keyboardAberto, setKeyboardAberto] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        router.replace('/home')
      }
    }

    checkSession()
  }, [])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSub = Keyboard.addListener(showEvent as any, () => {
      setKeyboardAberto(true)
    })

    const hideSub = Keyboard.addListener(hideEvent as any, () => {
      setKeyboardAberto(false)
      nomeRef.current?.blur()
      emailRef.current?.blur()
      senhaRef.current?.blur()

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false })
      })

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false })
      }, 140)
    })

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const fecharTecladoETirarFoco = () => {
    nomeRef.current?.blur()
    emailRef.current?.blur()
    senhaRef.current?.blur()
    Keyboard.dismiss()

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    })

    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    }, 140)
  }

  const limparFeedback = () => {
    setMensagem('')
    setErro('')
  }

  const trocarModo = (novoModo: 'login' | 'cadastro' | 'recuperar') => {
    fecharTecladoETirarFoco()
    limparFeedback()
    setModo(novoModo)
    setMostrarSenha(false)
  }

  const handleLogin = async () => {
    limparFeedback()

    if (!email.trim() || !senha.trim()) {
      setErro('Preencha e-mail e senha.')
      return
    }

    try {
      setCarregando(true)

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      })

      if (error) {
        setErro(error.message)
        return
      }

      router.replace('/home')
    } finally {
      setCarregando(false)
    }
  }

  const handleCadastro = async () => {
    limparFeedback()

    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setErro('Preencha nome, e-mail e senha.')
      return
    }

    try {
      setCarregando(true)

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          // Sem isto o link de confirmacao usa o "Site URL" do painel do
          // Supabase, que pode apontar para fora do app.
          emailRedirectTo: buildAuthRedirectUri('auth/callback'),
          data: {
            nome: nome.trim(),
          },
        },
      })

      if (error) {
        setErro(error.message)
        return
      }

      setMensagem('Conta criada com sucesso. Verifique seu e-mail, se necessário.')
    } finally {
      setCarregando(false)
    }
  }

  const handleRecuperarSenha = async () => {
    limparFeedback()

    if (!email.trim()) {
      setErro('Digite seu e-mail para recuperar a senha.')
      return
    }

    try {
      setCarregando(true)

      const redirectTo = buildAuthRedirectUri('reset-password')

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) {
        setErro(error.message)
        return
      }

      setMensagem('Enviamos um link de recuperação para seu e-mail.')
    } finally {
      setCarregando(false)
    }
  }

  const handleGoogleLogin = async () => {
    limparFeedback()

    try {
      setCarregandoGoogle(true)

      const redirectTo = buildAuthRedirectUri('auth/callback')

      // Na web quem conduz o retorno e o proprio navegador: deixamos o
      // Supabase redirecionar para `redirectTo` e a rota /auth/callback troca
      // o code pela sessao. O fluxo com WebBrowser abaixo e o padrao nativo e
      // nao se traduz para o navegador.
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        })

        if (error) setErro(error.message)
        return
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        setErro(error.message)
        return
      }

      if (!data?.url) {
        setErro('Não foi possível iniciar o login com Google.')
        return
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

      if (result.type !== 'success') return

      router.replace({
        pathname: '/auth/callback',
        params: result.url ? { authUrl: result.url } : undefined,
      })
    } finally {
      setCarregandoGoogle(false)
    }
  }

  const handleSubmit = async () => {
    if (modo === 'login') return handleLogin()
    if (modo === 'cadastro') return handleCadastro()
    return handleRecuperarSenha()
  }

  const titulo =
    modo === 'login'
      ? 'Entrar'
      : modo === 'cadastro'
        ? 'Criar conta'
        : 'Recuperar senha'

  const subtitulo =
    modo === 'login'
      ? 'Acesse sua conta'
      : modo === 'cadastro'
        ? 'Cadastre-se para começar'
        : 'Receba o link no seu e-mail'

  const scrollBottom = keyboardAberto
    ? Math.max(insets.bottom, 16) + 28
    : Math.max(insets.bottom, 16)

  const minScrollHeight = Math.max(windowHeight - insets.top - insets.bottom, 0)
  const cadastroCompacto = modo === 'cadastro'

  const conteudoLogin = (
    <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 14 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.scrollContent,
              {
                minHeight: minScrollHeight,
                paddingBottom: scrollBottom,
                justifyContent: keyboardAberto ? 'flex-start' : 'center',
              },
            ]}
            keyboardShouldPersistTaps='handled'
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode='never'
            scrollEnabled
          >
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

            <View style={styles.cardWrap}>
              <View style={[styles.card, cadastroCompacto && styles.cardCadastroCompact]}>
                <View style={[styles.tabs, cadastroCompacto && styles.tabsCompact]}>
                  <PressableScale
                    style={[styles.tabButton, modo === 'login' && styles.tabButtonActive]}
                    onPress={() => trocarModo('login')}
                  >
                    <Text style={[styles.tabText, modo === 'login' && styles.tabTextActive]}>
                      Entrar
                    </Text>
                  </PressableScale>

                  <PressableScale
                    style={[styles.tabButton, modo === 'cadastro' && styles.tabButtonActive]}
                    onPress={() => trocarModo('cadastro')}
                  >
                    <Text style={[styles.tabText, modo === 'cadastro' && styles.tabTextActive]}>
                      Criar conta
                    </Text>
                  </PressableScale>

                  <PressableScale
                    style={[styles.tabButton, modo === 'recuperar' && styles.tabButtonActive]}
                    onPress={() => trocarModo('recuperar')}
                  >
                    <Text style={[styles.tabText, modo === 'recuperar' && styles.tabTextActive]}>
                      Senha
                    </Text>
                  </PressableScale>
                </View>

                <View style={[styles.header, cadastroCompacto && styles.headerCompact]}>
                  <Text style={[styles.title, cadastroCompacto && styles.titleCompact]}>
                    {titulo}
                  </Text>
                  <Text style={[styles.subtitle, cadastroCompacto && styles.subtitleCompact]}>
                    {subtitulo}
                  </Text>
                </View>

                <View style={[styles.form, cadastroCompacto && styles.formCompact]}>
                  {modo === 'cadastro' && (
                    <View style={[styles.field, cadastroCompacto && styles.fieldCompact]}>
                      <Text style={styles.label}>Nome</Text>
                      <TextInput
                        ref={nomeRef}
                        value={nome}
                        onChangeText={setNome}
                        placeholder='Seu nome'
                        placeholderTextColor='#8C9A90'
                        style={[styles.input, cadastroCompacto && styles.inputCompact]}
                        returnKeyType='next'
                        onFocus={() => {
                          setTimeout(() => {
                            scrollRef.current?.scrollTo({ y: 120, animated: true })
                          }, 120)
                        }}
                      />
                    </View>
                  )}

                  <View style={[styles.field, cadastroCompacto && styles.fieldCompact]}>
                    <Text style={styles.label}>E-mail</Text>
                    <TextInput
                      ref={emailRef}
                      value={email}
                      onChangeText={setEmail}
                      placeholder='seuemail@gmail.com'
                      placeholderTextColor='#8C9A90'
                      autoCapitalize='none'
                      keyboardType='email-address'
                      style={[styles.input, cadastroCompacto && styles.inputCompact]}
                      returnKeyType={modo === 'recuperar' ? 'done' : 'next'}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollTo({ y: 170, animated: true })
                        }, 120)
                      }}
                    />
                  </View>

                  {modo !== 'recuperar' && (
                    <View style={[styles.field, cadastroCompacto && styles.fieldCompact]}>
                      <Text style={styles.label}>Senha</Text>
                      <View style={styles.passwordWrap}>
                        <TextInput
                          ref={senhaRef}
                          value={senha}
                          onChangeText={setSenha}
                          placeholder='Digite sua senha'
                          placeholderTextColor='#8C9A90'
                          secureTextEntry={!mostrarSenha}
                          autoCapitalize='none'
                          style={[
                            styles.input,
                            styles.passwordInput,
                            cadastroCompacto && styles.inputCompact,
                            cadastroCompacto && styles.passwordInputCompact,
                          ]}
                          returnKeyType='done'
                          onFocus={() => {
                            setTimeout(() => {
                              scrollRef.current?.scrollTo({ y: 230, animated: true })
                            }, 120)
                          }}
                        />
                        <PressableScale
                          style={[styles.toggleButton, cadastroCompacto && styles.toggleButtonCompact]}
                          onPress={() => setMostrarSenha((prev) => !prev)}
                        >
                          <Text style={styles.toggleButtonText}>
                            {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                          </Text>
                        </PressableScale>
                      </View>
                    </View>
                  )}

                  {!!erro && <Text style={[styles.feedback, styles.feedbackError]}>{erro}</Text>}
                  {!!mensagem && (
                    <Text style={[styles.feedback, styles.feedbackSuccess]}>{mensagem}</Text>
                  )}

                  <PressableScale
                    style={[
                      styles.submitButton,
                      cadastroCompacto && styles.submitButtonCompact,
                      carregando && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={carregando}
                  >
                    {carregando ? (
                      <ActivityIndicator color='#ffffff' />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {modo === 'login'
                          ? 'Entrar'
                          : modo === 'cadastro'
                            ? 'Criar conta'
                            : 'Enviar link'}
                      </Text>
                    )}
                  </PressableScale>

                  {modo === 'login' && (
                    <PressableScale style={styles.linkButton} onPress={() => trocarModo('recuperar')}>
                      <Text style={styles.linkButtonText}>Esqueci minha senha</Text>
                    </PressableScale>
                  )}

                  <View
                    style={[
                      styles.separatorRow,
                      cadastroCompacto && styles.separatorRowCompact,
                    ]}
                  >
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>ou</Text>
                    <View style={styles.separatorLine} />
                  </View>

                  <PressableScale
                    style={[
                      styles.googleButton,
                      cadastroCompacto && styles.googleButtonCompact,
                      carregandoGoogle && styles.submitButtonDisabled,
                    ]}
                    onPress={handleGoogleLogin}
                    disabled={carregandoGoogle}
                  >
                    {carregandoGoogle ? (
                      <ActivityIndicator color='#1B7A45' />
                    ) : (
                      <>
                        <Text style={styles.googleIcon}>G</Text>
                        <Text style={styles.googleButtonText}>Continuar com Google</Text>
                      </>
                    )}
                  </PressableScale>
                </View>
              </View>
            </View>
          </ScrollView>
    </KeyboardAvoidingView>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      {Platform.OS === 'web' ? (
        conteudoLogin
      ) : (
        <TouchableWithoutFeedback onPress={fecharTecladoETirarFoco}>
          {conteudoLogin}
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F7F2',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
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
    color: '#12251A',
  },
  brandGold: {
    color: '#C89B2C',
  },
  tagline: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: '#C89B2C',
    textAlign: 'center',
  },
  cardWrap: {
    paddingBottom: 6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E3D7',
    shadowColor: '#182B20',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    marginBottom: 12,
  },
  cardCadastroCompact: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F0E7',
    borderRadius: 18,
    padding: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#dbe5da',
    marginBottom: 14,
  },
  tabsCompact: {
    marginBottom: 10,
    padding: 5,
    gap: 5,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tabButtonActive: {
    backgroundColor: '#1B7A45',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5F7267',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  header: {
    marginBottom: 12,
  },
  headerCompact: {
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#12251A',
    marginBottom: 4,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 23,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5F7267',
    textAlign: 'center',
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  form: {
    gap: 10,
  },
  formCompact: {
    gap: 8,
  },
  field: {
    gap: 6,
  },
  fieldCompact: {
    gap: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5F7267',
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E3D7',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#12251A',
  },
  inputCompact: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 104,
  },
  passwordInputCompact: {
    paddingRight: 98,
  },
  toggleButton: {
    position: 'absolute',
    right: 10,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E3D7',
    backgroundColor: '#F7F6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonCompact: {
    minHeight: 32,
    paddingHorizontal: 10,
    right: 8,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#12251A',
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
    color: '#D2453F',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.18)',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    color: '#159455',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.18)',
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#1B7A45',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  submitButtonCompact: {
    minHeight: 48,
    borderRadius: 16,
    marginTop: 0,
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
    marginTop: -2,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C89B2C',
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  separatorRowCompact: {
    gap: 8,
    marginTop: 0,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dbe5da',
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C9A90',
    textTransform: 'uppercase',
  },
  googleButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#F7F6F0',
    borderWidth: 1,
    borderColor: '#E5E3D7',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  googleButtonCompact: {
    minHeight: 48,
    borderRadius: 16,
    gap: 8,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#12251A',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#12251A',
  },
})
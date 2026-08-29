// Entrar, criar conta e recuperar a senha.
//
// A tela vinha com as cores cravadas no codigo, entao era a unica do app que
// nao acompanhava o tema — quem usava o modo escuro tomava uma pagina branca
// na cara ao sair da conta. Agora ela le o tema salvo, como todas as outras,
// e tem o botao de sol/lua no canto.
//
// A criacao de conta era o ponto fraco: nome, e-mail e senha, sem confirmar a
// senha e sem dizer o que o Supabase exige. Um erro de digitacao virava uma
// conta com senha que ninguem sabia, descoberta so no proximo login. Agora
// tem confirmacao, as exigencias aparecem enquanto se digita e o botao so
// libera quando tudo esta de pe.
//
// "Recuperar senha" saiu da barra de abas. Ela nao e um terceiro jeito de
// entrar, e sim um desvio de quem esqueceu a senha: virou um link no fim do
// login, com um botao de voltar.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'

import { supabase } from '../src/lib/supabase'
import { buildAuthRedirectUri } from '../src/utils/authRedirect'
import { useTemaSalvo } from '../src/theme/useTemaSalvo'
import type { Tema } from './types'
import Icon from '../components/common/Icon'
import AppearIn from '../components/common/motion/AppearIn'
import PressableScale from '../components/common/motion/PressableScale'

WebBrowser.maybeCompleteAuthSession()

type Modo = 'login' | 'cadastro' | 'recuperar'

/** O minimo que o Supabase aceita por padrao. */
const SENHA_MINIMA = 6

const emailParece = (valor: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim())

/**
 * As exigencias da senha, em portugues e visiveis enquanto se digita.
 *
 * So o comprimento e obrigatorio — e o que o Supabase cobra. Letra e numero
 * entram como conselho: contam para a forca, nao travam o cadastro.
 */
function examinarSenha(senha: string) {
  const regras = [
    { texto: `Pelo menos ${SENHA_MINIMA} caracteres`, ok: senha.length >= SENHA_MINIMA, exigida: true },
    { texto: 'Uma letra', ok: /[a-zA-Z]/.test(senha), exigida: false },
    { texto: 'Um número', ok: /\d/.test(senha), exigida: false },
  ]

  const pontos = regras.filter((r) => r.ok).length + (senha.length >= 10 ? 1 : 0)
  const forca = senha.length === 0 ? 0 : Math.min(3, Math.max(1, pontos - 1))
  const rotulo = ['', 'Fraca', 'Média', 'Forte'][forca]

  return { regras, forca, rotulo, valida: senha.length >= SENHA_MINIMA }
}

/**
 * O Supabase responde em ingles. Repetir isso na tela deixa o app com cara de
 * inacabado, e "Invalid login credentials" nao diz nada para quem so errou a
 * senha.
 */
function traduzirErro(mensagem: string) {
  const texto = mensagem.toLowerCase()

  if (texto.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (texto.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. O link está na sua caixa de entrada.'
  if (texto.includes('user already registered') || texto.includes('already been registered'))
    return 'Já existe uma conta com esse e-mail. Tente entrar, ou recupere a senha.'
  if (texto.includes('password should be at least'))
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  if (texto.includes('unable to validate email') || texto.includes('invalid email'))
    return 'Esse e-mail não parece válido.'
  if (texto.includes('for security purposes') || texto.includes('rate limit') || texto.includes('too many'))
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  if (texto.includes('network') || texto.includes('fetch')) return 'Sem conexão com o servidor. Verifique sua internet.'

  return mensagem
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { height: alturaJanela } = useWindowDimensions()
  const { theme, temaEscuro, alternarTema } = useTemaSalvo()
  const styles = useMemo(() => criarEstilos(theme), [theme])

  const scrollRef = useRef<ScrollView>(null)
  const nomeRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const senhaRef = useRef<TextInput>(null)
  const confirmarRef = useRef<TextInput>(null)

  const [modo, setModo] = useState<Modo>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [carregandoGoogle, setCarregandoGoogle] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  /** Vira true no primeiro toque em "Criar conta": antes disso nada fica vermelho. */
  const [tentou, setTentou] = useState(false)

  useEffect(() => {
    const conferirSessao = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) router.replace('/home')
    }

    conferirSessao()
  }, [])

  const exame = examinarSenha(senha)
  const senhasConferem = confirmar.length > 0 && senha === confirmar

  const cadastroPronto =
    !!nome.trim() && emailParece(email) && exame.valida && senhasConferem

  const limparFeedback = () => {
    setMensagem('')
    setErro('')
  }

  const trocarModo = (novoModo: Modo) => {
    Keyboard.dismiss()
    limparFeedback()
    setModo(novoModo)
    setMostrarSenha(false)
    setTentou(false)
    // A senha nao atravessa a troca de modo: digitada no login, ela reaparecia
    // no cadastro ja medida pelo indicador de forca, como se fosse a nova.
    setSenha('')
    setConfirmar('')
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }))
  }

  const handleLogin = async () => {
    limparFeedback()

    if (!email.trim() || !senha) {
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
        setErro(traduzirErro(error.message))
        return
      }

      router.replace('/home')
    } finally {
      setCarregando(false)
    }
  }

  const handleCadastro = async () => {
    limparFeedback()
    setTentou(true)

    // Cada checagem aponta o campo que falta, em vez de um "preencha tudo".
    if (!nome.trim()) {
      setErro('Como você quer ser chamado?')
      nomeRef.current?.focus()
      return
    }
    if (!emailParece(email)) {
      setErro('Digite um e-mail válido.')
      emailRef.current?.focus()
      return
    }
    if (!exame.valida) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`)
      senhaRef.current?.focus()
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem.')
      confirmarRef.current?.focus()
      return
    }

    try {
      setCarregando(true)

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          // Sem isto o link de confirmacao usa o "Site URL" do painel do
          // Supabase, que pode apontar para fora do app.
          emailRedirectTo: buildAuthRedirectUri('auth/callback'),
          data: { nome: nome.trim() },
        },
      })

      if (error) {
        setErro(traduzirErro(error.message))
        return
      }

      // Com confirmacao de e-mail ligada o Supabase devolve um usuario sem
      // sessao. Ja com ela desligada a sessao vem pronta e da para entrar
      // direto, sem passar de novo pelo login.
      if (data.session) {
        router.replace('/home')
        return
      }

      setMensagem(
        `Conta criada. Enviamos um link de confirmação para ${email.trim()} — abra o e-mail para ativar.`
      )
      setSenha('')
      setConfirmar('')
    } finally {
      setCarregando(false)
    }
  }

  const handleRecuperarSenha = async () => {
    limparFeedback()

    if (!emailParece(email)) {
      setErro('Digite seu e-mail para receber o link.')
      emailRef.current?.focus()
      return
    }

    try {
      setCarregando(true)

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildAuthRedirectUri('reset-password'),
      })

      if (error) {
        setErro(traduzirErro(error.message))
        return
      }

      setMensagem(`Link enviado para ${email.trim()}. Ele vale por uma hora.`)
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

        if (error) setErro(traduzirErro(error.message))
        return
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })

      if (error) {
        setErro(traduzirErro(error.message))
        return
      }

      if (!data?.url) {
        setErro('Não foi possível iniciar o login com Google.')
        return
      }

      const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (resultado.type !== 'success') return

      router.replace({
        pathname: '/auth/callback',
        params: resultado.url ? { authUrl: resultado.url } : undefined,
      })
    } finally {
      setCarregandoGoogle(false)
    }
  }

  const enviar = () => {
    if (modo === 'login') return handleLogin()
    if (modo === 'cadastro') return handleCadastro()
    return handleRecuperarSenha()
  }

  /** Campo de texto com rotulo, e o olho quando e senha. */
  const campo = (opcoes: {
    rotulo: string
    valor: string
    aoMudar: (texto: string) => void
    placeholder: string
    referencia?: React.RefObject<TextInput | null>
    senha?: boolean
    erro?: boolean
    certo?: boolean
    teclado?: 'email-address' | 'default'
    autoComplete?: any
    aoEnviar?: () => void
    ultimo?: boolean
    dica?: React.ReactNode
  }) => (
    <View style={styles.campoWrap}>
      <Text style={styles.rotulo}>{opcoes.rotulo}</Text>
      <View
        style={[
          styles.campoCaixa,
          opcoes.erro && styles.campoCaixaErro,
          opcoes.certo && styles.campoCaixaCerta,
        ]}
      >
        <TextInput
          ref={opcoes.referencia}
          value={opcoes.valor}
          onChangeText={opcoes.aoMudar}
          placeholder={opcoes.placeholder}
          placeholderTextColor={theme.faint}
          secureTextEntry={opcoes.senha ? !mostrarSenha : false}
          autoCapitalize={opcoes.teclado === 'email-address' || opcoes.senha ? 'none' : 'words'}
          autoCorrect={false}
          keyboardType={opcoes.teclado === 'email-address' ? 'email-address' : 'default'}
          // Sem isto o gerenciador de senhas do navegador nao entende o
          // formulario: nao oferece salvar, nem preencher no proximo acesso.
          autoComplete={opcoes.autoComplete}
          style={styles.campoInput}
          returnKeyType={opcoes.ultimo ? 'done' : 'next'}
          onSubmitEditing={opcoes.aoEnviar}
          blurOnSubmit={!!opcoes.ultimo}
        />

        {opcoes.certo ? <Icon name="confirmar" size={16} color={theme.green} /> : null}

        {opcoes.senha ? (
          <PressableScale
            onPress={() => setMostrarSenha((antes) => !antes)}
            scaleTo={0.9}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={mostrarSenha ? 'Ocultar a senha' : 'Mostrar a senha'}
            style={styles.olhoBotao}
          >
            <Icon name={mostrarSenha ? 'olho_fechado' : 'olho'} size={17} color={theme.muted} />
          </PressableScale>
        ) : null}
      </View>
      {opcoes.dica}
    </View>
  )

  /** A barra de forca da senha, com as exigencias listadas embaixo. */
  const medidorDaSenha = senha.length > 0 && (
    <View style={styles.medidor}>
      <View style={styles.medidorBarras}>
        {[1, 2, 3].map((nivel) => (
          <View
            key={nivel}
            style={[
              styles.medidorBarra,
              exame.forca >= nivel && {
                backgroundColor: exame.forca === 1 ? theme.red : exame.forca === 2 ? theme.accent : theme.green,
              },
            ]}
          />
        ))}
        <Text
          style={[
            styles.medidorRotulo,
            {
              color: exame.forca === 1 ? theme.red : exame.forca === 2 ? theme.accent : theme.green,
            },
          ]}
        >
          {exame.rotulo}
        </Text>
      </View>

      <View style={styles.regras}>
        {exame.regras.map((regra) => (
          <View key={regra.texto} style={styles.regra}>
            <View style={[styles.regraMarca, regra.ok && styles.regraMarcaOk]}>
              {regra.ok ? <Icon name="confirmar" size={9} color={theme.textInverse} /> : null}
            </View>
            <Text style={[styles.regraTexto, regra.ok && styles.regraTextoOk]}>{regra.texto}</Text>
          </View>
        ))}
      </View>
    </View>
  )

  const tituloDoModo =
    modo === 'login' ? 'Bem-vindo de volta' : modo === 'cadastro' ? 'Criar sua conta' : 'Recuperar a senha'

  const subtituloDoModo =
    modo === 'login'
      ? 'Entre para ver suas contas do mês.'
      : modo === 'cadastro'
        ? 'Leva menos de um minuto, e é de graça.'
        : 'Digite o e-mail da conta e enviamos um link para criar uma senha nova.'

  const textoDoBotao =
    modo === 'login' ? 'Entrar' : modo === 'cadastro' ? 'Criar conta' : 'Enviar link'

  const botaoTravado =
    carregando || (modo === 'cadastro' && tentou && !cadastroPronto)

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.rolagem,
            {
              minHeight: Math.max(alturaJanela - insets.top - insets.bottom, 0),
              paddingBottom: Math.max(insets.bottom + 24, 28),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          <View style={styles.topoLinha}>
            {modo === 'recuperar' ? (
              <PressableScale
                onPress={() => trocarModo('login')}
                scaleTo={0.92}
                accessibilityRole="button"
                accessibilityLabel="Voltar para o login"
                style={styles.circulo}
              >
                <Icon name="seta_esquerda" size={17} color={theme.text} />
              </PressableScale>
            ) : (
              <View style={styles.circuloVazio} />
            )}

            <PressableScale
              onPress={alternarTema}
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel="Trocar o tema"
              style={styles.circulo}
            >
              <Icon name={temaEscuro ? 'sol' : 'lua'} size={17} color={theme.text} />
            </PressableScale>
          </View>

          <AppearIn index={0}>
            <View style={styles.hero}>
              <Image
                source={require('../assets/images/icon-removebg.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.marca}>
                <Text style={styles.marcaVerde}>Braz</Text>
                <Text style={styles.marcaDourada}>llet</Text>
              </Text>
              <Text style={styles.assinatura}>Sua wallet sob controle</Text>
            </View>
          </AppearIn>

          <AppearIn index={1}>
            <View style={styles.cartao}>
              {modo !== 'recuperar' ? (
                <View style={styles.abas}>
                  {(['login', 'cadastro'] as const).map((opcao) => {
                    const ativo = modo === opcao
                    return (
                      <PressableScale
                        key={opcao}
                        onPress={() => trocarModo(opcao)}
                        scaleTo={0.98}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: ativo }}
                        style={[styles.aba, ativo && styles.abaAtiva]}
                      >
                        <Text style={[styles.abaTexto, ativo && styles.abaTextoAtivo]}>
                          {opcao === 'login' ? 'Entrar' : 'Criar conta'}
                        </Text>
                      </PressableScale>
                    )
                  })}
                </View>
              ) : null}

              <Text style={styles.titulo}>{tituloDoModo}</Text>
              <Text style={styles.subtitulo}>{subtituloDoModo}</Text>

              <View style={styles.formulario}>
                {modo === 'cadastro'
                  ? campo({
                      rotulo: 'Nome',
                      valor: nome,
                      aoMudar: (t) => {
                        setNome(t)
                        limparFeedback()
                      },
                      placeholder: 'Como quer ser chamado',
                      referencia: nomeRef,
                      autoComplete: 'name',
                      erro: tentou && !nome.trim(),
                      aoEnviar: () => emailRef.current?.focus(),
                    })
                  : null}

                {campo({
                  rotulo: 'E-mail',
                  valor: email,
                  aoMudar: (t) => {
                    setEmail(t)
                    limparFeedback()
                  },
                  placeholder: 'seuemail@gmail.com',
                  referencia: emailRef,
                  teclado: 'email-address',
                  autoComplete: 'email',
                  erro: tentou && modo === 'cadastro' && !emailParece(email),
                  ultimo: modo === 'recuperar',
                  aoEnviar: () =>
                    modo === 'recuperar' ? handleRecuperarSenha() : senhaRef.current?.focus(),
                })}

                {modo !== 'recuperar'
                  ? campo({
                      rotulo: 'Senha',
                      valor: senha,
                      aoMudar: (t) => {
                        setSenha(t)
                        limparFeedback()
                      },
                      placeholder: modo === 'cadastro' ? `Pelo menos ${SENHA_MINIMA} caracteres` : 'Sua senha',
                      referencia: senhaRef,
                      senha: true,
                      autoComplete: modo === 'cadastro' ? 'new-password' : 'current-password',
                      erro: tentou && modo === 'cadastro' && !exame.valida,
                      ultimo: modo === 'login',
                      aoEnviar: () => (modo === 'login' ? handleLogin() : confirmarRef.current?.focus()),
                      dica: modo === 'cadastro' ? medidorDaSenha : undefined,
                    })
                  : null}

                {modo === 'cadastro'
                  ? campo({
                      rotulo: 'Repita a senha',
                      valor: confirmar,
                      aoMudar: (t) => {
                        setConfirmar(t)
                        limparFeedback()
                      },
                      placeholder: 'A mesma senha de novo',
                      referencia: confirmarRef,
                      senha: true,
                      autoComplete: 'new-password',
                      certo: senhasConferem,
                      erro: confirmar.length > 0 && !senhasConferem,
                      ultimo: true,
                      aoEnviar: handleCadastro,
                      dica:
                        confirmar.length > 0 && !senhasConferem ? (
                          <Text style={styles.dicaErro}>As senhas não coincidem.</Text>
                        ) : undefined,
                    })
                  : null}

                {erro ? (
                  <View style={styles.avisoErro}>
                    <Icon name="excluir" size={14} color={theme.red} />
                    <Text style={styles.avisoErroTexto}>{erro}</Text>
                  </View>
                ) : null}

                {mensagem ? (
                  <View style={styles.avisoOk}>
                    <Icon name="confirmar" size={14} color={theme.green} />
                    <Text style={styles.avisoOkTexto}>{mensagem}</Text>
                  </View>
                ) : null}

                <PressableScale
                  onPress={enviar}
                  disabled={botaoTravado}
                  scaleTo={0.98}
                  accessibilityRole="button"
                  style={[styles.botaoPrincipal, botaoTravado && styles.botaoTravado]}
                >
                  {carregando ? (
                    <ActivityIndicator color={theme.textInverse} />
                  ) : (
                    <Text style={styles.botaoPrincipalTexto}>{textoDoBotao}</Text>
                  )}
                </PressableScale>

                {modo === 'login' ? (
                  <PressableScale
                    onPress={() => trocarModo('recuperar')}
                    scaleTo={0.97}
                    accessibilityRole="button"
                    style={styles.link}
                  >
                    <Text style={styles.linkTexto}>Esqueci minha senha</Text>
                  </PressableScale>
                ) : null}

                {modo !== 'recuperar' ? (
                  <>
                    <View style={styles.separador}>
                      <View style={styles.separadorLinha} />
                      <Text style={styles.separadorTexto}>ou</Text>
                      <View style={styles.separadorLinha} />
                    </View>

                    <PressableScale
                      onPress={handleGoogleLogin}
                      disabled={carregandoGoogle}
                      scaleTo={0.98}
                      accessibilityRole="button"
                      style={[styles.botaoGoogle, carregandoGoogle && styles.botaoTravado]}
                    >
                      {carregandoGoogle ? (
                        <ActivityIndicator color={theme.primary} />
                      ) : (
                        <>
                          <Text style={styles.googleG}>G</Text>
                          <Text style={styles.botaoGoogleTexto}>Continuar com Google</Text>
                        </>
                      )}
                    </PressableScale>
                  </>
                ) : null}
              </View>
            </View>
          </AppearIn>

          {modo === 'cadastro' ? (
            <Text style={styles.rodapeLegal}>
              Ao criar a conta você concorda em guardar seus dados financeiros no Brazllet. Dá para
              exportar tudo e apagar a conta quando quiser.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const criarEstilos = (theme: Tema) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    rolagem: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 6, justifyContent: 'center' },

    topoLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    circulo: {
      width: 40,
      height: 40,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circuloVazio: { width: 40, height: 40 },

    hero: { alignItems: 'center', marginTop: 6, marginBottom: 18 },
    logo: { width: 78, height: 78 },
    marca: { fontSize: 32, fontWeight: '900', letterSpacing: -1.2, marginTop: 2 },
    marcaVerde: { color: theme.primary },
    marcaDourada: { color: theme.accent },
    assinatura: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.muted,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      marginTop: 5,
    },

    cartao: {
      backgroundColor: theme.card,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
      shadowColor: theme.shadow,
      shadowOpacity: 1,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },

    abas: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: 16,
      backgroundColor: theme.backgroundSoft,
      marginBottom: 18,
    },
    aba: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    abaAtiva: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1,
    },
    abaTexto: { fontSize: 13.5, fontWeight: '800', color: theme.muted },
    abaTextoAtivo: { color: theme.text, fontWeight: '900' },

    titulo: { fontSize: 21, fontWeight: '900', color: theme.text, letterSpacing: -0.6 },
    subtitulo: { fontSize: 12.5, fontWeight: '600', color: theme.muted, lineHeight: 18, marginTop: 5 },

    formulario: { marginTop: 18, gap: 13 },

    campoWrap: { gap: 7 },
    rotulo: {
      fontSize: 10.5,
      fontWeight: '900',
      color: theme.muted,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    campoCaixa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
      paddingHorizontal: 14,
    },
    campoCaixaErro: { borderColor: theme.red, borderWidth: 1.5 },
    campoCaixaCerta: { borderColor: theme.green },
    campoInput: {
      flex: 1,
      // Na web o campo vira um <input>, que nao encolhe abaixo da largura de
      // umas vinte letras. Sem isto o olho da senha sai da caixa.
      minWidth: 0,
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      paddingVertical: 0,
    },
    olhoBotao: { padding: 4 },
    dicaErro: { fontSize: 11.5, fontWeight: '700', color: theme.red, marginTop: 1 },

    medidor: { marginTop: 4, gap: 8 },
    medidorBarras: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    medidorBarra: { flex: 1, height: 4, borderRadius: 999, backgroundColor: theme.border },
    medidorRotulo: { width: 44, textAlign: 'right', fontSize: 10.5, fontWeight: '900' },
    regras: { gap: 5 },
    regra: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    regraMarca: {
      width: 15,
      height: 15,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    regraMarcaOk: { backgroundColor: theme.green, borderColor: theme.green },
    regraTexto: { fontSize: 11.5, fontWeight: '600', color: theme.faint },
    regraTextoOk: { color: theme.muted, fontWeight: '700' },

    avisoErro: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 11,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.red,
      backgroundColor: theme.redSoft,
    },
    avisoErroTexto: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: '700', color: theme.red, lineHeight: 18 },
    avisoOk: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 11,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.green,
      backgroundColor: theme.greenSoft,
    },
    avisoOkTexto: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: '700', color: theme.green, lineHeight: 18 },

    botaoPrincipal: {
      minHeight: 54,
      borderRadius: 17,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    botaoPrincipalTexto: { fontSize: 15, fontWeight: '900', color: theme.textInverse, letterSpacing: -0.2 },
    botaoTravado: { opacity: 0.5 },

    link: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 10 },
    linkTexto: { fontSize: 12.5, fontWeight: '800', color: theme.primary },

    separador: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
    separadorLinha: { flex: 1, height: 1, backgroundColor: theme.border },
    separadorTexto: {
      fontSize: 10.5,
      fontWeight: '800',
      color: theme.faint,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },

    botaoGoogle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      minHeight: 52,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
    },
    googleG: { fontSize: 17, fontWeight: '900', color: theme.primary },
    botaoGoogleTexto: { fontSize: 14, fontWeight: '800', color: theme.text },

    rodapeLegal: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.faint,
      lineHeight: 16,
      textAlign: 'center',
      marginTop: 16,
      paddingHorizontal: 6,
    },
  })

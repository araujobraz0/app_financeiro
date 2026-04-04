import { useState } from 'react'
import { supabase } from './supabaseClient'

function Login() {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const limparFeedback = () => {
    setMensagem('')
    setErro('')
  }

  const trocarModo = (novoModo) => {
    limparFeedback()
    setModo(novoModo)
    setMostrarSenha(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    limparFeedback()
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (error) {
      setErro(error.message)
    } else {
      setMensagem('Login realizado com sucesso.')
    }

    setCarregando(false)
  }

  const handleCadastro = async (e) => {
    e.preventDefault()
    limparFeedback()
    setCarregando(true)

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          nome: nome.trim(),
        },
      },
    })

    if (error) {
      setErro(error.message)
    } else {
      setMensagem('Conta criada com sucesso. Verifique seu e-mail para confirmar o cadastro, se necessário.')
    }

    setCarregando(false)
  }

  const handleRecuperarSenha = async (e) => {
    e.preventDefault()
    limparFeedback()

    if (!email.trim()) {
      setErro('Digite seu e-mail para recuperar a senha.')
      return
    }

    setCarregando(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })

    if (error) {
      setErro(error.message)
    } else {
      setMensagem('Enviamos um link de recuperação para seu e-mail.')
    }

    setCarregando(false)
  }

  const handleLoginGoogle = async () => {
    limparFeedback()
    setCarregando(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setErro(error.message)
      setCarregando(false)
    }
  }

  const titulo =
    modo === 'login'
      ? 'Acesse sua conta'
      : modo === 'cadastro'
      ? 'Crie sua conta'
      : 'Recupere sua senha'

  const subtitulo =
    modo === 'login'
      ? 'Entre para continuar acompanhando seu controle financeiro.'
      : modo === 'cadastro'
      ? 'Cadastre-se para salvar e acessar seus dados com segurança.'
      : 'Informe seu e-mail para receber o link de redefinição.'

  return (
    <div className="login-screen">
      <div className="login-shell">
        <div className="login-card-premium">
          <div className="login-side-panel">
            <div className="login-badge">Controle Financeiro</div>

            <div className="login-side-content">
              <h1 className="login-side-title">Organize sua vida financeira com clareza.</h1>
              <p className="login-side-text">
                Visual premium, acompanhamento mensal, categorias, comparativos e controle total em um só lugar.
              </p>
            </div>

            <div className="login-side-highlights">
              <div className="login-highlight-card">
                <span className="login-highlight-label">Visão mensal</span>
                <strong className="login-highlight-value">Clara e rápida</strong>
              </div>

              <div className="login-highlight-card">
                <span className="login-highlight-label">Organização</span>
                <strong className="login-highlight-value">Entradas e saídas</strong>
              </div>

              <div className="login-highlight-card">
                <span className="login-highlight-label">Acesso</span>
                <strong className="login-highlight-value">Seguro com Supabase</strong>
              </div>
            </div>
          </div>

          <div className="login-form-panel">
            <div className="login-form-header">
              <div className="login-badge mobile-only">Controle Financeiro</div>
              <h2 className="login-title">{titulo}</h2>
              <p className="login-subtitle">{subtitulo}</p>
            </div>

            <button
              type="button"
              className="login-google-btn"
              onClick={handleLoginGoogle}
              disabled={carregando}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                style={{ display: 'block', flexShrink: 0 }}
              >
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 3.4 14.5 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z"
                />
                <path
                  fill="#34A853"
                  d="M3.7 7.4l3.2 2.3c.9-1.8 2.8-3 5.1-3 1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 3.4 14.5 2.5 12 2.5c-3.6 0-6.8 2-8.3 4.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 21.5c2.4 0 4.5-.8 6-2.3l-2.8-2.2c-.8.6-1.8 1-3.2 1-3.7 0-5.1-2.5-5.4-3.8l-3.1 2.4c1.5 3 4.6 4.9 8.5 4.9z"
                />
                <path
                  fill="#4285F4"
                  d="M21 12.4c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.3-1.1 2.3-2.2 3l2.8 2.2c1.7-1.6 3-4 3-7.5z"
                />
              </svg>
              <span>Entrar com Google</span>
            </button>

            <div className="login-divider">
              <span>ou continue com e-mail</span>
            </div>

            <div className="login-tabs">
              <button
                type="button"
                className={`login-tab ${modo === 'login' ? 'active' : ''}`}
                onClick={() => trocarModo('login')}
              >
                Entrar
              </button>

              <button
                type="button"
                className={`login-tab ${modo === 'cadastro' ? 'active' : ''}`}
                onClick={() => trocarModo('cadastro')}
              >
                Cadastrar
              </button>

              <button
                type="button"
                className={`login-tab ${modo === 'recuperar' ? 'active' : ''}`}
                onClick={() => trocarModo('recuperar')}
              >
                Recuperar
              </button>
            </div>

            <form
              onSubmit={
                modo === 'login'
                  ? handleLogin
                  : modo === 'cadastro'
                  ? handleCadastro
                  : handleRecuperarSenha
              }
              className="login-form"
            >
              {modo === 'cadastro' && (
                <div className="login-field">
                  <label className="login-label">Nome</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="login-input"
                    placeholder="Seu nome"
                  />
                </div>
              )}

              <div className="login-field">
                <label className="login-label">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="seuemail@gmail.com"
                  required
                />
              </div>

              {modo !== 'recuperar' && (
                <div className="login-field">
                  <label className="login-label">Senha</label>
                  <div className="login-password-wrap">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="login-input login-input-password"
                      placeholder="Digite sua senha"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((prev) => !prev)}
                      className="toggle-password-btn"
                      title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>
              )}

              {erro && <div className="login-alert error">{erro}</div>}
              {mensagem && <div className="login-alert success">{mensagem}</div>}

              <button type="submit" className="login-submit" disabled={carregando}>
                {carregando
                  ? 'Carregando...'
                  : modo === 'login'
                  ? 'Entrar agora'
                  : modo === 'cadastro'
                  ? 'Criar conta'
                  : 'Enviar link'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Login }

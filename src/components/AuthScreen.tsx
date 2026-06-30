import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email.trim(), password)
    setBusy(false)
    if (error) setError(error)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
          TaskFlow
        </div>
        <p className="auth-tagline">نظّم مهامك وأنجز المزيد</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setMode('signin')
              setError(null)
            }}
            type="button"
          >
            تسجيل الدخول
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setMode('signup')
              setError(null)
            }}
            type="button"
          >
            حساب جديد
          </button>
        </div>

        <form onSubmit={submit}>
          {error && <div className="auth-error">{error}</div>}
          <div className="field">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              dir="ltr"
            />
          </div>
          <div className="field">
            <label htmlFor="password">كلمة المرور</label>
            <input
              id="password"
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} type="submit">
            {busy ? 'جارٍ المعالجة…' : mode === 'signin' ? 'دخول' : 'إنشاء الحساب'}
          </button>
        </form>

        <p className="auth-foot">
          {mode === 'signin' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
            }}
          >
            {mode === 'signin' ? 'أنشئ واحداً' : 'سجّل الدخول'}
          </button>
        </p>
      </div>
    </div>
  )
}

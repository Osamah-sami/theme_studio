import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'
import { loadTheme, generateTheme, applyTheme } from './lib/theme'

function Gate() {
  const { user, loading } = useAuth()
  const [themeLoaded, setThemeLoaded] = useState(false)

  useEffect(() => {
    const options = loadTheme()
    const theme = generateTheme(options)
    applyTheme(theme, options.mode)
    setThemeLoaded(true)
  }, [])

  if (loading || !themeLoaded) {
    return (
      <div className="loading-wrap">
        <div>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          جارٍ التحميل…
        </div>
      </div>
    )
  }
  return user ? <Dashboard /> : <AuthScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

import { AuthProvider, useAuth } from './lib/auth'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'

function Gate() {
  const { user, loading } = useAuth()
  if (loading) {
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

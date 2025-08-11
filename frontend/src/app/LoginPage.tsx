import { useState } from 'react'
import { useAuth } from '@/stores/useAuth'
import { useNavigate, Link } from 'react-router-dom'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useAuth((s) => s.login)
  const loading = useAuth((s) => s.loading)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await login(email, password)
    navigate('/')
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-4">Вход</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-xs mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 px-3 rounded border bg-background w-full text-sm"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="text-xs mb-1 block">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-9 px-3 rounded border bg-background w-full text-sm"
            placeholder="••••••••"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-9 px-4 rounded border text-sm bg-primary text-primary-foreground w-full"
        >
          {loading ? 'Входим...' : 'Войти'}
        </button>
        <div className="pt-2">
          <Link
            to="/register"
            className="h-9 px-4 rounded border text-sm inline-flex items-center justify-center w-full"
          >
            Регистрация
          </Link>
        </div>
      </form>
    </div>
  )
} 
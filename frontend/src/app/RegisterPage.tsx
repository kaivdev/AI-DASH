import { useState } from 'react'
import { useAuth } from '@/stores/useAuth'
import { useNavigate, Link } from 'react-router-dom'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const register = useAuth((s) => s.register)
  const loading = useAuth((s) => s.loading)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await register(email, password, code)
    navigate('/')
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-4">Регистрация</h1>
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
        <div>
          <label className="text-xs mb-1 block">Код доступа</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-9 px-3 rounded border bg-background w-full text-sm"
            placeholder="667788"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-9 px-4 rounded border text-sm bg-primary text-primary-foreground w-full"
        >
          {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
        </button>
        <div className="text-xs text-muted-foreground text-center">
          Уже есть аккаунт? <Link to="/login" className="underline">Войти</Link>
        </div>
      </form>
    </div>
  )
} 
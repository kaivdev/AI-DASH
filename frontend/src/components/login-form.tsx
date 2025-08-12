import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/stores/useAuth'
import { useNavigate, Link } from 'react-router-dom'

const schema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

type FormData = z.infer<typeof schema>

export function LoginForm() {
  const navigate = useNavigate()
  const login = useAuth((s) => s.login)
  const loading = useAuth((s) => s.loading)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  async function onSubmit(values: FormData) {
    await login(values.email, values.password)
    navigate('/')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          className="h-9 px-3 rounded-md border bg-background w-full text-sm"
          placeholder="you@example.com"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>
      <div className="grid gap-2">
        <div className="flex items-center">
          <label className="text-sm" htmlFor="password">Пароль</label>
          <Link to="#" className="ml-auto inline-block text-xs text-muted-foreground hover:underline">Забыли пароль?</Link>
        </div>
        <input
          id="password"
          type="password"
          className="h-9 px-3 rounded-md border bg-background w-full text-sm"
          placeholder="••••••••"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="h-9 px-4 rounded-md border text-sm bg-primary text-primary-foreground"
      >
        {loading ? 'Входим…' : 'Войти'}
      </button>
      <div className="text-center text-sm text-muted-foreground">
        Нет аккаунта?{' '}
        <Link to="/register" className="hover:underline">Регистрация</Link>
      </div>
    </form>
  )
} 
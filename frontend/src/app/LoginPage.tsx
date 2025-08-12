import { GalleryVerticalEnd } from 'lucide-react'
import { LoginForm } from '@/components/login-form'

export function LoginPage() {
  return (
    <div className="fixed inset-x-0 top-14 bottom-0 grid place-items-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <a href="#" className="flex items-center gap-2 font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          AI Life Dashboard
        </a>
        <div className="w-full rounded-xl border bg-card/95 backdrop-blur p-6 shadow-2xl">
          <h2 className="text-center text-lg font-semibold mb-2">Добро пожаловать</h2>
          <p className="text-center text-xs text-muted-foreground mb-4">Войдите в свою учётную запись</p>
          <LoginForm />
        </div>
      </div>
    </div>
  )
} 
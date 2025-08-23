import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/stores/useSettings'

export function ThemeToggle() {
  const theme = useSettings((s) => s.theme)
  const setTheme = useSettings((s) => s.setTheme)

  function toggleTheme() {
    const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark'
    // Мгновенно применяем класс на html, чтобы избежать мерцаний
    const root = document.documentElement
    if (next === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    setTheme(next)
  }

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} className="relative">
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Переключить тему</span>
    </Button>
  )
}

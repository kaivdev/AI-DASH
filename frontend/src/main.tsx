import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { useSettings } from './stores/useSettings'

function ThemeApplier({ children }: { children: React.ReactNode }) {
  const theme = useSettings((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeApplier>
        <App />
      </ThemeApplier>
    </BrowserRouter>
  </React.StrictMode>
) 
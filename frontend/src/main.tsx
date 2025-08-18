import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { useSettings } from './stores/useSettings'
import 'antd/dist/reset.css'
import { ConfigProvider, theme as antdTheme } from 'antd'
// Gravity UI styles for Markdown Editor
import '@gravity-ui/uikit/styles/fonts.css'
import '@gravity-ui/uikit/styles/styles.css'
import {ThemeProvider, configure, ToasterProvider, Toaster as GToaster, ToasterComponent} from '@gravity-ui/uikit'
import {configure as configureMd} from '@gravity-ui/markdown-editor'

configure({ lang: 'ru' })
configureMd({ lang: 'ru' })

// Gravity UI Toaster instance for Markdown Editor notifications
const toaster = new GToaster()

function ThemeApplier({ children }: { children: React.ReactNode }) {
  const theme = useSettings((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])
  return (
    <ConfigProvider theme={{ algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
      <ToasterProvider toaster={toaster}>
        <ThemeProvider theme={theme === 'dark' ? 'dark' : 'light'}>
          {children}
          <ToasterComponent />
        </ThemeProvider>
      </ToasterProvider>
    </ConfigProvider>
  )
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
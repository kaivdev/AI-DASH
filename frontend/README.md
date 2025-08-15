# Frontend - AI Life Dashboard

React приложение с TypeScript, Tailwind CSS и современными UI компонентами для AI Life Dashboard.

## 📋 Требования

### Обязательные:
- **Node.js**: 18+ (рекомендуется 20+)
- **npm**: 9+ или **yarn**: 1.22+
- **Git**: для клонирования репозитория

### Рекомендуемые:
- **VS Code**: с расширениями для React/TypeScript
- **Chrome/Edge**: для разработки

## 🚀 Установка и настройка

### 1. Установка Node.js

#### Windows:
```powershell
# Скачайте с официального сайта
# https://nodejs.org/
# Или используйте winget
winget install OpenJS.NodeJS
```

#### macOS:
```bash
# Используя Homebrew
brew install node@20

# Или скачайте с официального сайта
# https://nodejs.org/
```

#### Ubuntu/Debian:
```bash
# Используя NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Или используя snap
sudo snap install node --classic
```

### 2. Проверка установки

```bash
# Проверьте версии
node --version
npm --version

# Должны быть:
# Node.js: v18.x.x или выше
# npm: 9.x.x или выше
```

### 3. Установка зависимостей

```bash
# Перейдите в папку frontend
cd frontend

# Установите зависимости
npm install

# Или используя yarn
yarn install
```

### 4. Настройка переменных окружения

#### Создайте файл `.env` в папке `frontend/`:

```bash
# API URL (должен соответствовать backend)
VITE_API_URL=http://localhost:8000

# Режим разработки
VITE_DEV_MODE=true

# Дополнительные настройки
VITE_APP_TITLE=AI Life Dashboard
VITE_APP_VERSION=1.0.0
```

### 5. Проверка backend

Убедитесь, что backend сервер запущен и доступен по адресу `http://localhost:8000`.

## 🏃‍♂️ Запуск

### Режим разработки:

```bash
# Убедитесь, что вы в папке frontend
cd frontend

# Запустите сервер разработки
npm run dev

# Или используя yarn
yarn dev
```

Приложение будет доступно по адресу: http://localhost:5173

### Другие команды:

```bash
# Сборка для продакшена
npm run build

# Предварительный просмотр сборки
npm run preview

# Проверка типов TypeScript
npm run typecheck
```

## 🏗️ Структура проекта

```
frontend/
├── public/                 # Статические файлы
├── src/
│   ├── app/               # Основные компоненты приложения
│   │   ├── AppShell.tsx   # Оболочка приложения
│   │   ├── LoginPage.tsx  # Страница входа
│   │   ├── MainGrid.tsx   # Основная сетка
│   │   └── Topbar.tsx     # Верхняя панель
│   ├── components/        # Переиспользуемые компоненты
│   │   ├── ui/           # Базовые UI компоненты
│   │   └── shadcn/       # shadcn/ui компоненты
│   ├── features/         # Модули приложения
│   │   ├── tasks/        # Модуль задач
│   │   ├── projects/     # Модуль проектов
│   │   ├── employees/    # Модуль сотрудников
│   │   ├── finance/      # Модуль финансов
│   │   ├── goals/        # Модуль целей
│   │   ├── notes/        # Модуль заметок
│   │   └── reading/      # Модуль чтения
│   ├── stores/           # Zustand стейт менеджер
│   ├── types/            # TypeScript типы
│   ├── lib/              # Утилиты и API
│   ├── App.tsx           # Главный компонент
│   └── main.tsx          # Точка входа
├── package.json          # Зависимости и скрипты
├── vite.config.ts        # Конфигурация Vite
├── tailwind.config.ts    # Конфигурация Tailwind
└── tsconfig.json         # Конфигурация TypeScript
```

## 🎨 UI Framework

### shadcn/ui компоненты:
- **Button** - Кнопки
- **Card** - Карточки
- **Dialog** - Диалоговые окна
- **Drawer** - Выдвижные панели
- **Form** - Формы
- **Input** - Поля ввода
- **Select** - Выпадающие списки
- **Table** - Таблицы
- **DatePicker** - Выбор даты

### Установка новых компонентов:

```bash
# Установка нового shadcn/ui компонента
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
```

## 🔧 Конфигурация

### Vite (vite.config.ts):
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

### Tailwind CSS (tailwind.config.ts):
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Кастомные цвета
      }
    },
  },
  plugins: [],
} satisfies Config
```

### TypeScript (tsconfig.json):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 📦 Зависимости

### Основные зависимости:
- **React 18** - UI библиотека
- **TypeScript** - Типизация
- **Vite** - Сборщик и dev сервер
- **Tailwind CSS** - CSS фреймворк
- **shadcn/ui** - UI компоненты
- **Zustand** - Стейт менеджер
- **React Router** - Маршрутизация
- **React Hook Form** - Управление формами
- **Zod** - Валидация схем
- **TanStack Query** - Управление состоянием сервера
- **Framer Motion** - Анимации
- **Lucide React** - Иконки

### Dev зависимости:
- **@types/react** - Типы для React
- **@types/node** - Типы для Node.js
- **PostCSS** - Обработка CSS
- **Autoprefixer** - Автопрефиксы

## 🔒 Аутентификация

### JWT токены:
- Токены хранятся в localStorage
- Автоматическое обновление токенов
- Защищенные маршруты

### Zustand store (useAuth.ts):
```typescript
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  register: (userData: RegisterData) => Promise<void>
}
```

## 📊 API интеграция

### API клиент (lib/api.ts):
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Интерцептор для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

## 🎯 Модули приложения

### Tasks (Задачи):
- Создание и редактирование задач
- Drag & Drop сортировка
- Фильтрация по статусу
- Временные метки

### Projects (Проекты):
- Управление проектами
- Добавление участников
- Ссылки на ресурсы
- Прогресс проекта

### Employees (Сотрудники):
- Управление сотрудниками
- Почасовая оплата
- Статус активности
- Детальная информация

### Finance (Финансы):
- Учет доходов и расходов
- Категоризация транзакций
- Фильтры по датам
- Экспорт данных

### Goals (Цели):
- Постановка целей
- Отслеживание прогресса
- Дедлайны
- Категории целей

### Notes (Заметки):
- Создание заметок
- Поиск по содержимому
- Категоризация
- Экспорт

### Reading List (Список чтения):
- Добавление материалов
- Статус прочтения
- Приоритеты
- Теги

## 🐛 Отладка

### React Developer Tools:
1. Установите расширение для браузера
2. Откройте DevTools
3. Перейдите на вкладку "Components" или "Profiler"

### TypeScript ошибки:
```bash
# Проверка типов
npm run typecheck

# Автоисправление
npx tsc --noEmit
```

### ESLint:
```bash
# Проверка кода
npx eslint src --ext .ts,.tsx

# Автоисправление
npx eslint src --ext .ts,.tsx --fix
```

## 📦 Сборка для продакшена

### Создание сборки:
```bash
# Создание оптимизированной сборки
npm run build

# Предварительный просмотр
npm run preview
```

### Оптимизация:
- Tree shaking для уменьшения размера
- Минификация CSS и JS
- Сжатие изображений
- Code splitting

### Развертывание:
```bash
# Статические файлы в папке dist/
# Разместите содержимое на веб-сервере
# Или используйте CDN
```

## 🆘 Решение проблем

### Ошибка "Module not found":
1. Проверьте правильность импортов
2. Убедитесь, что файл существует
3. Проверьте настройки TypeScript

### Ошибка CORS:
1. Убедитесь, что backend запущен
2. Проверьте настройки CORS в backend
3. Проверьте URL в .env файле

### Ошибка порта:
1. Проверьте, что порт 5173 свободен
2. Измените порт в vite.config.ts
3. Убедитесь, что нет других процессов

### Ошибка зависимостей:
1. Удалите node_modules и package-lock.json
2. Выполните `npm install`
3. Проверьте версии Node.js и npm

## 📚 Дополнительные ресурсы

- [React документация](https://react.dev/)
- [TypeScript документация](https://www.typescriptlang.org/docs/)
- [Vite документация](https://vitejs.dev/)
- [Tailwind CSS документация](https://tailwindcss.com/docs)
- [shadcn/ui документация](https://ui.shadcn.com/)
- [Zustand документация](https://github.com/pmndrs/zustand)
- [React Router документация](https://reactrouter.com/) 
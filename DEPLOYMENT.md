# 🚀 Быстрое развертывание AI Life Dashboard

Пошаговое руководство по развертыванию проекта на новом компьютере.

## ⚡ Экспресс-развертывание (5 минут)

### 1. Подготовка системы

#### Windows:
```powershell
# Установка Chocolatey (если не установлен)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Установка необходимых компонентов
choco install python nodejs postgresql git -y
```

#### macOS:
```bash
# Установка Homebrew (если не установлен)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Установка необходимых компонентов
brew install python@3.11 node@20 postgresql@15 git
```

#### Ubuntu/Debian:
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых компонентов
sudo apt install python3.11 python3.11-venv python3.11-pip postgresql postgresql-contrib git curl -y

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Клонирование проекта

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd Pyproject

# Проверьте структуру
ls -la
```

### 3. Настройка базы данных

```bash
# Запустите PostgreSQL
# Windows:
# PostgreSQL запускается автоматически как служба

# macOS:
brew services start postgresql@15

# Ubuntu:
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создайте базу данных
sudo -u postgres psql -c "CREATE USER dashboard_user WITH PASSWORD 'dashboard123';"
sudo -u postgres psql -c "CREATE DATABASE dashboard_db OWNER dashboard_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dashboard_db TO dashboard_user;"
```

### 4. Настройка Backend

```bash
# Перейдите в папку backend
cd backend

# Создайте виртуальное окружение
python -m venv venv

# Активируйте виртуальное окружение
# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

# Установите зависимости
pip install -r requirements.txt

# Создайте файл .env
cat > .env << EOF
DATABASE_URL=postgresql+psycopg2://dashboard_user:dashboard123@localhost:5432/dashboard_db
POSTGRES_USER=dashboard_user
POSTGRES_PASSWORD=dashboard123
POSTGRES_DB=dashboard_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
SECRET_KEY=your_super_secret_key_here_make_it_long_and_random_12345
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=True
HOST=0.0.0.0
PORT=8000
EOF

# Создайте таблицы в базе данных
python -c "from main import app; from models import Base; from database import engine; Base.metadata.create_all(bind=engine)"
```

### 5. Настройка Frontend

```bash
# Перейдите в папку frontend
cd ../frontend

# Установите зависимости
npm install

# Создайте файл .env
cat > .env << EOF
VITE_API_URL=http://localhost:8000
VITE_DEV_MODE=true
VITE_APP_TITLE=AI Life Dashboard
VITE_APP_VERSION=1.0.0
EOF
```

### 6. Запуск приложения

#### Терминал 1 - Backend:
```bash
# Перейдите в папку backend
cd backend

# Активируйте виртуальное окружение
# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

# Запустите сервер
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Терминал 2 - Frontend:
```bash
# Перейдите в папку frontend
cd frontend

# Запустите сервер разработки
npm run dev
```

### 7. Проверка работы

Откройте браузер и перейдите по адресам:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API документация**: http://localhost:8000/docs

## 🔧 Детальное развертывание

### Требования к системе

| Компонент | Минимальная версия | Рекомендуемая версия |
|-----------|-------------------|---------------------|
| Python | 3.8 | 3.11+ |
| Node.js | 18 | 20+ |
| PostgreSQL | 12 | 15+ |
| RAM | 4 GB | 8 GB+ |
| Диск | 2 GB | 5 GB+ |

### Проверка установки

```bash
# Проверьте версии
python --version
node --version
npm --version
psql --version

# Должны быть:
# Python: 3.8.x или выше
# Node.js: v18.x.x или выше
# npm: 9.x.x или выше
# PostgreSQL: 12.x или выше
```

### Настройка переменных окружения

#### Backend (.env):
```bash
# База данных
DATABASE_URL=postgresql+psycopg2://dashboard_user:your_password@localhost:5432/dashboard_db
POSTGRES_USER=dashboard_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=dashboard_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Безопасность
SECRET_KEY=your_super_secret_key_here_make_it_long_and_random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Настройки приложения
DEBUG=True
HOST=0.0.0.0
PORT=8000
```

#### Frontend (.env):
```bash
# API URL
VITE_API_URL=http://localhost:8000

# Режим разработки
VITE_DEV_MODE=true

# Дополнительные настройки
VITE_APP_TITLE=AI Life Dashboard
VITE_APP_VERSION=1.0.0
```

## 🐳 Docker развертывание

### Docker Compose

Создайте файл `docker-compose.yml` в корне проекта:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+psycopg2://dashboard_user:password@db:5432/dashboard_db
      - POSTGRES_USER=dashboard_user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=dashboard_db
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
      - SECRET_KEY=your_super_secret_key_here
      - ALGORITHM=HS256
      - ACCESS_TOKEN_EXPIRE_MINUTES=30
      - DEBUG=True
    depends_on:
      - db
    volumes:
      - ./backend:/app
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_DEV_MODE=true
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=dashboard_user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=dashboard_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Запуск с Docker:

```bash
# Сборка и запуск всех сервисов
docker-compose up --build

# Запуск в фоновом режиме
docker-compose up -d --build

# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f
```

## 🔒 Продакшен развертывание

### Backend (продакшен):

```bash
# Создайте файл .env.prod
cat > backend/.env.prod << EOF
DATABASE_URL=postgresql+psycopg2://dashboard_user:strong_password@localhost:5432/dashboard_db
POSTGRES_USER=dashboard_user
POSTGRES_PASSWORD=strong_password
POSTGRES_DB=dashboard_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
SECRET_KEY=your_production_secret_key_here_make_it_very_long_and_random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=False
HOST=0.0.0.0
PORT=8000
EOF

# Запуск с Gunicorn
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend (продакшен):

```bash
# Создайте продакшен сборку
npm run build

# Создайте файл .env.prod
cat > frontend/.env.prod << EOF
VITE_API_URL=https://your-api-domain.com
VITE_DEV_MODE=false
VITE_APP_TITLE=AI Life Dashboard
VITE_APP_VERSION=1.0.0
EOF

# Разместите содержимое папки dist/ на веб-сервере
# Например, на nginx или Apache
```

### Nginx конфигурация:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/ai-life-dashboard/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🆘 Решение проблем

### Частые ошибки:

#### 1. Ошибка подключения к PostgreSQL:
```bash
# Проверьте статус PostgreSQL
# Windows:
sc query postgresql

# macOS:
brew services list | grep postgresql

# Ubuntu:
sudo systemctl status postgresql

# Проверьте подключение
psql -h localhost -U dashboard_user -d dashboard_db
```

#### 2. Ошибка портов:
```bash
# Проверьте занятые порты
# Windows:
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# macOS/Linux:
lsof -i :8000
lsof -i :5173

# Убейте процессы если нужно
# Windows:
taskkill /PID <PID> /F

# macOS/Linux:
kill -9 <PID>
```

#### 3. Ошибка зависимостей:
```bash
# Backend
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate  # или venv\Scripts\activate на Windows
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 4. Ошибка CORS:
```bash
# Проверьте настройки CORS в backend/main.py
# Убедитесь, что frontend URL добавлен в allow_origins
```

### Логи и отладка:

```bash
# Backend логи
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level debug

# Frontend логи
cd frontend
npm run dev -- --debug

# PostgreSQL логи
# Windows: Проверьте Event Viewer
# macOS: tail -f /usr/local/var/log/postgres.log
# Ubuntu: sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 📞 Поддержка

При возникновении проблем:

1. **Проверьте логи** - они содержат подробную информацию об ошибках
2. **Убедитесь в правильности настроек** - проверьте .env файлы
3. **Проверьте версии** - убедитесь, что все компоненты совместимы
4. **Создайте issue** - опишите проблему с логами и конфигурацией

### Полезные команды:

```bash
# Проверка здоровья системы
curl http://localhost:8000/health

# Проверка API документации
curl http://localhost:8000/docs

# Проверка frontend
curl http://localhost:5173

# Проверка базы данных
psql -h localhost -U dashboard_user -d dashboard_db -c "SELECT version();"
``` 
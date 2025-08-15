# Backend - AI Life Dashboard

FastAPI сервер с PostgreSQL базой данных для AI Life Dashboard.

## 📋 Требования

### Обязательные:
- **Python**: 3.8+ (рекомендуется 3.11+)
- **PostgreSQL**: 12+ (рекомендуется 15+)
- **pip**: последняя версия

### Опциональные:
- **Docker**: для контейнеризации
- **Poetry**: для управления зависимостями

## 🚀 Установка и настройка

### 1. Установка Python

#### Windows:
```powershell
# Скачайте Python с официального сайта
# https://www.python.org/downloads/
# Или используйте winget
winget install Python.Python.3.11
```

#### macOS:
```bash
# Используя Homebrew
brew install python@3.11

# Или скачайте с официального сайта
# https://www.python.org/downloads/
```

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-pip
```

### 2. Установка PostgreSQL

#### Windows:
```powershell
# Скачайте с официального сайта
# https://www.postgresql.org/download/windows/
# Или используйте winget
winget install PostgreSQL.PostgreSQL
```

#### macOS:
```bash
# Используя Homebrew
brew install postgresql@15
brew services start postgresql@15
```

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Настройка базы данных

#### Создание пользователя и базы данных:

```bash
# Подключитесь к PostgreSQL
sudo -u postgres psql

# Создайте пользователя
CREATE USER dashboard_user WITH PASSWORD 'your_secure_password';

# Создайте базу данных
CREATE DATABASE dashboard_db OWNER dashboard_user;

# Предоставьте права
GRANT ALL PRIVILEGES ON DATABASE dashboard_db TO dashboard_user;

# Выйдите из psql
\q
```

### 4. Настройка окружения

#### Создайте файл `.env` в папке `backend/`:

```bash
# База данных
DATABASE_URL=postgresql+psycopg2://dashboard_user:your_secure_password@localhost:5432/dashboard_db
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

### 5. Установка зависимостей

#### Создание виртуального окружения:

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
```

#### Установка зависимостей:

```bash
# Обновите pip
pip install --upgrade pip

# Установите зависимости
pip install -r requirements.txt
```

### 6. Инициализация базы данных

```bash
# Применение миграций (если используете Alembic)
alembic upgrade head

# Или создание таблиц напрямую (если миграции не настроены)
python -c "from main import app; from models import Base; from database import engine; Base.metadata.create_all(bind=engine)"
```

## 🏃‍♂️ Запуск

### Режим разработки:

```bash
# Убедитесь, что виртуальное окружение активировано
# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

# Запустите сервер
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Режим продакшена:

```bash
# Создайте файл .env.prod с продакшен настройками
# Запустите сервер
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📊 Проверка работы

После запуска сервера:

1. **API документация**: http://localhost:8000/docs
2. **Альтернативная документация**: http://localhost:8000/redoc
3. **Статус API**: http://localhost:8000/health

## 🔧 Конфигурация

### Основные настройки в `config.py`:

- `DATABASE_URL`: URL подключения к базе данных
- `SECRET_KEY`: секретный ключ для JWT токенов
- `ALGORITHM`: алгоритм шифрования (HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: время жизни токена

### Переменные окружения:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `DATABASE_URL` | URL базы данных | `postgresql+psycopg2://dashboard_user:password@localhost:5432/dashboard_db` |
| `POSTGRES_USER` | Пользователь БД | `dashboard_user` |
| `POSTGRES_PASSWORD` | Пароль БД | `password` |
| `POSTGRES_DB` | Имя БД | `dashboard_db` |
| `POSTGRES_HOST` | Хост БД | `localhost` |
| `POSTGRES_PORT` | Порт БД | `5432` |
| `SECRET_KEY` | Секретный ключ | Генерируется автоматически |
| `DEBUG` | Режим отладки | `True` |

## 🗄️ База данных

### Структура базы данных:

- **users** - Пользователи системы
- **tasks** - Задачи
- **projects** - Проекты
- **employees** - Сотрудники
- **transactions** - Финансовые транзакции
- **goals** - Цели
- **notes** - Заметки
- **reading_items** - Список для чтения

### Миграции:

```bash
# Создание новой миграции
alembic revision --autogenerate -m "Описание изменений"

# Применение миграций
alembic upgrade head

# Откат миграции
alembic downgrade -1
```

## 🔒 Безопасность

### Аутентификация:
- JWT токены
- Хеширование паролей с bcrypt
- Время жизни токенов

### CORS:
- Настроен для localhost:5173 (frontend)
- Настроен для localhost:3000 (альтернативный порт)

### Валидация:
- Pydantic схемы для всех входных данных
- Проверка типов данных
- Санитизация входных данных

## 🐛 Отладка

### Логирование:

```python
import logging

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
```

### Проверка подключения к БД:

```bash
# Тест подключения
python -c "from database import engine; print('Подключение к БД:', engine.url)"
```

### Проверка переменных окружения:

```bash
# Windows:
echo %DATABASE_URL%

# macOS/Linux:
echo $DATABASE_URL
```

## 📦 Развертывание

### Docker:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+psycopg2://dashboard_user:password@db:5432/dashboard_db
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=dashboard_user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=dashboard_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🆘 Решение проблем

### Ошибка подключения к БД:
1. Проверьте, что PostgreSQL запущен
2. Проверьте правильность DATABASE_URL
3. Убедитесь, что пользователь и база данных созданы

### Ошибка импорта модулей:
1. Активируйте виртуальное окружение
2. Установите зависимости: `pip install -r requirements.txt`

### Ошибка порта:
1. Проверьте, что порт 8000 свободен
2. Измените порт в команде запуска

### Ошибка миграций:
1. Убедитесь, что Alembic настроен
2. Проверьте права доступа к БД
3. Создайте таблицы вручную при необходимости

## 📚 Дополнительные ресурсы

- [FastAPI документация](https://fastapi.tiangolo.com/)
- [SQLAlchemy документация](https://docs.sqlalchemy.org/)
- [PostgreSQL документация](https://www.postgresql.org/docs/)
- [Alembic документация](https://alembic.sqlalchemy.org/) 
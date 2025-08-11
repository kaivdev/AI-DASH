# Dashboard Backend API

FastAPI backend для управления данными дашборда с интеграцией PostgreSQL.

## Установка

1. Установите PostgreSQL и создайте базу данных:
```sql
CREATE DATABASE dashboard_db;
CREATE USER dashboard_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE dashboard_db TO dashboard_user;
```

2. Установите Python зависимости:
```bash
pip install -r requirements.txt
```

3. Создайте файл `.env` в корне папки backend:
```env
DATABASE_URL=postgresql://dashboard_user:your_password_here@localhost:5432/dashboard_db
POSTGRES_USER=dashboard_user
POSTGRES_PASSWORD=your_password_here
POSTGRES_DB=dashboard_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

## Миграции

Создайте первую миграцию:
```bash
alembic revision --autogenerate -m "Initial migration"
```

Примените миграции:
```bash
alembic upgrade head
```

## Запуск

Запустите сервер разработки:
```bash
python main.py
```

Или используя uvicorn:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API будет доступно по адресу: http://localhost:8000
Автоматическая документация Swagger: http://localhost:8000/docs

## API Endpoints

### Сотрудники
- `GET /api/employees` - Получить всех сотрудников
- `POST /api/employees` - Создать сотрудника
- `PUT /api/employees/{id}` - Обновить сотрудника
- `PUT /api/employees/{id}/status` - Обновить статус сотрудника
- `DELETE /api/employees/{id}` - Удалить сотрудника

### Проекты
- `GET /api/projects` - Получить все проекты
- `POST /api/projects` - Создать проект
- `PUT /api/projects/{id}` - Обновить проект
- `DELETE /api/projects/{id}` - Удалить проект
- `POST /api/projects/{id}/members` - Добавить участника
- `DELETE /api/projects/{id}/members/{employee_id}` - Удалить участника
- `POST /api/projects/{id}/links` - Добавить ссылку
- `DELETE /api/projects/{id}/links/{link_id}` - Удалить ссылку

### Финансы
- `GET /api/transactions` - Получить все транзакции
- `POST /api/transactions` - Создать транзакцию
- `PUT /api/transactions/{id}` - Обновить транзакцию
- `DELETE /api/transactions/{id}` - Удалить транзакцию

### Задачи
- `GET /api/tasks` - Получить все задачи
- `POST /api/tasks` - Создать задачу
- `PUT /api/tasks/{id}` - Обновить задачу
- `PUT /api/tasks/{id}/toggle` - Переключить статус выполнения
- `DELETE /api/tasks/{id}` - Удалить задачу

### Цели
- `GET /api/goals` - Получить все цели
- `POST /api/goals` - Создать цель
- `PUT /api/goals/{id}` - Обновить цель
- `PUT /api/goals/{id}/progress` - Обновить прогресс
- `DELETE /api/goals/{id}` - Удалить цель

### Reading List
- `GET /api/reading` - Получить все элементы
- `POST /api/reading` - Создать элемент
- `PUT /api/reading/{id}` - Обновить элемент
- `PUT /api/reading/{id}/reading` - Отметить как читаемое
- `PUT /api/reading/{id}/completed` - Отметить как прочитанное
- `DELETE /api/reading/{id}` - Удалить элемент

### Заметки
- `GET /api/notes` - Получить все заметки
- `POST /api/notes` - Создать заметку
- `PUT /api/notes/{id}` - Обновить заметку
- `DELETE /api/notes/{id}` - Удалить заметку

## Структура проекта

```
backend/
├── alembic/                 # Миграции базы данных
├── main.py                  # Главный файл FastAPI
├── models.py                # SQLAlchemy модели
├── schemas.py               # Pydantic схемы
├── crud.py                  # CRUD операции
├── database.py              # Настройка БД
├── config.py                # Конфигурация
├── requirements.txt         # Зависимости
└── README.md               # Документация
``` 
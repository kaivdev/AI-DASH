# AI Life Dashboard

Полнофункциональное веб-приложение для управления жизнью, включающее модули для задач, проектов, сотрудников, финансов, целей, заметок и многого другого.

## 🏗️ Архитектура проекта

Проект состоит из двух основных частей:
- **Backend** - FastAPI сервер с PostgreSQL базой данных
- **Frontend** - React приложение с TypeScript и Tailwind CSS

## 📋 Требования к системе

### Минимальные требования:
- **ОС**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **RAM**: 4 GB
- **Диск**: 2 GB свободного места
- **Python**: 3.8+
- **Node.js**: 18+
- **PostgreSQL**: 12+

### Рекомендуемые требования:
- **RAM**: 8 GB
- **Диск**: 5 GB свободного места
- **Python**: 3.11+
- **Node.js**: 20+

## 🚀 Быстрый старт

1. **Клонируйте репозиторий:**
   ```bash
   git clone <repository-url>
   cd Pyproject
   ```

2. **Настройте базу данных:**
   ```bash
   cd backend
   # Следуйте инструкциям в backend/README.md
   ```

3. **Запустите backend:**
   ```bash
   cd backend
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Запустите frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Откройте приложение:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API документация: http://localhost:8000/docs

## 📁 Структура проекта

```
Pyproject/
├── backend/                 # FastAPI сервер
│   ├── main.py             # Основной файл приложения
│   ├── models.py           # Модели базы данных
│   ├── schemas.py          # Pydantic схемы
│   ├── crud.py             # CRUD операции
│   ├── database.py         # Настройки БД
│   ├── config.py           # Конфигурация
│   └── requirements.txt    # Python зависимости
├── frontend/               # React приложение
│   ├── src/
│   │   ├── app/           # Основные компоненты
│   │   ├── components/    # UI компоненты
│   │   ├── features/      # Модули приложения
│   │   ├── stores/        # Zustand стейт менеджер
│   │   └── types/         # TypeScript типы
│   └── package.json       # Node.js зависимости
└── README.md              # Этот файл
```

## 🔧 Модули приложения

- **Tasks** - Управление задачами и временем
- **Projects** - Управление проектами
- **Employees** - Управление сотрудниками
- **Finance** - Финансовый учет
- **Goals** - Постановка и отслеживание целей
- **Notes** - Заметки и идеи
- **Reading List** - Список для чтения
- **Metrics** - Аналитика и метрики

## 📚 Документация

- [Backend README](backend/README.md) - Подробная инструкция по настройке backend
- [Frontend README](frontend/README.md) - Подробная инструкция по настройке frontend
- [API Documentation](http://localhost:8000/docs) - Swagger документация API

## 🛠️ Разработка

### Backend разработка:
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend разработка:
```bash
cd frontend
npm run dev
```

### Сборка для продакшена:
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm run build
```

## 🔒 Безопасность

- Все пароли хешируются с использованием bcrypt
- JWT токены для аутентификации
- CORS настроен для безопасности
- Валидация данных на уровне API

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Создайте Pull Request

## 📄 Лицензия

Этот проект распространяется под лицензией MIT.

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте документацию в папках backend/ и frontend/
2. Убедитесь, что все зависимости установлены
3. Проверьте логи сервера
4. Создайте issue в репозитории

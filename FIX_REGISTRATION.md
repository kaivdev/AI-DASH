# Исправление проблемы с регистрацией без кода

## Проблема

На продакшн-сервере при попытке регистрации без инвайт-кода выдается ошибка "Invalid registration code", хотя на localhost всё работает корректно.

## Причина

Фронтенд иногда отправляет пустую строку `""` вместо `null` для поля `code`. Разные браузеры и версии фронтенда могут вести себя по-разному.

## Решение

Обновлены файлы `backend/main.py` и `backend/schemas.py` для корректной обработки пустых строк как отсутствующего кода.

### Изменения в коде

#### backend/main.py
```python
# Добавлена строка для обработки пустых строк
if not raw_code:
    raw_code = None
```

#### backend/schemas.py  
```python
# Добавлен валидатор для поля code
@field_validator('code')
@classmethod
def empty_string_to_none(cls, v):
    if isinstance(v, str) and not v.strip():
        return None
    return v
```

## Обновление на сервере

1. **Обновить код из репозитория:**
```bash
cd /opt/ai-dashboard
git pull origin main
```

2. **Перезапустить backend сервис:**
```bash
sudo systemctl restart ai-dashboard.service
sudo systemctl status ai-dashboard.service --no-pager
```

3. **Проверить логи:**
```bash
sudo journalctl -u ai-dashboard.service -n 50 --no-pager
```

4. **Тест регистрации:**
```bash
curl -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "code": ""
  }'
```

## Диагностика

Если проблема продолжается:

1. **Проверить структуру запроса:**
```bash
# Смотреть логи nginx для анализа запросов
sudo tail -f /var/log/nginx/access.log
```

2. **Проверить различия в запросах:**
```bash
# Сравнить запросы с localhost и продакшена
# Возможные различия: User-Agent, Content-Type, структура JSON
```

3. **Проверить версию Pydantic:**
```bash
cd /opt/ai-dashboard/backend
source venv/bin/activate
pip show pydantic
```

Теперь регистрация без кода должна работать корректно и пользователь будет автоматически становиться owner новой организации.

# Настройка автоматической активации виртуального окружения

## Способ 1: Использование VS Code (Рекомендуется)

1. Откройте проект в VS Code
2. VS Code автоматически определит настройки из `.vscode/settings.json`
3. При открытии нового терминала будет автоматически активировано виртуальное окружение
4. Используйте команды из меню `Terminal > Run Task...`:
   - `Start Backend Server` - запуск FastAPI сервера
   - `Start Frontend Server` - запуск React сервера
   - `Start Both Servers` - запуск обоих серверов

## Способ 2: Батник для Windows

Дважды кликните на `start_project.bat` - откроется PowerShell с активированным виртуальным окружением.

## Способ 3: Ручной запуск PowerShell скрипта

```powershell
cd "G:\DashBoard\Pyproject"
.\activate_venv.ps1
```

## Способ 4: Настройка глобального профиля PowerShell

1. Откройте PowerShell как администратор
2. Выполните команду для проверки пути к профилю:
   ```powershell
   $PROFILE
   ```
3. Создайте профиль, если его нет:
   ```powershell
   New-Item -Path $PROFILE -Type File -Force
   ```
4. Добавьте в профиль функцию для быстрого перехода к проекту:
   ```powershell
   function Start-DashboardProject {
       Set-Location "G:\DashBoard\Pyproject"
       & ".\activate_venv.ps1"
   }
   
   # Создаем алиас для удобства
   Set-Alias -Name dashboard -Value Start-DashboardProject
   ```
5. Перезапустите PowerShell
6. Теперь можно использовать команду `dashboard` из любой папки

## Способ 5: Создание ярлыка на рабочем столе

1. Создайте ярлык на рабочем столе
2. В поле "Объект" укажите:
   ```
   powershell.exe -NoExit -ExecutionPolicy Bypass -File "G:\DashBoard\Pyproject\activate_venv.ps1"
   ```
3. В поле "Рабочая папка" укажите:
   ```
   G:\DashBoard\Pyproject
   ```

## Полезные команды после активации окружения

```bash
# Переход в backend и запуск сервера
cd backend
python -m uvicorn main:app --reload

# В новом терминале: переход в frontend и запуск сервера
cd frontend  
npm run dev

# Установка новых Python пакетов
pip install package_name

# Обновление requirements.txt
pip freeze > backend/requirements.txt

# Установка новых npm пакетов
cd frontend
npm install package_name
```

## Решение проблем

### Если PowerShell блокирует выполнение скриптов:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Если виртуальное окружение не найдено:
```bash
# Создание нового виртуального окружения
python -m venv .venv

# Активация и установка зависимостей
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

# Скрипт для автоматической активации виртуального окружения
# Сохраните этот файл как activate_venv.ps1 в корне проекта

# Определяем путь к проекту
$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Проверяем наличие виртуального окружения
$VenvPath = ""
if (Test-Path "$ProjectPath\.venv\Scripts\Activate.ps1") {
    $VenvPath = "$ProjectPath\.venv\Scripts\Activate.ps1"
    Write-Host "Найдено виртуальное окружение в .venv/" -ForegroundColor Green
} elseif (Test-Path "$ProjectPath\venv\Scripts\Activate.ps1") {
    $VenvPath = "$ProjectPath\venv\Scripts\Activate.ps1"
    Write-Host "Найдено виртуальное окружение в venv/" -ForegroundColor Green
} else {
    Write-Host "Виртуальное окружение не найдено!" -ForegroundColor Red
    Write-Host "Создайте виртуальное окружение командой: python -m venv .venv" -ForegroundColor Yellow
    return
}

# Активируем виртуальное окружение
try {
    & $VenvPath
    Write-Host "Виртуальное окружение активировано!" -ForegroundColor Green
    Write-Host "Текущая директория: $ProjectPath" -ForegroundColor Cyan
    
    # Переходим в директорию проекта
    Set-Location $ProjectPath
    
    # Показываем доступные команды
    Write-Host "`nДоступные команды:" -ForegroundColor Yellow
    Write-Host "  cd backend    - перейти в папку backend" -ForegroundColor White
    Write-Host "  cd frontend   - перейти в папку frontend" -ForegroundColor White
    Write-Host "  python -m uvicorn main:app --reload  - запуск backend сервера" -ForegroundColor White
    Write-Host "  npm run dev   - запуск frontend сервера (из папки frontend)" -ForegroundColor White
    
} catch {
    Write-Host "Ошибка при активации виртуального окружения: $($_.Exception.Message)" -ForegroundColor Red
}

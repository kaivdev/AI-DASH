AI Life Dashboard — TODO/Build Plan (UI‑only, mocks)
 
Цель этого документа: поэтапный план реализации фронтенда (без бэка) на React + TypeScript + TailwindCSS + shadcn/ui. На выходе — рабочий интерфейс с подключаемыми модулями, заметками, TODO и базовыми финансовыми операциями (моки + localStorage).
 
⸻
 
0) Repo scaffold (день 0)
	•	pnpm create vite@latest ai-life-dash --template react-ts
	•	Tailwind + shadcn/ui + lucide-react
	•	tailwindcss + postcss + autoprefixer
	•	настроить tailwind.config.ts (container, screens, colors css-vars)
	•	добавить @/lib/utils (cn), @/components/ui (генератор shadcn)
	•	установить: @tanstack/react-query, zustand, zod, react-hook-form, @tanstack/react-table, date-fns
	•	подключить sonner или shadcn toast для уведомлений
	•	Базовый layout + маршрутизация (один роут /)
 
Глобальные стили: font-sans, bg-background text-foreground, scroll-smooth, selection:bg-primary/20.
 
⸻
 
1) Дизайн‑система и UI‑инвентарь
 
Компоненты берём из shadcn/ui (через CLI генератор):
	•	Основные: button, card, input, textarea, checkbox, badge, separator, skeleton, scroll-area, tooltip.
	•	Формы: form (RHForm биндинги), select, radio-group, switch, popover, calendar, command, dialog, dropdown-menu, sheet, tabs
	•	Таблицы: базовые table + интеграция с TanStack Table (DataTable шаблон)
	•	Разное: progress, avatar, collapsible, resizable (если нужен сплит)
 
Итог спринта: единый стиль Card‑виджетов, типографика, цветовая схема, токены в :root (совместимы с PRD).
 
⸻
 
2) Архитектура UI и GRID‑сетка (адаптивные модули)
 
Идея: «полка» модулей в одной странице, каждый — Card‑виджет. Можно включать/выключать, менять порядок.
 
Сетка контейнера
 
<div class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] auto-rows-[220px] gap-4">
  <!-- ModuleCards внутри -->
</div>
 
	•	auto-fill + minmax(320px, 1fr) — корректно ужимает/раскладывает карточки при любом количестве модулей
	•	auto-rows задаёт базовую высоту строки; карточки масштабируются через row-span-N
 
Размеры карточек (Tailwind утилиты):
	•	size=1x1 → col-span-1 row-span-1
	•	size=2x1 → col-span-2 row-span-1
	•	size=2x2 → col-span-2 row-span-2
 
ModuleCard API
 
interface ModuleCardProps {
  id: string;
  title: string;
  size?: '1x1'|'2x1'|'2x2';
  footer?: React.ReactNode;
  children: React.ReactNode;
}
 
В шапке DropdownMenu с действиями: Hide, Resize (1x1/2x1/2x2), Move up/down.
 
⸻
 
3) Модульная система (UI‑реестр)
	•	features/modules/registry.tsx — карта доступных модулей
 
export type ModuleKey = 'notes'|'tasks'|'finance'|'planner-placeholder'|'metrics';
export interface EnabledModule { key: ModuleKey; size:'1x1'|'2x1'|'2x2'; order:number }
 
	•	Zustand‑стор useModules()
	•	состояние: enabled: EnabledModule[]
	•	экшены: enable(key), disable(key), resize(key,size), reorder(key,dir), setOrder(list)
	•	персист: localStorage (middleware persist)
	•	ModulePicker (Dialog + Command)
	•	список всех модулей с Switch для включения/выключения
	•	drag‑reorder (опц.) через dnd-kit, но для MVP достаточно стрелок up/down
 
Acceptance: можно включить 0–N модулей; сетка корректно перестраивается.
 
⸻
 
4) Базовые сторы и мок‑данные
	•	Типы (из PRD) в @/types
	•	Zustand сторы: useNotes, useTasks, useFinance
	•	данные в памяти + persist в localStorage
	•	Сиды: по 3–5 заметок/тасков/транзакций, актуальные даты
	•	Ютилиты форматирования: formatCurrency, formatDate
 
⸻
 
5) Шелл приложения
	•	AppShell: Topbar + Sidebar (Projects позже) + MainGrid
	•	Topbar элементы:
	•	кнопка Add (DropdownMenu): Note / Task / Transaction
	•	ModulePicker
	•	Command Palette (Cmd+K) — быстрые действия
	•	Toaster/Toast для подтверждений
 
⸻
 
6) Модуль «Notes» (v0.1)
 
Вид: Card 2x1 или 1x1 (скроллимый список последних заметок).
 
Компоненты (shadcn): card, button, input, textarea, dialog, scroll-area, badge.
 
Интерфейсы
	•	Список заметок (дата, 1‑я строка текста, теги)
	•	Кнопка Add Note → Dialog c формой: date, title (опц.), content (textarea), tags (через Command или Input с #)
	•	Быстрый просмотр/редактирование по клику (Dialog)
	•	Поиск в списке (client‑side)
 
Acceptance: создать, отредактировать, удалить заметку; увидеть её в списке и в Command‑поиске.
 
⸻
 
7) Модуль «Tasks / TODO» (v0.1)
 
Вид: Card 1x1 (или 2x1 для длинного списка).
 
Компоненты: card, checkbox, input, select (priority), badge, dropdown-menu, dialog.
 
Интерфейсы
	•	Список: чекбоксы, короткое описание, приоритет (Badge: L/M/H), due‑date (серая подпись)
	•	Быстрое добавление (inline input + Enter)
	•	Меню задачи: Edit, Set priority, Set due (Popover + calendar), Delete
	•	Фильтры: All | Today | Overdue | Completed
 
Acceptance: добавить/отметить/отфильтровать задачи; при отметке done — уходит в нижний Collapsible.
 
⸻
 
8) Модуль «Finance (basic)» (v0.1)
 
Вид: Card 2x2 (таблица) + мини‑сводка.
 
Компоненты: card, table (+ TanStack Table), select, radio-group, popover+calendar, input, dialog, badge, tabs.
 
Интерфейсы
	•	Верхняя панель: месяц/период (Tabs: This month / Last / Custom)
	•	KPI‑чипсы: Доход, Расход, Баланс
	•	Таблица транзакций (колонки: Date, Type, Amount, Category, Project?, Description)
	•	Add Transaction (Dialog):
	•	Amount (input[type=number])
	•	Type (radio-group: income/expense)
	•	Date (popover + calendar)
	•	Category (command‑combobox)
	•	Description (input)
	•	Бейдж‑цвета для Type (зелёный/красный), категории — badge
 
Acceptance: добавить/редактировать/удалить транзакцию; KPI обновляются; сортировка/поиск по таблице.
 
⸻
 
9) Модуль «Metrics / Snapshot» (v0.1)
 
Вид: Card 1x1.
 
Компоненты: card, progress, badge.
 
Содержимое: «Заметок за неделю», «Выполнено задач за неделю», «Баланс месяца» (из моков). Нужен для проверки, что грид живёт с одним модулем.
 
Acceptance: можно оставить на странице только один модуль — сетка не ломается, карточка центрируется логично.
 
⸻
 
10) Командные действия (Command Palette)
	•	Cmd+K открывает command с разделами: Create (Note/Task/Tx), View (Notes/Tasks/Finance), Toggle Modules
	•	Поиск по заголовкам заметок/описаниям задач
	•	Экшены исполняются без перезагрузки
 
⸻
 
11) Настройки/персист
	•	useSettings (Zustand, persist): плотность сетки (--row-h), default module sizes, включённые модули
	•	Сброс данных (Danger zone) — очистка localStorage
	•	Импорт/экспорт моков в JSON (для переноса между машинами)
 
⸻
 
12) Полировка и пустые состояния
	•	Skeleton‑карточки при старте приложения
	•	Empty States для каждого модуля (с CTA: «Добавить заметку/задачу/транзакцию»)
	•	Tooltip‑подсказки в шапках модулей
	•	Нормальные клавиатурные шорткаты: N (note), T (task), X (transaction)
 
⸻
 
13) Критерии готовности v0.1
	•	Сетка корректно раскладывает 1 модуль, несколько, и «все сразу»
	•	Notes/Tasks/Finance выполняют свои CRUD‑операции на моках
	•	ModulePicker включает/выключает и меняет размер/порядок модулей
	•	Данные переживают перезагрузку (localStorage)
	•	Без ошибок в консоли, Lighthouse Performance ≥ 85 (SPA)
 
⸻
 
14) Структура проекта (предложение)
 
src/
  app/AppShell.tsx
  app/Topbar.tsx
  app/MainGrid.tsx
  features/
    modules/ModuleCard.tsx
    modules/ModulePicker.tsx
    modules/registry.tsx
    notes/NotesCard.tsx
    tasks/TasksCard.tsx
    finance/FinanceCard.tsx
    metrics/MetricsCard.tsx
  stores/
    useModules.ts
    useNotes.ts
    useTasks.ts
    useFinance.ts
    useSettings.ts
  components/ui/* (shadcn)
  lib/{date.ts,format.ts}
  types/{core.ts}
 
 
⸻
 
15) Риски/челлендж‑заметки (интеллектуальный оппонент)
	•	Без бэка быстро упрёмся в синхронизацию между устройствами. Если планируешь использовать и на ноуте, и на десктопе — либо экспорт/импорт JSON, либо сразу подумать про лёгкий бек (Supabase/D1).
	•	Финансы даже «базовые» без категорий/фильтров быстро станут неудобны — мы добавили минимально нужные. Проверь UX на 200+ строках.
	•	Grid‑размеры: 320px min ширины комфортна на 1440px мониторе. Если модулей много, появится вертикальный скролл — ок. Если хочешь drag‑and‑drop — добавим dnd-kit в v0.2.
 
⸻
 
16) План спринтов
 
Спринт 1 (2–3 дня): scaffold, UI‑инвентарь, GRID, ModulePicker, MetricsCard.
Спринт 2 (2 дня): NotesCard + TasksCard (CRUD, шоркаты).
Спринт 3 (2–3 дня): FinanceCard c таблицей и диалогом добавления, экспорт/импорт JSON, пустые состояния.
Спринт 4 (1 день): Полировка, Command Palette, Lighthouse, фиксы.
 
⸻
 
17) Мини‑спеки форм (для RHF + zod)
 
// Note
const NoteSchema = z.object({
  id: z.string(), date: z.string(), title: z.string().optional(),
  content: z.string().min(1), tags: z.array(z.string()).default([])
})
// Task
const TaskSchema = z.object({
  id: z.string(), content: z.string().min(1),
  priority: z.enum(['L','M','H']).default('M'),
  due: z.string().optional(), done: z.boolean().default(false)
})
// Transaction
const TxSchema = z.object({
  id: z.string(), type: z.enum(['income','expense']),
  amount: z.number().positive(), date: z.string(),
  category: z.string().optional(), description: z.string().optional()
})
 
 
⸻
 
18) Готовые шаблоны shadcn, которые точно нужны
	•	card, dialog, dropdown-menu, command, calendar(+popover), form, input, textarea, select, radio-group, checkbox, table, tabs, badge, tooltip, toast, scroll-area, skeleton.
 
После реализации пунктов 0–13 у тебя будет работающее UI‑MVP без бэка с подключаемыми модулями и удобной сеткой.
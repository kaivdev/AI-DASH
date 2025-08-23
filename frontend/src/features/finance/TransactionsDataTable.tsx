import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { Employee, Project, Transaction } from '@/types/core'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'
import QuickEditTransactionDialog from './QuickEditTransactionDialog'
import { useEmployees } from '@/stores/useEmployees'

export type TransactionsDataTableHandle = {
  clearSelection: () => void
  selectAllCurrentPage: () => void
  getSelectedIds: () => string[]
}

type Props = {
  data: Transaction[]
  employees: Employee[]
  projects: Project[]
  onDelete?: (id: string) => void
  onSelectionChange?: (ids: string[]) => void
  hoursByTask?: Map<string, number> | Record<string, number>
}

type Row = Transaction & {
  employeeName?: string
  projectName?: string
  tagsText?: string
  hours?: number
}

export const TransactionsDataTable = React.forwardRef<TransactionsDataTableHandle, Props>(
  ({ data, employees, projects, onDelete, onSelectionChange, hoursByTask }, ref) => {
  // debug: uncomment to trace renders
  // console.log('Component render', { dataLength: data.length, employeesLength: employees.length })
    
    // Мемоизируем данные для стабильности
    const memoData = React.useMemo(() => data, [data])
    const memoEmployees = React.useMemo(() => employees, [employees])
    const memoProjects = React.useMemo(() => projects, [projects])
    const formerEmployees = useEmployees((s) => s.formerEmployees)

    const rows = React.useMemo<Row[]>(() => {
      const empName = new Map<string, string>()
      for (const e of memoEmployees) empName.set(e.id, e.name)
      const projName = new Map<string, string>()
      for (const p of memoProjects) projName.set(p.id, p.name)
      const getHours = (taskId?: string) => {
        if (!taskId) return undefined
        if (!hoursByTask) return undefined
        if (hoursByTask instanceof Map) return hoursByTask.get(taskId)
        return (hoursByTask as Record<string, number>)[taskId]
      }
      return memoData.map((t) => {
        const rawName = t.employee_id ? empName.get(t.employee_id) : undefined
        const archived = t.employee_id ? formerEmployees?.[t.employee_id] : undefined
        const employeeName = t.employee_id
          ? rawName || (archived ? `${archived} (уволен)` : t.employee_id)
          : '-'
        return ({
          ...t,
          employeeName,
          projectName: t.project_id ? projName.get(t.project_id) || t.project_id : '-',
          tagsText: Array.isArray(t.tags) ? t.tags.join(', ') : '',
          hours: getHours(t.task_id),
        })
      })
    }, [memoData, memoEmployees, memoProjects, hoursByTask, formerEmployees])

  const handleDelete = React.useCallback((id: string) => {
      onDelete?.(id)
    }, [onDelete])

  const [editId, setEditId] = React.useState<string | null>(null)
  const editTx = React.useMemo(() => rows.find(r => r.id === editId), [rows, editId])

  const columns = React.useMemo<ColumnDef<Row>[]>(() => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={(value) => {
              console.log('Header checkbox clicked:', value)
              table.toggleAllPageRowsSelected(!!value)
              // Вызываем callback напрямую
              if (onSelectionChange) {
                setTimeout(() => {
                  const ids = table.getFilteredSelectedRowModel().rows.map((r) => r.original.id)
                  onSelectionChange(ids)
                }, 0)
              }
            }}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              console.log('Row checkbox clicked:', value, row.id)
              row.toggleSelected(!!value)
              // Вызываем callback напрямую
              if (onSelectionChange) {
                setTimeout(() => {
                  const ids = table.getFilteredSelectedRowModel().rows.map((r) => r.original.id)
                  onSelectionChange(ids)
                }, 0)
              }
            }}
            onMouseEnter={() => console.log('Checkbox hover enter:', row.id)}
            onMouseLeave={() => console.log('Checkbox hover leave:', row.id)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 32,
      },
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Дата
            {column.getIsSorted() === 'desc' ? (
              <ArrowUp className="ml-1 h-3.5 w-3.5" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowDown className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
            )}
          </Button>
        ),
        cell: ({ row }) => <div className="whitespace-nowrap">{formatDate(row.getValue('date'))}</div>,
        sortingFn: (rowA, rowB, columnId) => {
          const dateA = new Date(rowA.getValue(columnId) as string)
          const dateB = new Date(rowB.getValue(columnId) as string)
          return dateA.getTime() - dateB.getTime()
        },
      },
      {
        accessorKey: 'transaction_type',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-7 px-1 hover:bg-transparent"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Тип
            {column.getIsSorted() === 'desc' ? (
              <ArrowUp className="ml-1 h-3 w-3 opacity-70" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowDown className="ml-1 h-3 w-3 opacity-70" />
            ) : (
              <ArrowUpDown className="ml-1 h-3 w-3 opacity-70" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className={row.getValue<'income' | 'expense'>('transaction_type') === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {row.getValue('transaction_type') === 'income' ? 'доход' : 'расход'}
          </span>
        ),
        // сортируем по типу: expense (0) перед income (1) при возрастании
        sortingFn: (rowA, rowB, columnId) => {
          const val = (v: unknown) => (v === 'income' ? 1 : 0)
          return val(rowA.getValue(columnId)) - val(rowB.getValue(columnId))
        },
        size: 96,
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              className="h-7 px-1 hover:bg-transparent"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Сумма
              {column.getIsSorted() === 'desc' ? (
                <ArrowUp className="ml-1 h-3 w-3 opacity-70" />
              ) : column.getIsSorted() === 'asc' ? (
                <ArrowDown className="ml-1 h-3 w-3 opacity-70" />
              ) : (
                <ArrowUpDown className="ml-1 h-3 w-3 opacity-70" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const v = Number(row.getValue('amount'))
          return <div className="text-right font-medium tabular-nums whitespace-nowrap">{formatCurrency(Math.round(v), 'RUB')}</div>
        },
        sortingFn: (rowA, rowB, columnId) => {
          const amountA = Number(rowA.getValue(columnId))
          const amountB = Number(rowB.getValue(columnId))
          return amountA - amountB
        },
        size: 120,
      },
      { accessorKey: 'category', header: 'Категория', filterFn: (row, id, value) => {
        if (!value) return true
        return String(row.getValue(id) ?? '').toLowerCase().includes(String(value).toLowerCase())
      } },
      {
        accessorKey: 'hours',
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              className="h-7 px-1 hover:bg-transparent"
              onClick={() => {
                // First click -> descending (values сверху), second -> ascending
                const isDesc = column.getIsSorted() === 'desc'
                column.toggleSorting(isDesc ? false : true)
              }}
            >
              Часы
              {column.getIsSorted() === 'desc' ? (
                <ArrowUp className="ml-1 h-3 w-3 opacity-70" />
              ) : column.getIsSorted() === 'asc' ? (
                <ArrowDown className="ml-1 h-3 w-3 opacity-70" />
              ) : (
                <ArrowUpDown className="ml-1 h-3 w-3 opacity-70" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const v = row.getValue<number | undefined>('hours')
          return <div className="text-right tabular-nums whitespace-nowrap">{typeof v === 'number' ? Math.round(v) : '—'}</div>
        },
        // Всегда держим undefined внизу
        sortUndefined: 'last',
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue<number | undefined>(columnId)
          const b = rowB.getValue<number | undefined>(columnId)
          if (typeof a !== 'number' && typeof b !== 'number') return 0
          if (typeof a !== 'number') return 1
          if (typeof b !== 'number') return -1
          return a - b
        },
        size: 88,
      },
      { accessorKey: 'tagsText', header: 'Теги', filterFn: (row, id, value) => {
        if (!value) return true
        return String(row.getValue(id) ?? '').toLowerCase().includes(String(value).toLowerCase())
      } },
      {
        accessorKey: 'employeeName',
        header: ({ column }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span className="inline-flex items-center gap-1 cursor-pointer select-none">
                Сотрудник
                <ChevronDown className="h-3 w-3 opacity-70" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px]">
              <DropdownMenuLabel>Фильтр по сотруднику</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => column.setFilterValue(undefined)}>Все</DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.setFilterValue('__none__')}>Без сотрудника</DropdownMenuItem>
              <DropdownMenuSeparator />
              {memoEmployees.map((e) => (
                <DropdownMenuItem key={e.id} onClick={() => column.setFilterValue(e.id)}>
                  {e.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        // фильтрация по employee_id (или '__none__' если не указан)
        filterFn: (row, _id, value) => {
          if (!value) return true
          const key = (row.original as any).employee_id || '__none__'
          return key === value
        },
      },
      {
        accessorKey: 'projectName',
        header: ({ column }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span className="inline-flex items-center gap-1 cursor-pointer select-none">
                Проект
                <ChevronDown className="h-3 w-3 opacity-70" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px]">
              <DropdownMenuLabel>Фильтр по проекту</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => column.setFilterValue(undefined)}>Все</DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.setFilterValue('__none__')}>Без проекта</DropdownMenuItem>
              <DropdownMenuSeparator />
              {memoProjects.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => column.setFilterValue(p.id)}>
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        // фильтрация по project_id (или '__none__')
        filterFn: (row, _id, value) => {
          if (!value) return true
          const key = (row.original as any).project_id || '__none__'
          return key === value
        },
      },
      { accessorKey: 'description', header: 'Описание', filterFn: (row, id, value) => {
        if (!value) return true
        return String(row.getValue(id) ?? '').toLowerCase().includes(String(value).toLowerCase())
      } },
      {
        id: 'actions',
        enableHiding: false,
        header: '',
        cell: ({ row, table }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Действия</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setEditId(row.original.id)}>
                <Pencil className="mr-2 h-4 w-4" /> Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.original.id)}>Скопировать ID</DropdownMenuItem>
              <DropdownMenuSeparator />
              {handleDelete && (
                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(row.original.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Удалить
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
  ], [handleDelete, onSelectionChange, memoEmployees, memoProjects])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  // Глобальный фильтр для быстрого поиска по нескольким полям (OR)
  const [globalFilter, setGlobalFilter] = React.useState<string>("")
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const getRowId = React.useCallback((row: Row) => row.id, [])

    const table = useReactTable({
      data: rows,
      columns,
      getRowId,
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onGlobalFilterChange: setGlobalFilter,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      enableRowSelection: true,
      enableMultiRowSelection: true,
      // Глобальная функция фильтра: OR по category, tagsText, description, employeeName, projectName
      globalFilterFn: (row, _columnId, value) => {
        const q = String(value ?? '').toLowerCase().trim()
        if (!q) return true
        const toS = (v: unknown) => String(v ?? '').toLowerCase()
        const r = row.original as Row
        return [r.category, r.tagsText, r.description, r.employeeName, r.projectName].some((f) => toS(f).includes(q))
      },
      state: { 
        sorting, 
        columnFilters, 
        columnVisibility, 
        rowSelection,
        globalFilter,
      },
      initialState: {
        sorting: [{ id: 'date', desc: true }],
      },
    })

    // Убираем useEffect и используем только imperative handle
    // const prevSelectedIdsRef = React.useRef<string[]>([])
    // const rowSelectionStringRef = React.useRef<string>('')

    // const stableOnSelectionChange = React.useCallback((ids: string[]) => {
    //   onSelectionChange?.(ids)
    // }, [onSelectionChange])

    // React.useEffect(() => {
    //   const currentRowSelectionString = JSON.stringify(rowSelection)
      
    //   // Только если объект rowSelection действительно изменился
    //   if (currentRowSelectionString !== rowSelectionStringRef.current) {
    //     rowSelectionStringRef.current = currentRowSelectionString
        
    //     const ids = table.getFilteredSelectedRowModel().rows.map((r) => r.original.id)
    //     const prevIds = prevSelectedIdsRef.current
        
    //     console.log('Selection effect (REAL CHANGE):', { 
    //       newIds: ids, 
    //       prevIds, 
    //       rowSelectionKeys: Object.keys(rowSelection),
    //       changed: ids.length !== prevIds.length || !ids.every((id, index) => id === prevIds[index])
    //     })
        
    //     // Сравниваем массивы
    //     if (ids.length !== prevIds.length || !ids.every((id, index) => id === prevIds[index])) {
    //       prevSelectedIdsRef.current = ids
    //       stableOnSelectionChange(ids)
    //     }
    //   }
    // }, [rowSelection, stableOnSelectionChange]) // Убираем table из зависимостей

    React.useImperativeHandle(ref, () => ({
      clearSelection: () => table.resetRowSelection(),
      selectAllCurrentPage: () => table.toggleAllPageRowsSelected(true),
      getSelectedIds: () => table.getFilteredSelectedRowModel().rows.map((r) => r.original.id),
    }), [table])

  return (
      <div className="w-full">
        <div className="flex items-center gap-2 py-2">
          <Input
            placeholder="Поиск: категория, теги, описание, сотрудник, проект..."
            value={globalFilter}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="max-w-lg"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Колонки <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Нет данных.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-3">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} из {table.getFilteredRowModel().rows.length} выбрано.
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Предыдущая
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Следующая
            </Button>
          </div>
        </div>
        {editTx && (
          <QuickEditTransactionDialog open={!!editId} onClose={() => setEditId(null)} tx={editTx} />
        )}
      </div>
    )
  }
)

TransactionsDataTable.displayName = 'TransactionsDataTable'

export default React.memo(TransactionsDataTable)

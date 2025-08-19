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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Trash2 } from 'lucide-react'
import type { Employee, Project, Transaction } from '@/types/core'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'

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
}

type Row = Transaction & {
  employeeName?: string
  projectName?: string
  tagsText?: string
}

export const TransactionsDataTable = React.forwardRef<TransactionsDataTableHandle, Props>(
  ({ data, employees, projects, onDelete, onSelectionChange }, ref) => {
  // debug: uncomment to trace renders
  // console.log('Component render', { dataLength: data.length, employeesLength: employees.length })
    
    // Мемоизируем данные для стабильности
    const memoData = React.useMemo(() => data, [data])
    const memoEmployees = React.useMemo(() => employees, [employees])
    const memoProjects = React.useMemo(() => projects, [projects])

    const rows = React.useMemo<Row[]>(() => {
      const empName = new Map<string, string>()
      for (const e of memoEmployees) empName.set(e.id, e.name)
      const projName = new Map<string, string>()
      for (const p of memoProjects) projName.set(p.id, p.name)
      return memoData.map((t) => ({
        ...t,
        employeeName: t.employee_id ? empName.get(t.employee_id) || t.employee_id : '-',
        projectName: t.project_id ? projName.get(t.project_id) || t.project_id : '-',
        tagsText: Array.isArray(t.tags) ? t.tags.join(', ') : '',
      }))
    }, [memoData, memoEmployees, memoProjects])

    const handleDelete = React.useCallback((id: string) => {
      onDelete?.(id)
    }, [onDelete])

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
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
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
        header: 'Тип',
        cell: ({ row }) => (
          <span className={row.getValue<'income' | 'expense'>('transaction_type') === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {row.getValue('transaction_type') === 'income' ? 'доход' : 'расход'}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <div className="text-right">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Сумма
              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const v = Number(row.getValue('amount'))
          return <div className="text-right font-medium">{formatCurrency(Math.round(v), 'RUB')}</div>
        },
        sortingFn: (rowA, rowB, columnId) => {
          const amountA = Number(rowA.getValue(columnId))
          const amountB = Number(rowB.getValue(columnId))
          return amountA - amountB
        },
      },
      { accessorKey: 'category', header: 'Категория' },
      { accessorKey: 'tagsText', header: 'Теги' },
      { accessorKey: 'employeeName', header: 'Сотрудник' },
      { accessorKey: 'projectName', header: 'Проект' },
      { accessorKey: 'description', header: 'Описание' },
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
  ], [handleDelete, onSelectionChange])

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const getRowId = React.useCallback((row: Row) => row.id, [])

    const table = useReactTable({
      data: rows,
      columns,
      getRowId,
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      enableRowSelection: true,
      enableMultiRowSelection: true,
      state: { 
        sorting, 
        columnFilters, 
        columnVisibility, 
        rowSelection 
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
        <div className="flex items-center py-2">
          <Input
            placeholder="Фильтр по категории..."
            value={(table.getColumn('category')?.getFilterValue() as string) ?? ''}
            onChange={(event) => table.getColumn('category')?.setFilterValue(event.target.value)}
            className="max-w-sm"
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
      </div>
    )
  }
)

TransactionsDataTable.displayName = 'TransactionsDataTable'

export default React.memo(TransactionsDataTable)

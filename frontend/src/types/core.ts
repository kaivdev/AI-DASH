export type Priority = 'L' | 'M' | 'H'

export interface Note {
  id: string
  date: string
  title?: string
  content: string
  tags: string[]
}

export interface Task {
  id: string
  content: string
  priority: Priority
  due?: string
  done: boolean
}

export type TxType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TxType
  amount: number
  date: string
  category?: string
  description?: string
} 
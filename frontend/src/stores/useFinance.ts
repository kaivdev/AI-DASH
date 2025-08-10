import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction, TxType } from '@/types/core'

interface FinanceState {
  txs: Transaction[]
  add: (tx: Omit<Transaction, 'id'>) => void
  update: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void
  remove: (id: string) => void
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const today = new Date()
const iso = (d: Date) => d.toISOString().slice(0, 10)

const seed: Transaction[] = [
  { id: generateId(), type: 'income', amount: 1200, date: iso(new Date(today.getFullYear(), today.getMonth(), 1)), category: 'Salary', description: 'Monthly' },
  { id: generateId(), type: 'expense', amount: 150, date: iso(today), category: 'Groceries', description: 'Market' },
  { id: generateId(), type: 'expense', amount: 60, date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)), category: 'Transport' },
]

export const useFinance = create<FinanceState>()(
  persist(
    (set) => ({
      txs: seed,
      add: (tx) => set((state) => ({ txs: [{ id: generateId(), ...tx }, ...state.txs] })),
      update: (id, patch) =>
        set((state) => ({ txs: state.txs.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      remove: (id) => set((state) => ({ txs: state.txs.filter((t) => t.id !== id) })),
    }),
    { name: 'ai-life-finance' }
  )
) 
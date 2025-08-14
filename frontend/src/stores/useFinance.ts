import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction } from '@/types/core'
import { transactionApi } from '@/lib/api'

interface FinanceState {
  txs: Transaction[]
  loading?: boolean
  error?: string | null
  fetch: () => Promise<void>
  add: (tx: Omit<Transaction, 'id'>) => Promise<void>
  update: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => Promise<void>
  remove: (id: string) => Promise<void>
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useFinance = create<FinanceState>()(
  persist(
    (set, get) => ({
      txs: [],
      loading: false,
      error: null,

      fetch: async () => {
        set({ loading: true, error: null })
        try {
          const items = await transactionApi.getAll() as Transaction[]
          if (Array.isArray(items)) set({ txs: items, loading: false })
          else set({ loading: false })
        } catch (e) {
          console.error('Failed to fetch transactions', e)
          set({ loading: false, error: 'Failed to fetch transactions' })
        }
      },

      add: async (tx) => {
        set({ loading: true, error: null })
        try {
          const created = await transactionApi.create(tx as any) as Transaction
          set((s) => ({ txs: [created, ...s.txs], loading: false }))
        } catch (e) {
          console.error('Failed to add transaction', e)
          const local: Transaction = { id: generateId(), ...(tx as any) }
          set((s) => ({ txs: [local, ...s.txs], loading: false, error: 'Added locally (API unavailable)' }))
        }
      },

      update: async (id, patch) => {
        set({ loading: true, error: null })
        try {
          const updated = await transactionApi.update(id, patch) as Transaction
          set((s) => ({ txs: s.txs.map(t => t.id === id ? updated : t), loading: false }))
        } catch (e) {
          console.error('Failed to update transaction', e)
          set((s) => ({ txs: s.txs.map(t => t.id === id ? ({ ...t, ...(patch as any) }) : t), loading: false, error: 'Updated locally (API unavailable)' }))
        }
      },

      remove: async (id) => {
        set({ loading: true, error: null })
        try {
          await transactionApi.delete(id)
          set((s) => ({ txs: s.txs.filter(t => t.id !== id), loading: false }))
        } catch (e) {
          console.error('Failed to delete transaction', e)
          set((s) => ({ txs: s.txs.filter(t => t.id !== id), loading: false, error: 'Deleted locally (API unavailable)' }))
        }
      }
    }),
    { name: 'ai-life-finance', partialize: (s) => ({ txs: s.txs }) }
  )
) 
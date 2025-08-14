import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Employee } from '@/types/core'
import { employeeApi } from '@/lib/api'

interface EmployeesState {
  employees: Employee[]
  loading: boolean
  error: string | null
  fetchEmployees: (force?: boolean) => Promise<void>
  add: (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  update: (id: string, patch: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  updateStatus: (id: string, status: string, tag?: string) => Promise<void>
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const seed: Employee[] = [
  {
    id: generateId(),
    name: 'Алексей Иванов',
    position: 'Frontend Developer',
    email: 'alex@company.com',
    salary: 120000,
    revenue: 150000,
    current_status: 'Работаю над дашбордом',
    status_tag: 'development',
    status_date: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: generateId(),
    name: 'Мария Петрова',
    position: 'UI/UX Designer',
    email: 'maria@company.com',
    salary: 100000,
    revenue: 130000,
    current_status: 'Дизайн новых компонентов',
    status_tag: 'design',
    status_date: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

export const useEmployees = create<EmployeesState>()(
  persist(
    (set, get) => ({
      employees: seed,
      loading: false,
      error: null,
      
      fetchEmployees: async (force = false) => {
        // Загружаем с сервера только если локально пусто, либо если принудительно
        if (!force && get().employees && get().employees.length > 0) return
        set({ loading: true, error: null })
        try {
          const employees = await employeeApi.getAll() as Employee[]
          if (Array.isArray(employees) && employees.length > 0) {
            set({ employees, loading: false })
          } else {
            set({ loading: false })
          }
        } catch (error) {
          console.error('Failed to fetch employees:', error)
          set({ error: 'Failed to fetch employees', loading: false })
        }
      },

      add: async (employee) => {
        set({ loading: true, error: null })
        try {
                     const apiData = {
             name: employee.name,
             position: employee.position,
             email: employee.email || null,
             salary: employee.salary || null,
             revenue: employee.revenue || null,
             hourly_rate: (employee as any).hourly_rate || null,
             current_status: employee.current_status,
             status_tag: employee.status_tag || null,
             status_date: employee.status_date
           }
          
          const newEmployee = await employeeApi.create(apiData) as Employee
          set((state) => ({ 
            employees: [newEmployee, ...state.employees],
            loading: false
          }))
        } catch (error) {
          console.error('Failed to create employee:', error)
          const localEmployee: Employee = {
            id: generateId(),
            ...employee,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          set((state) => ({ 
            employees: [localEmployee, ...state.employees],
            loading: false,
            error: 'Added locally (API unavailable)'
          }))
        }
      },

      update: async (id, patch) => {
        set({ loading: true, error: null })
        try {
          const updatedEmployee = await employeeApi.update(id, patch) as Employee
          set((state) => ({ 
            employees: state.employees.map((e) => (e.id === id ? updatedEmployee : e)),
            loading: false
          }))
        } catch (error) {
          console.error('Failed to update employee:', error)
          set((state) => ({ 
            employees: state.employees.map((e) => 
              e.id === id ? { ...e, ...patch, updated_at: new Date().toISOString() } : e
            ),
            loading: false,
            error: 'Updated locally (API unavailable)'
          }))
        }
      },

      remove: async (id) => {
        set({ loading: true, error: null })
        try {
          await employeeApi.delete(id)
          set((state) => ({ 
            employees: state.employees.filter((e) => e.id !== id),
            loading: false
          }))
        } catch (error) {
          console.error('Failed to delete employee:', error)
          set((state) => ({ 
            employees: state.employees.filter((e) => e.id !== id),
            loading: false,
            error: 'Deleted locally (API unavailable)'
          }))
        }
      },

      updateStatus: async (id, status, tag) => {
        set({ loading: true, error: null })
        try {
          const updatedEmployee = await employeeApi.updateStatus(id, status, tag) as Employee
          set((state) => ({ 
            employees: state.employees.map((e) => (e.id === id ? updatedEmployee : e)),
            loading: false
          }))
        } catch (error) {
          console.error('Failed to update employee status:', error)
          set((state) => ({
            employees: state.employees.map((e) => 
              e.id === id 
                ? { 
                    ...e, 
                    current_status: status, 
                    status_tag: tag, 
                    status_date: new Date().toISOString().slice(0, 10),
                    updated_at: new Date().toISOString()
                  }
                : e
            ),
            loading: false,
            error: 'Updated locally (API unavailable)'
          }))
        }
      }
    }),
    { 
      name: 'ai-life-employees',
      partialize: (state) => ({ employees: state.employees })
    }
  )
) 
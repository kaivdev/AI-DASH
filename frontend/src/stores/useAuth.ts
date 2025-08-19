import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { API_BASE_URL } from '@/lib/api'
import { toast } from 'sonner'

interface AuthProfile {
	avatar_url?: string
	bio?: string
	phone?: string
	position?: string
	company?: string
	website?: string
	telegram?: string
	github?: string
	twitter?: string
	timezone?: string
	locale?: string
}

interface AuthUser {
	id: string
	name: string
	email: string
	role?: string
	profile?: AuthProfile
}

interface RegisterPayload {
	email: string
	password: string
	confirmPassword: string
	code: string
	firstName?: string
	lastName?: string
}

interface AuthState {
	user: AuthUser | null
	token: string | null
	loading: boolean
	error: string | null
	login: (email: string, password: string) => Promise<void>
	register: (p: RegisterPayload) => Promise<void>
	logout: () => void
	me: () => Promise<void>
}

function generateId() {
	return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const useBackendAuth = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_AUTH_BACKEND === '1'

export const useAuth = create<AuthState>()(
	persist(
		(set, get) => ({
			user: null,
			token: null,
			loading: false,
			error: null,

			login: async (email, password) => {
				set({ loading: true, error: null })
				if (!useBackendAuth) {
					const fakeUser: AuthUser = { id: generateId(), name: email.split('@')[0] || 'Пользователь', email }
					const fakeToken = generateId()
					set({ user: fakeUser, token: fakeToken, loading: false })
					toast.success('Вход выполнен')
					return
				}

				try {
					const resp = await fetch(`${API_BASE_URL}/auth/login`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email, password })
					})
					if (!resp.ok) {
						const txt = await resp.text()
						throw new Error(txt || 'Login failed')
					}
					const data = await resp.json()
					set({ user: data.user, token: data.token, loading: false })
					toast.success('Добро пожаловать!')
				} catch (e: any) {
					set({ loading: false, error: e?.message || 'Login error' })
					toast.error('Ошибка входа')
				}
			},

			register: async ({ email, password, confirmPassword, code, firstName, lastName }) => {
				set({ loading: true, error: null })
				if (!useBackendAuth) {
					if (code !== '667788') {
						set({ loading: false, error: 'Неверный код' })
						toast.error('Неверный код')
						return
					}
					if (password !== confirmPassword) {
						set({ loading: false, error: 'Пароли не совпадают' })
						toast.error('Пароли не совпадают')
						return
					}
					const fakeUser: AuthUser = { id: generateId(), name: email.split('@')[0] || 'Пользователь', email }
					const fakeToken = generateId()
					set({ user: fakeUser, token: fakeToken, loading: false })
					toast.success('Регистрация выполнена')
					return
				}
				try {
					// Do not send empty code field
					const payload: any = { email, password, confirm_password: confirmPassword, first_name: firstName, last_name: lastName }
					if (code && code.trim() !== '') payload.code = code.trim()
					const resp = await fetch(`${API_BASE_URL}/auth/register`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(payload)
					})
					if (!resp.ok) {
						let msg = 'Registration failed'
						try {
							const j = await resp.json()
							msg = j?.detail || JSON.stringify(j)
						} catch {
							msg = await resp.text()
						}
						throw new Error(msg || 'Registration failed')
					}
					const data = await resp.json()
					set({ user: data.user, token: data.token, loading: false })
					toast.success('Добро пожаловать!')
				} catch (e: any) {
					const msg = e?.message || 'Registration error'
					set({ loading: false, error: msg })
					toast.error(msg)
				}
			},

			logout: () => {
				set({ user: null, token: null })
				toast('Вы вышли из системы')
			},

			me: async () => {
				const token = get().token
				if (!token || !useBackendAuth) return
				try {
					const resp = await fetch(`${API_BASE_URL}/auth/me`, {
						headers: { Authorization: `Bearer ${token}` }
					})
					if (resp.ok) {
						const data = await resp.json()
						set({ user: data })
					}
				} catch {}
			}
		}),
		{
			name: 'ai-life-auth',
			storage: createJSONStorage(() => localStorage),
			partialize: (s) => ({ user: s.user, token: s.token })
		}
	)
) 
const API_BASE_URL = 'http://localhost:8000/api'
const __DEV__ = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.DEV

// Generic API functions
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('ai-life-auth'))
    ? (() => { try { return JSON.parse(localStorage.getItem('ai-life-auth') as string).state.token } catch { return null } })()
    : null
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  }

  if (__DEV__) {
    const m = (config.method || 'GET').toString().toUpperCase()
    // Don't spam body logs if big
    const bodyPreview = typeof config.body === 'string' && config.body.length < 500 ? config.body : undefined
    console.debug('[api] =>', m, url, bodyPreview ? { body: bodyPreview } : undefined)
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
  // no content
    if (response.status === 204) return undefined as unknown as T
  const json = await response.json()
  if (__DEV__) console.debug('[api] <=', response.status, url)
  return json
  } catch (error) {
  console.error(`[api] ERROR ${endpoint}`, error)
    throw error
  }
}

// Employee API
export const employeeApi = {
  getAll: () => apiRequest('/employees'),
  getById: (id: string) => apiRequest(`/employees/${id}`),
  create: (data: any) => apiRequest('/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateStatus: (id: string, status: string, tag?: string) => apiRequest(`/employees/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ current_status: status, status_tag: tag }),
  }),
  delete: (id: string) => apiRequest(`/employees/${id}`, {
    method: 'DELETE',
  }),
}

// Project API
export const projectApi = {
  getAll: () => apiRequest('/projects'),
  getById: (id: string) => apiRequest(`/projects/${id}`),
  create: (data: any) => apiRequest('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/projects/${id}`, {
    method: 'DELETE',
  }),
  addMember: (projectId: string, employeeId: string) => apiRequest(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId }),
  }),
  removeMember: (projectId: string, employeeId: string) => apiRequest(`/projects/${projectId}/members/${employeeId}`, {
    method: 'DELETE',
  }),
  setMemberRate: (projectId: string, employeeId: string, hourly_rate: number | null) => apiRequest(`/projects/${projectId}/members/${employeeId}/rate${hourly_rate!==null?`?hourly_rate=${hourly_rate}`:''}`, {
    method: 'PUT',
  }),
  setMemberRates: (projectId: string, employeeId: string, p: { cost_hourly_rate?: number|null, bill_hourly_rate?: number|null }) => {
    const q: string[] = []
    if (p.cost_hourly_rate !== undefined) q.push(`cost_hourly_rate=${p.cost_hourly_rate===null?'':p.cost_hourly_rate}`)
    if (p.bill_hourly_rate !== undefined) q.push(`bill_hourly_rate=${p.bill_hourly_rate===null?'':p.bill_hourly_rate}`)
    const qs = q.length?`?${q.join('&')}`:''
    return apiRequest(`/projects/${projectId}/members/${employeeId}/rates${qs}`, { method: 'PUT' })
  },
  addLink: (projectId: string, link: any) => apiRequest(`/projects/${projectId}/links`, {
    method: 'POST',
    body: JSON.stringify(link),
  }),
  removeLink: (projectId: string, linkId: string) => apiRequest(`/projects/${projectId}/links/${linkId}`, {
    method: 'DELETE',
  }),
}

// Transaction API
export const transactionApi = {
  getAll: () => apiRequest('/transactions'),
  getById: (id: string) => apiRequest(`/transactions/${id}`),
  create: (data: any) => apiRequest('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/transactions/${id}`, {
    method: 'DELETE',
  }),
}

// Task API
export const taskApi = {
  getAll: () => apiRequest('/tasks'),
  getById: (id: string) => apiRequest(`/tasks/${id}`),
  create: (data: any) => apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  toggle: (id: string) => apiRequest(`/tasks/${id}/toggle`, {
    method: 'PUT',
  }),
  delete: (id: string) => apiRequest(`/tasks/${id}`, {
    method: 'DELETE',
  }),
}

// Goal API
export const goalApi = {
  getAll: () => apiRequest('/goals'),
  getById: (id: string) => apiRequest(`/goals/${id}`),
  create: (data: any) => apiRequest('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateProgress: (id: string, progress: number) => apiRequest(`/goals/${id}/progress?progress=${progress}`, {
    method: 'PUT',
  }),
  delete: (id: string) => apiRequest(`/goals/${id}`, {
    method: 'DELETE',
  }),
}

// Reading Item API
export const readingApi = {
  getAll: () => apiRequest('/reading'),
  getById: (id: string) => apiRequest(`/reading/${id}`),
  create: (data: any) => apiRequest('/reading', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/reading/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  markAsReading: (id: string) => apiRequest(`/reading/${id}/reading`, {
    method: 'PUT',
  }),
  markAsCompleted: (id: string, notes?: string) => {
    const url = notes ? `/reading/${id}/completed?notes=${encodeURIComponent(notes)}` : `/reading/${id}/completed`
    return apiRequest(url, {
      method: 'PUT',
    })
  },
  delete: (id: string) => apiRequest(`/reading/${id}`, {
    method: 'DELETE',
  }),
}

// Note API
export const noteApi = {
  getAll: () => apiRequest('/notes'),
  getById: (id: string) => apiRequest(`/notes/${id}`),
  create: (data: any) => apiRequest('/notes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/notes/${id}`, {
    method: 'DELETE',
  }),
}

// Auth API
export const authApi = {
  login: (email: string, password: string) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (p: { email: string, password: string, confirmPassword: string, code: string, firstName?: string, lastName?: string }) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: p.email, password: p.password, confirm_password: p.confirmPassword, code: p.code, first_name: p.firstName, last_name: p.lastName }),
  }),
  me: () => apiRequest('/auth/me'),
  updateProfile: (data: { name?: string }) => apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  changePassword: (data: { current_password: string, new_password: string }) => apiRequest('/auth/password', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
} 

// Chat API (server-side sessions)
export const chatApi = {
  sessions: () => apiRequest('/chat/sessions'),
  create: (title?: string) => apiRequest('/chat/sessions', { method: 'POST', body: JSON.stringify({ title }) }),
  rename: (id: string, title: string) => apiRequest(`/chat/sessions/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
  remove: (id: string) => apiRequest(`/chat/sessions/${id}`, { method: 'DELETE' }),
  messages: (id: string) => apiRequest(`/chat/sessions/${id}/messages`),
  clear: (id: string) => apiRequest(`/chat/sessions/${id}/messages`, { method: 'DELETE' }),
}
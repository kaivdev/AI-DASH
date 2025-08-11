const API_BASE_URL = 'http://localhost:8000/api'

// Generic API functions
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    // no content
    if (response.status === 204) return undefined as unknown as T
    return await response.json()
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error)
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
  register: (email: string, password: string, code: string) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, code }),
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
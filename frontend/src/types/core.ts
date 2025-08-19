export type Priority = 'L' | 'M' | 'H'

// Task work status (stored in backend)
export type TaskWorkStatus = 'in_progress' | 'paused'

export interface Note {
  id: string
  date: string
  title?: string
  content: string
  tags: string[]
  shared?: boolean
  created_at: string
  updated_at?: string
}

export interface Task {
  id: string
  content: string
  priority: Priority
  due_date?: string // renamed from due
  done: boolean
  assigned_to?: string // renamed from assignedTo
  project_id?: string // renamed from projectId
  hours_spent: number
  billable: boolean
  cost_rate_override?: number
  bill_rate_override?: number
  applied_cost_rate?: number
  applied_bill_rate?: number
  approved?: boolean
  approved_at?: string
  // work status (backend field) - can be null when task is completed
  work_status?: TaskWorkStatus | null
  created_at: string
  updated_at?: string
}

export type TxType = 'income' | 'expense'

export interface Transaction {
  id: string
  transaction_type: TxType // renamed from type
  amount: number
  date: string
  category?: string
  description?: string
  tags: string[]
  employee_id?: string // renamed from employeeId
  project_id?: string
  task_id?: string
  created_at: string
  updated_at?: string
}

export interface Employee {
  id: string
  name: string
  position: string
  email?: string
  salary?: number
  revenue?: number // how much they bring
  current_status: string // renamed from currentStatus
  status_tag?: string // renamed from statusTag
  status_date: string // renamed from statusDate
  hourly_rate?: number
  cost_hourly_rate?: number
  bill_hourly_rate?: number
  planned_monthly_hours?: number
  created_at: string
  updated_at?: string
}

export interface Project {
  id: string
  name: string
  description: string
  tags: string[]
  links: ProjectLink[]
  member_ids: string[] // renamed from memberIds, employee ids
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  start_date?: string // renamed from startDate
  end_date?: string // renamed from endDate
  created_at: string
  updated_at?: string
}

export interface ProjectLink {
  id: string
  project_id: string
  title: string
  url: string
  link_type: string // renamed from type: 'repo' | 'docs' | 'design' | 'other'
  created_at: string
}

export interface Goal {
  id: string
  title: string
  description: string
  period: 'monthly' | 'quarterly' | 'yearly'
  start_date: string // renamed from startDate
  end_date: string // renamed from endDate
  status: 'active' | 'completed' | 'paused'
  progress: number // 0-100
  tags: string[]
  created_at: string
  updated_at?: string
}

export interface ReadingItem {
  id: string
  title: string
  url?: string
  content?: string
  item_type: string // renamed from type: 'article' | 'book' | 'video' | 'podcast' | 'course' | 'other'
  status: 'to_read' | 'reading' | 'completed' | 'archived'
  priority: Priority
  tags: string[]
  added_date: string // renamed from addedDate
  completed_date?: string // renamed from completedDate
  notes?: string
  created_at: string
  updated_at?: string
} 
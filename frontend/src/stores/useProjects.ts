import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, ProjectLink } from '@/types/core'

interface ProjectsState {
  projects: Project[]
  add: (project: Omit<Project, 'id'>) => void
  update: (id: string, patch: Partial<Omit<Project, 'id'>>) => void
  remove: (id: string) => void
  addLink: (projectId: string, link: Omit<ProjectLink, 'id'>) => void
  removeLink: (projectId: string, linkId: string) => void
  addMember: (projectId: string, employeeId: string) => void
  removeMember: (projectId: string, employeeId: string) => void
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const seed: Project[] = [
  {
    id: generateId(),
    name: 'Dashboard Platform',
    description: 'Корпоративный дашборд для управления проектами и сотрудниками',
    tags: ['dashboard', 'react', 'typescript'],
    links: [
      {
        id: generateId(),
        title: 'GitHub Repository',
        url: 'https://github.com/company/dashboard',
        type: 'repo'
      },
      {
        id: generateId(),
        title: 'Figma Design',
        url: 'https://figma.com/design/dashboard',
        type: 'design'
      }
    ],
    memberIds: [],
    status: 'active',
    startDate: new Date().toISOString().slice(0, 10)
  }
]

export const useProjects = create<ProjectsState>()(
  persist(
    (set) => ({
      projects: seed,
      add: (project) => set((state) => ({ 
        projects: [{ id: generateId(), ...project }, ...state.projects] 
      })),
      update: (id, patch) =>
        set((state) => ({ 
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) 
        })),
      remove: (id) => set((state) => ({ 
        projects: state.projects.filter((p) => p.id !== id) 
      })),
      addLink: (projectId, link) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, links: [...p.links, { id: generateId(), ...link }] }
              : p
          )
        })),
      removeLink: (projectId, linkId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, links: p.links.filter((l) => l.id !== linkId) }
              : p
          )
        })),
      addMember: (projectId, employeeId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && !p.memberIds.includes(employeeId)
              ? { ...p, memberIds: [...p.memberIds, employeeId] }
              : p
          )
        })),
      removeMember: (projectId, employeeId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, memberIds: p.memberIds.filter((id) => id !== employeeId) }
              : p
          )
        }))
    }),
    { name: 'ai-life-projects' }
  )
) 
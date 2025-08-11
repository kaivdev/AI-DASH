import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, ProjectLink } from '@/types/core'

interface ProjectsState {
  projects: Project[]
  add: (project: Omit<Project, 'id'>) => void
  update: (id: string, patch: Partial<Omit<Project, 'id'>>) => void
  remove: (id: string) => void
  addLink: (projectId: string, link: Omit<ProjectLink, 'id' | 'project_id' | 'created_at'>) => void
  updateLink: (projectId: string, linkId: string, patch: Partial<Omit<ProjectLink, 'id' | 'project_id' | 'created_at'>>) => void
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
        project_id: 'seed',
        title: 'GitHub Repository',
        url: 'https://github.com/company/dashboard',
        link_type: 'repo',
        created_at: new Date().toISOString(),
      },
      {
        id: generateId(),
        project_id: 'seed',
        title: 'Figma Design',
        url: 'https://figma.com/design/dashboard',
        link_type: 'design',
        created_at: new Date().toISOString(),
      }
    ],
    member_ids: [],
    status: 'active',
    start_date: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  } as unknown as Project
]

export const useProjects = create<ProjectsState>()(
  persist(
    (set) => ({
      projects: seed,
      add: (project) => set((state) => ({ 
        projects: [{ id: generateId(), ...(project as any) }, ...state.projects] 
      })),
      update: (id, patch) =>
        set((state) => ({ 
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...(patch as any) } : p)) 
        })),
      remove: (id) => set((state) => ({ 
        projects: state.projects.filter((p) => p.id !== id) 
      })),
      addLink: (projectId, link) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, links: [...p.links, { id: generateId(), project_id: projectId, created_at: new Date().toISOString(), ...(link as any) }] as any }
              : p
          )
        })),
      updateLink: (projectId, linkId, patch) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  links: p.links.map((l: any) => (l.id === linkId ? { ...l, ...(patch as any) } : l)) as any,
                }
              : p
          )
        })),
      removeLink: (projectId, linkId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, links: p.links.filter((l: any) => l.id !== linkId) as any }
              : p
          )
        })),
      addMember: (projectId, employeeId) =>
        set((state) => ({
          projects: state.projects.map((p: any) =>
            p.id === projectId && !p.member_ids?.includes(employeeId)
              ? { ...p, member_ids: [...(p.member_ids ?? []), employeeId] }
              : p
          )
        })),
      removeMember: (projectId, employeeId) =>
        set((state) => ({
          projects: state.projects.map((p: any) =>
            p.id === projectId
              ? { ...p, member_ids: (p.member_ids ?? []).filter((id: string) => id !== employeeId) }
              : p
          )
        }))
    }),
    { name: 'ai-life-projects' }
  )
) 
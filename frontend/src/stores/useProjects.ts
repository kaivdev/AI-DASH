import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, ProjectLink } from '@/types/core'
import { projectApi } from '@/lib/api'

interface ProjectsState {
  projects: Project[]
  add: (project: Omit<Project, 'id'>) => Promise<void>
  update: (id: string, patch: Partial<Omit<Project, 'id'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  addLink: (projectId: string, link: Omit<ProjectLink, 'id' | 'project_id' | 'created_at'>) => Promise<void>
  updateLink: (projectId: string, linkId: string, patch: Partial<Omit<ProjectLink, 'id' | 'project_id' | 'created_at'>>) => Promise<void>
  removeLink: (projectId: string, linkId: string) => Promise<void>
  addMember: (projectId: string, employeeId: string) => Promise<void>
  removeMember: (projectId: string, employeeId: string) => Promise<void>
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
      add: async (project) => {
        try {
          const payload = {
            name: (project as any).name,
            description: (project as any).description,
            tags: (project as any).tags ?? [],
            status: (project as any).status ?? 'active',
            start_date: (project as any).start_date ?? null,
            end_date: (project as any).end_date ?? null,
          }
          const created = await projectApi.create(payload) as Project
          set((state) => ({ projects: [created as any, ...state.projects] }))
        } catch (e) {
          // Fallback to local add if API unavailable
          const local: Project = {
            id: generateId(),
            ...(project as any),
          }
          set((state) => ({ projects: [local, ...state.projects] }))
        }
      },
      update: async (id, patch) => {
        try {
          const payload = { ...(patch as any) }
          const updated = await projectApi.update(id, payload) as Project
          set((state) => ({ projects: state.projects.map((p) => (p.id === id ? (updated as any) : p)) }))
        } catch (e) {
          set((state) => ({ projects: state.projects.map((p) => (p.id === id ? ({ ...(p as any), ...(patch as any) }) : p)) }))
        }
      },
      remove: async (id) => {
        try { await projectApi.delete(id) } catch {}
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }))
      },
      addLink: async (projectId, link) => {
        try {
          const created = await projectApi.addLink(projectId, link as any) as ProjectLink
          set((state) => ({
            projects: state.projects.map((p: any) => p.id === projectId ? { ...p, links: [...(p.links ?? []), created as any] } : p)
          }))
        } catch (e) {
          const local: any = { id: generateId(), project_id: projectId, created_at: new Date().toISOString(), ...(link as any) }
          set((state) => ({
            projects: state.projects.map((p: any) => p.id === projectId ? { ...p, links: [...(p.links ?? []), local] } : p)
          }))
        }
      },
      updateLink: async (projectId, linkId, patch) => {
        // No backend endpoint for link update → update locally only
        set((state) => ({
          projects: state.projects.map((p: any) => p.id === projectId ? { ...p, links: (p.links ?? []).map((l: any) => l.id === linkId ? { ...l, ...(patch as any) } : l) } : p)
        }))
      },
      removeLink: async (projectId, linkId) => {
        try { await projectApi.removeLink(projectId, linkId) } catch {}
        set((state) => ({
          projects: state.projects.map((p: any) => p.id === projectId ? { ...p, links: (p.links ?? []).filter((l: any) => l.id !== linkId) } : p)
        }))
      },
      addMember: async (projectId, employeeId) => {
        try { await projectApi.addMember(projectId, employeeId) } catch {}
        set((state) => ({
          projects: state.projects.map((p: any) => p.id === projectId ? { ...p, member_ids: [...(p.member_ids ?? []), employeeId] } : p)
        }))
      },
      removeMember: async (projectId, employeeId) => {
        try { await projectApi.removeMember(projectId, employeeId) } catch {}
        set((state) => ({
          projects: state.projects.map((p: any) => p.id === projectId ? { ...p, member_ids: (p.member_ids ?? []).filter((id: string) => id !== employeeId) } : p)
        }))
      }
    }),
    { name: 'ai-life-projects' }
  )
) 
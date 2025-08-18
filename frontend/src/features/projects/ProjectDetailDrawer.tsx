import { useEffect, useMemo, useState } from 'react'
import { Drawer } from '@/components/ui/drawer'
import { DatePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/Select'
import type { Project, ProjectLink } from '@/types/core'
import { Pencil, Save, Trash2, Plus, X as CloseIcon, Check } from 'lucide-react'
import { useTasks } from '@/stores/useTasks'
import { useFinance } from '@/stores/useFinance'
import { ConfirmDialog } from '@/app/ConfirmDialog'
import { useProjects } from '@/stores/useProjects'

interface ProjectDetailDrawerProps {
  open: boolean
  project: Project | null
  employees: { id: string; name: string }[]
  onClose: () => void
  onEdit: (id: string, patch: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>) => void | Promise<void>
  onRemove: (id: string) => void | Promise<void>
  onAddMember: (projectId: string, employeeId: string) => void | Promise<void>
    onRemoveMember: (projectId: string, employeeId: string) => void | Promise<void>
  onAddLink: (projectId: string, link: Omit<ProjectLink, 'id' | 'project_id' | 'created_at'>) => void | Promise<void>
  onRemoveLink: (projectId: string, linkId: string) => void | Promise<void>
  isAdmin?: boolean
}

  export function ProjectDetailDrawer({ open, project, employees, onClose, onEdit, onRemove, onAddMember, onRemoveMember, onAddLink, onRemoveLink, isAdmin }: ProjectDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [status, setStatus] = useState<Project['status']>('active')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [memberAddId, setMemberAddId] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkType, setLinkType] = useState<'repo' | 'docs' | 'design' | 'other'>('repo')
  const tasks = useTasks((s) => s.tasks)
  const txs = useFinance((s) => s.txs)
  const removeTx = useFinance((s) => s.remove)
  const fetchFinance = useFinance((s) => s.fetch)
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false)
  const [finPeriod, setFinPeriod] = useState<'7'|'30'|'90'|'all'>('7')
  const setMemberRates = useProjects((s)=> (s as any).setMemberRates)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
      setTagsInput((project.tags || []).join(', '))
      setStatus(project.status)
      setStart(project.start_date || '')
      setEnd(project.end_date || '')
      setMemberAddId('')
      setLinkTitle('')
      setLinkUrl('')
      setLinkType('repo')
      setIsEditing(false)
      fetchFinance().catch(()=>{})
    }
  }, [project, fetchFinance])

  const availableToAdd = useMemo(() => {
    const existing = (project?.member_ids ?? []) as string[]
    return employees.filter(e => !existing.includes(e.id))
  }, [employees, project])

  if (!open || !project) return null
  const p = project

  async function onSave() {
    const patch = {
      name: name.trim() || undefined,
      description: description ?? undefined,
      tags: (tagsInput || '').split(',').map(t => t.trim()).filter(Boolean),
      status,
      start_date: start || undefined,
      end_date: end || undefined,
    } as Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
    await onEdit(p.id, patch)
    setIsEditing(false)
  }

  async function handleAddMember() {
    if (!memberAddId) return
    await onAddMember(p.id, memberAddId)
    setMemberAddId('')
  }

  async function handleAddLink() {
    if (!linkTitle.trim() || !linkUrl.trim()) return
    await onAddLink(p.id, { title: linkTitle.trim(), url: linkUrl.trim(), link_type: linkType })
    setLinkTitle('')
    setLinkUrl('')
    setLinkType('repo')
  }

  const statusColors: Record<Project['status'], string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300 dark:ring-1 dark:ring-green-500/20',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/20',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200 dark:ring-1 dark:ring-yellow-500/20',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300 dark:ring-1 dark:ring-red-500/20',
  }

  const linkTypeIcons = { repo: '🔗', docs: '📄', design: '🎨', other: '📎' }

  return (
    <Drawer open={open} onClose={onClose} title="Подробности проекта" widthClassName="w-screen max-w-2xl">
      {!isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-medium text-lg">{p.name}</div>
            <span className={`px-2 py-1 rounded text-xs ${statusColors[p.status]}`}>{p.status}</span>
          </div>
          {p.description && <div className="text-sm text-muted-foreground">{p.description}</div>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Начало</div>
              <div>{p.start_date || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Окончание</div>
              <div>{p.end_date || '—'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Теги</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {p.tags.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  p.tags.map((t, i) => <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-purple-500/10 dark:text-purple-200 dark:ring-1 dark:ring-purple-500/20 rounded text-xs">{t}</span>)
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
                         <div className="text-xs text-muted-foreground mb-1">Участники {p.member_ids.length}:</div>
             <div className="flex flex-col gap-1">
               {p.member_ids.map(id => {
                 const emp = employees.find(e => e.id === id)
                 if (!emp) return null
         const rate = (p as any).member_bill_rates?.[id] ?? (p as any).member_rates?.[id] ?? null
         const cost = (p as any).member_cost_rates?.[id] ?? null
                 return (
                   <div key={id} className="flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-1 dark:ring-blue-500/20 rounded text-xs">
                     <span className="min-w-[140px]">{emp.name}</span>
          {isAdmin ? (
            <>
              <span className="text-muted-foreground">Себест.:</span>
              <input id={`ratec-${id}`} className="h-7 px-2 rounded border bg-background text-xs w-24" placeholder="₽/ч" defaultValue={cost ?? ''} />
              <span className="text-muted-foreground">Биллин.:</span>
              <input id={`rateb-${id}`} className="h-7 px-2 rounded border bg-background text-xs w-24" placeholder="₽/ч" defaultValue={rate ?? ''} />
              <button className="h-7 w-7 rounded border inline-flex items-center justify-center" title="Применить" aria-label="Применить" onClick={async ()=>{ const ec=document.getElementById(`ratec-${id}`) as HTMLInputElement|null; const eb=document.getElementById(`rateb-${id}`) as HTMLInputElement|null; const vc=ec?.value; const vb=eb?.value; try { await setMemberRates?.(p.id, id, { cost_hourly_rate: vc?Number(vc):null, bill_hourly_rate: vb?Number(vb):null }); } catch {} }}><Check className="h-3.5 w-3.5" /></button>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">Себест.:</span>
              <span>{typeof cost === 'number' ? `${cost} ₽/ч` : '—'}</span>
              <span className="text-muted-foreground">Биллин.:</span>
              <span>{typeof rate === 'number' ? `${rate} ₽/ч` : '—'}</span>
            </>
          )}
                     <button className="text-red-600 dark:text-red-300 hover:text-red-800 ml-auto" onClick={() => onRemoveMember(p.id, id)} title="Убрать">×</button>
                   </div>
                 )
               })}
             </div>
            <div className="mt-2 w-[260px]">
              <Select value={memberAddId} onChange={setMemberAddId} options={[{ value: '', label: '+ сотрудник' }, ...availableToAdd.map(e => ({ value: e.id, label: e.name }))]} />
              <button className="h-8 mt-2 px-3 rounded border text-sm" onClick={handleAddMember} disabled={!memberAddId}>Добавить</button>
            </div>
          </div>

                     {/* Summary by member */}
           <div className="pt-3 mt-2 border-t">
             <div className="text-xs text-muted-foreground mb-2">Сводка по участникам</div>
             <div className="space-y-2 text-sm">
               {p.member_ids.map(id => {
                 const memberTasks = tasks.filter(t => t.project_id === p.id && t.assigned_to === id)
                 const open = memberTasks.filter(t=>!t.done).length
                 const done = memberTasks.filter(t=>t.done).length
                 const hours = memberTasks.reduce((s,t)=> s + (t.hours_spent||0), 0)
                 const money = memberTasks.filter(t=>t.billable).reduce((s,t)=> s + ((((t as any).applied_bill_rate ?? (t as any).bill_rate_override) ?? 0) * (t.hours_spent||0)), 0)
                 const emp = employees.find(e=>e.id===id)
                 return (
                   <div key={id} className="flex items-center justify-between">
                     <div className="text-muted-foreground truncate pr-2">{emp?.name || id}</div>
                     <div className="inline-flex items-center gap-2 text-xs">
                       <span className="px-1.5 py-0.5 rounded bg-muted">в работе {open}</span>
                       <span className="px-1.5 py-0.5 rounded bg-muted">готово {done}</span>
                       <span className="px-1.5 py-0.5 rounded bg-muted">{hours} ч</span>
                       <span className="px-1.5 py-0.5 rounded bg-muted">{money} ₽</span>
                     </div>
                   </div>
                 )
               })}
               {p.member_ids.length === 0 && <div className="text-muted-foreground">Нет участников</div>}
             </div>
           </div>

                       {/* Project finance block */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground mb-1">Финансы проекта</div>
                <div className="text-xs inline-flex items-center gap-2">
                  <button className={`h-7 px-2 rounded border ${finPeriod==='7'?'bg-muted':''}`} onClick={()=>setFinPeriod('7')}>7 дней</button>
                  <button className={`h-7 px-2 rounded border ${finPeriod==='30'?'bg-muted':''}`} onClick={()=>setFinPeriod('30')}>30 дней</button>
                  <button className={`h-7 px-2 rounded border ${finPeriod==='90'?'bg-muted':''}`} onClick={()=>setFinPeriod('90')}>90 дней</button>
                  <button className={`h-7 px-2 rounded border ${finPeriod==='all'?'bg-muted':''}`} onClick={()=>setFinPeriod('all')}>Все</button>
                </div>
              </div>
              <div className="text-sm space-y-1">
                {(() => {
                  const all = txs.filter(t => (t as any).project_id === p.id)
                  const list = (()=>{
                    if (finPeriod==='all') return all
                    const n = finPeriod==='7'?7:finPeriod==='30'?30:90
                    const thr = new Date(); thr.setDate(thr.getDate() - (n-1))
                    const thrStr = thr.toISOString().slice(0,10)
                    return all.filter(t => t.date >= thrStr)
                  })()
                  const inc = list.filter(t => (t as any).transaction_type === 'income').reduce((s,t)=> s + t.amount, 0)
                  const exp = list.filter(t => (t as any).transaction_type === 'expense').reduce((s,t)=> s + t.amount, 0)
                  return (
                    <div className="flex items-center gap-4">
                      <span className="text-green-600">Доходы: {inc}</span>
                      <span className="text-red-600">Расходы: {exp}</span>
                      <span>Баланс: {inc - exp}</span>
                    </div>
                  )
                })()}
                <div className="max-h-40 overflow-auto border rounded">
                  {(() => {
                    const all = txs.filter(t => (t as any).project_id === p.id)
                    const list = (()=>{
                      if (finPeriod==='all') return all
                      const n = finPeriod==='7'?7:finPeriod==='30'?30:90
                      const thr = new Date(); thr.setDate(thr.getDate() - (n-1))
                      const thrStr = thr.toISOString().slice(0,10)
                      return all.filter(t => t.date >= thrStr)
                    })()
                    return list.slice().sort((a,b)=> a.date.localeCompare(b.date)).map(t => (
                      <div key={t.id} className="px-2 py-1 text-xs flex items-center justify-between border-b last:border-b-0">
                        <span className="text-muted-foreground w-24">{t.date}</span>
                        <span className="flex-1 truncate">{t.category || '-'}</span>
                        <span className={(t as any).transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}>{(t as any).transaction_type === 'income' ? '+' : '-'}{t.amount}</span>
                        <button className="ml-2 h-6 w-6 rounded border inline-flex items-center justify-center" onClick={() => removeTx(t.id)} title="Удалить" aria-label="Удалить"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))
                  })()}
                  {txs.filter(t => (t as any).project_id === p.id).length === 0 && (
                    <div className="text-xs text-muted-foreground p-2">Нет транзакций</div>
                  )}
                </div>
              </div>
            </div>

           {p.links.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-1">Ссылки</div>
              <div className="space-y-1">
                {p.links.map(l => (
                  <div key={l.id} className="flex items-center gap-2 text-sm">
                    <span>{linkTypeIcons[(l as any).link_type as 'repo' | 'docs' | 'design' | 'other']}</span>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{l.title}</a>
                    <button className="ml-auto h-7 w-7 rounded border inline-flex items-center justify-center" onClick={() => onRemoveLink(p.id, l.id)} title="Удалить" aria-label="Удалить"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-1">Добавить ссылку</div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              <input className="h-9 px-3 rounded border bg-background text-sm md:col-span-2" placeholder="Название" value={linkTitle} onChange={(e)=>setLinkTitle(e.target.value)} />
              <input className="h-9 px-3 rounded border bg-background text-sm md:col-span-3" placeholder="https://..." value={linkUrl} onChange={(e)=>setLinkUrl(e.target.value)} />
              <Select value={linkType} onChange={(v)=>setLinkType(v as any)} options={[{value:'repo',label:'Репозиторий'},{value:'docs',label:'Документация'},{value:'design',label:'Дизайн'},{value:'other',label:'Другое'}]} />
              <div className="md:col-span-6 flex justify-end">
                <button className="h-9 px-4 rounded border text-sm inline-flex items-center gap-2" onClick={handleAddLink}><Plus className="h-4 w-4" /> Добавить</button>
              </div>
            </div>
          </div>

                     <div className="flex items-center gap-2 pt-2 border-t">
             <button className="h-8 px-3 rounded border inline-flex items-center justify-center" onClick={() => setIsEditing(true)} title="Редактировать" aria-label="Редактировать">
               <Pencil className="h-4 w-4" />
             </button>
                           <ConfirmDialog
                open={confirmFinishOpen}
                title="Завершить проект?"
                description="Проект будет помечен как завершенный. Продолжить?"
                confirmText="Да"
                cancelText="Нет"
                variant="danger"
                onCancel={() => setConfirmFinishOpen(false)}
                onConfirm={async () => { setConfirmFinishOpen(false); await onEdit(p.id, { status: 'completed' } as any) }}
              />
              <button className="h-8 px-3 rounded border inline-flex items-center justify-center" onClick={() => {
                if (p.status === 'completed') {
                  onEdit(p.id, { status: 'active' } as any)
                } else {
                  setConfirmFinishOpen(true)
                }
              }} title={p.status==='completed'?'Открыть проект':'Завершить проект'} aria-label="Переключить статус">
                {p.status==='completed' ? 'Открыть' : 'Завершить'}
              </button>
             <button className="h-8 w-8 rounded border inline-flex items-center justify-center" onClick={() => onRemove(p.id)} title="Удалить" aria-label="Удалить">
               <Trash2 className="h-4 w-4" />
             </button>
           </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs mb-1 block">Название проекта</label>
            <input className="h-9 px-3 rounded border bg-background w-full text-sm" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block">Описание</label>
            <textarea className="px-3 py-2 rounded border bg-background w-full text-sm resize-none" rows={3} value={description} onChange={(e)=>setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block">Статус</label>
              <Select value={status} onChange={(v)=>setStatus(v as any)} options={[{value:'active',label:'active'},{value:'completed',label:'completed'},{value:'paused',label:'paused'},{value:'cancelled',label:'cancelled'}]} />
            </div>
            <div>
              <label className="text-xs mb-1 block">Теги (через запятую)</label>
              <input className="h-9 px-3 rounded border bg-background w-full text-sm" value={tagsInput} onChange={(e)=>setTagsInput(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block">Начало</label>
              <DatePicker 
                date={start ? new Date(start) : undefined} 
                onDateChange={(newDate) => setStart(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                placeholder="Дата начала"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block">Окончание</label>
              <DatePicker 
                date={end ? new Date(end) : undefined} 
                onDateChange={(newDate) => setEnd(newDate ? newDate.toISOString().slice(0, 10) : '')} 
                placeholder="Дата окончания"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t">
            <button className="h-8 px-3 rounded border text-sm bg-primary text-primary-foreground inline-flex items-center gap-2" onClick={onSave}><Save className="h-4 w-4" /> Сохранить</button>
            <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2" onClick={() => { setIsEditing(false); setName(p.name); setDescription(p.description); setTagsInput(p.tags.join(', ')); setStatus(p.status); setStart(p.start_date || ''); setEnd(p.end_date || ''); }}><CloseIcon className="h-4 w-4" /> Отмена</button>
          </div>
        </div>
      )}
    </Drawer>
  )
} 
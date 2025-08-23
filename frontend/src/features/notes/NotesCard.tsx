import { ModuleCard } from '@/features/modules/ModuleCard'
import { useNotes } from '@/stores/useNotes'
import { useAuth } from '@/stores/useAuth'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { NotesDrawer } from './NotesDrawer'
import { EmptyState } from '@/components/ui/empty-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function NotesCard() {
  const notes = useNotes((s) => s.notes)
  const add = useNotes((s) => s.add)
  const update = useNotes((s) => s.update)
  const remove = useNotes((s) => s.remove)
  const user = useAuth((s) => s.user)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create'|'view'|'edit'>('create')
  const [currentNote, setCurrentNote] = useState<any>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  function openCreate() {
    setCurrentNote(null)
    setDrawerMode('create')
    setDrawerOpen(true)
  }

  // View is merged into edit: clicking a note opens edit mode directly

  function openEdit(n: any) {
    setCurrentNote(n)
    setDrawerMode('edit')
    setDrawerOpen(true)
  }

  return (
    <ModuleCard id="notes" title="Notes" size="2x1">
      <div className="flex flex-col h-full gap-3">
        <div>
          <input
            placeholder="Напишите заметку..."
            className="w-full h-9 px-3 rounded border bg-background"
            onMouseDown={(e) => { e.preventDefault(); openCreate() }}
            readOnly
          />
        </div>
        <div className="min-h-0 flex-1 overflow-auto space-y-2">
          {notes.length === 0 && (
            <EmptyState
              title="Нет данных"
              description="Добавьте свою первую заметку, чтобы начать организацию своих мыслей и идей"
              actions={[
                {
                  label: '+ Добавить заметку',
                  onClick: openCreate,
                  variant: 'default'
                }
              ]}
            />
          )}
          {notes.map((n) => (
            <div key={n.id} className="rounded border p-3 cursor-pointer overflow-hidden" onClick={() => openEdit(n)}>
              <div className="text-xs text-muted-foreground">{n.date}</div>
              {n.title && <div className="font-medium break-all overflow-hidden">{n.title}</div>}
              <div className="text-sm line-clamp-3 break-all overflow-hidden" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{n.content}</div>
              <div className="mt-2 flex items-center justify-between gap-2" onClick={(e)=> e.stopPropagation()}>
                <div className="text-xs text-muted-foreground">
                  {n.shared ? 'Поделено со всеми' : 'Личная заметка'}
                </div>
                <div className="flex items-center gap-1">
                  {user?.role && (user.role === 'owner' || user.role === 'admin') && (
                    <button
                      className="h-7 px-2 rounded border text-xs hover:bg-muted/40"
                      onClick={async () => {
                        try {
                          await update(n.id, { shared: !n.shared } as any)
                          toast.success(n.shared ? 'Сделано личной' : 'Поделено со всеми')
                        } catch (e) {
                          toast.error('Недостаточно прав для изменения шаринга')
                        }
                      }}
                      title={n.shared ? 'Сделать личной' : 'Поделиться со всеми'}
                      aria-label={n.shared ? 'Сделать личной' : 'Поделиться со всеми'}
                    >
                      {n.shared ? 'Сделать личной' : 'Поделиться'}
                    </button>
                  )}
                {/* Edit pencil removed: clicking the card opens edit mode */}
                <button className="h-7 w-7 rounded border inline-flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setPendingDeleteId(n.id); setConfirmOpen(true) }} title="Удалить" aria-label="Удалить">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <NotesDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          note={currentNote}
          mode={drawerMode}
          onCreate={async (p) => { await add(p as any) }}
          onUpdate={async (id, patch) => { await update(id, patch as any) }}
        />
        <AlertDialog open={confirmOpen} onOpenChange={(o)=>{ if(!o){ setConfirmOpen(false); setPendingDeleteId(null) } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить заметку?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Заметка будет удалена.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={()=>{ setConfirmOpen(false); setPendingDeleteId(null) }}>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={async ()=>{ if(pendingDeleteId){ try { await remove(pendingDeleteId) } catch {} } setConfirmOpen(false); setPendingDeleteId(null) }}>Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleCard>
  )
} 
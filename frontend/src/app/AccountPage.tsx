import { useAuth } from '@/stores/useAuth'
import { inviteApi, API_BASE_URL } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

type Profile = {
  avatar_url?: string
  bio?: string
  phone?: string
  position?: string
  website?: string
  telegram?: string
  github?: string
  locale?: string
  // client-side only field to send new token; won't be echoed back
  openrouter_api_key?: string
}

export function AccountPage() {
  const user = useAuth((s) => s.user)
  const token = useAuth((s) => s.token)
  const me = useAuth((s) => s.me)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [profile, setProfile] = useState<Profile>({
    avatar_url: user?.profile?.avatar_url || '',
    bio: user?.profile?.bio || '',
    phone: user?.profile?.phone || '',
    position: user?.profile?.position || '',
    website: user?.profile?.website || '',
    telegram: user?.profile?.telegram || '',
    github: user?.profile?.github || '',
    locale: user?.profile?.locale || '',
  openrouter_api_key: '',
  })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Invites state (owner/admin only)
  type Invite = { id: number; code: string; is_active: boolean; created_at: string }
  const [invites, setInvites] = useState<Invite[]>([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const isOwnerOrAdmin = !!user && (user.role === 'owner' || user.role === 'admin')

  useEffect(() => {
    setName(user?.name || '')
    setProfile({
      avatar_url: user?.profile?.avatar_url || '',
      bio: user?.profile?.bio || '',
      phone: user?.profile?.phone || '',
      position: user?.profile?.position || '',
      website: user?.profile?.website || '',
      telegram: user?.profile?.telegram || '',
      github: user?.profile?.github || '',
      locale: user?.profile?.locale || '',
  openrouter_api_key: '',
    })
  }, [user])

  useEffect(() => {
    if (!isOwnerOrAdmin) return
    void loadInvites()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnerOrAdmin])

  async function loadInvites() {
    try {
      setInvitesLoading(true)
      const list = await inviteApi.list() as any as Invite[]
      setInvites(list)
    } catch (e) {
      // noop
    } finally {
      setInvitesLoading(false)
    }
  }

  async function onCreateInvite() {
    try {
      const created = await inviteApi.create() as any as Invite
      setInvites((prev) => [created, ...prev])
    } catch {}
  }

  async function onDeactivateInvite(id: number) {
    try {
      const updated = await inviteApi.deactivate(id) as any as Invite
      setInvites((prev) => prev.map(i => i.id === id ? updated : i))
    } catch {}
  }

  if (!user) {
    navigate('/login')
    return null
  }

  async function onSaveProfile(nextProfile?: Profile) {
    const payloadProfile = nextProfile ?? profile
    setSaving(true)
    setSaveMsg(null)
    try {
  const resp = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, profile: payloadProfile }),
      })
      if (!resp.ok) throw new Error('save failed')
      // Refresh user to get has_openrouter_key flag
      await me()
      // Clear sensitive field in UI state
      setProfile(p => ({ ...p, openrouter_api_key: '' }))
      setSaveMsg('Сохранено')
    } catch {
      setSaveMsg('Ошибка сохранения')
    } finally {
      setSaving(false)
      // Auto-hide message
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  async function onClearToken() {
    // Persist token removal immediately
    const nextP = { ...profile, openrouter_api_key: '' }
    setProfile(nextP)
    await onSaveProfile(nextP)
  }

  async function onChangePassword() {
    if (!currentPassword || !newPassword) return
    try {
  const resp = await fetch(`${API_BASE_URL}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      if (resp.ok) {
        setCurrentPassword('')
        setNewPassword('')
      }
    } catch {}
  }

  async function onPickAvatar(file: File | null) {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
  await fetch(`${API_BASE_URL}/auth/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      } as any,
      body: formData,
    })
    await me()
  }

  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map(s => s.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="md:flex md:items-start md:gap-12">
        {/* Left: big avatar */}
        <div className="md:w-72 w-full mb-6 md:mb-0 flex flex-col items-center">
          <div className="h-56 w-56 rounded-full bg-muted overflow-hidden flex items-center justify-center text-2xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-muted-foreground">{initials}</span>
            )}
          </div>
          <div className="mt-3 text-sm text-muted-foreground break-all text-center">{user.email}</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
            className="hidden"
          />
          <button
            className="mt-3 h-9 px-4 rounded border text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Изменить аватар
          </button>
        </div>

        {/* Right: forms */}
        <div className="flex-1 space-y-6">
          <div className="p-4 border rounded space-y-3">
            <div>
              <label className="text-xs mb-1 block">Имя</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 px-3 rounded border bg-background w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block">OpenRouter API Key</label>
              <div className="flex gap-2 items-center">
                <input
                  type="password"
                  value={profile.openrouter_api_key || ''}
                  onChange={(e) => setProfile(p => ({ ...p, openrouter_api_key: e.target.value }))}
                  className="h-9 px-3 rounded border bg-background w-full text-sm"
                  placeholder={user?.profile && (user.profile as any).has_openrouter_key ? '•••••••••••••••• (настроен)' : 'Введите токен OpenRouter'}
                />
                {user?.profile && (user.profile as any).has_openrouter_key && (
                  <button
                    type="button"
                    className="h-9 px-3 rounded border text-xs whitespace-nowrap"
                    title="Очистить сохранённый токен"
                    onClick={onClearToken}
                  >Очистить</button>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">Токен хранится на сервере и используется только для ваших запросов. Мы не показываем его обратно.</div>
              {saveMsg && (
                <div className={`mt-1 text-[12px] ${saveMsg === 'Сохранено' ? 'text-green-600' : 'text-red-600'}`}>{saveMsg}</div>
              )}
              {user?.profile && (user.profile as any).has_openrouter_key && !saveMsg && (
                <div className="mt-1 text-[12px] text-green-600">Токен сохранён</div>
              )}
            </div>
            <div>
              <label className="text-xs mb-1 block">Био</label>
              <textarea
                value={profile.bio || ''}
                onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                className="min-h-[120px] px-3 py-2 rounded border bg-background w-full text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block">Телефон</label>
                <input
                  value={profile.phone || ''}
                  onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                  className="h-9 px-3 rounded border bg-background w-full text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Должность</label>
                <input
                  value={profile.position || ''}
                  onChange={(e) => setProfile(p => ({ ...p, position: e.target.value }))}
                  className="h-9 px-3 rounded border bg-background w-full text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Сайт</label>
                <input
                  value={profile.website || ''}
                  onChange={(e) => setProfile(p => ({ ...p, website: e.target.value }))}
                  className="h-9 px-3 rounded border bg-background w-full text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Telegram</label>
                <input
                  value={profile.telegram || ''}
                  onChange={(e) => setProfile(p => ({ ...p, telegram: e.target.value }))}
                  className="h-9 px-3 rounded border bg-background w-full text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">GitHub</label>
                <input
                  value={profile.github || ''}
                  onChange={(e) => setProfile(p => ({ ...p, github: e.target.value }))}
                  className="h-9 px-3 rounded border bg-background w-full text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Язык</label>
                <input
                  value={profile.locale || ''}
                  onChange={(e) => setProfile(p => ({ ...p, locale: e.target.value }))}
                  className="h-9 px-3 rounded border bg-background w-full text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="h-9 px-4 rounded border text-sm"
                onClick={() => {
                  setName(user.name || '')
                  setProfile({
                    avatar_url: user?.profile?.avatar_url || '',
                    bio: user?.profile?.bio || '',
                    phone: user?.profile?.phone || '',
                    position: user?.profile?.position || '',
                    website: user?.profile?.website || '',
                    telegram: user?.profile?.telegram || '',
                    github: user?.profile?.github || '',
                    locale: user?.profile?.locale || '',
                    openrouter_api_key: '',
                  })
                }}
              >
                Сбросить
              </button>
              <button className="h-9 px-4 rounded border text-sm" disabled={saving} onClick={() => onSaveProfile()}>{saving ? 'Сохранение…' : 'Сохранить'}</button>
            </div>
          </div>

          <div className="p-4 border rounded space-y-3">
            <div className="font-medium text-sm">Смена пароля</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block">Текущий пароль</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-9 px-3 rounded border bg-background w-full text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block">Новый пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 px-3 rounded border bg-background w-full text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button className="h-9 px-4 rounded border text-sm" onClick={onChangePassword}>Обновить пароль</button>
            </div>
          </div>

          {isOwnerOrAdmin && (
            <div className="p-4 border rounded space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">Коды приглашения</div>
                <button
                  className="h-8 px-3 rounded border text-xs"
                  onClick={onCreateInvite}
                  disabled={invitesLoading}
                >{invitesLoading ? 'Создание…' : 'Создать код'}</button>
              </div>
              <div className="text-xs text-muted-foreground">Поделитесь кодом с сотрудником — он сможет зарегистрироваться.
                Первый зарегистрированный пользователь автоматически получает роль владельца (owner).
              </div>
              <div className="border rounded">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2">Код</th>
                      <th className="text-left p-2">Статус</th>
                      <th className="text-left p-2">Создан</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.length === 0 && (
                      <tr>
                        <td className="p-3 text-sm text-muted-foreground" colSpan={4}>Кодов пока нет</td>
                      </tr>
                    )}
                    {invites.map((i) => (
                      <tr key={i.id} className="border-b last:border-b-0">
                        <td className="p-2 font-mono">
                          <div className="flex items-center gap-2">
                            <span>{i.code}</span>
                            <button
                              className="h-7 px-2 rounded border text-xs"
                              title="Копировать"
                              onClick={() => navigator.clipboard?.writeText(i.code)}
                            >Копировать</button>
                          </div>
                        </td>
                        <td className="p-2">
                          {i.is_active ? <span className="text-green-600">активен</span> : <span className="text-muted-foreground">деактивирован</span>}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {new Date(i.created_at).toLocaleString()}
                        </td>
                        <td className="p-2 text-right">
                          {i.is_active && (
                            <button
                              className="h-8 px-3 rounded border text-xs"
                              onClick={() => onDeactivateInvite(i.id)}
                            >Деактивировать</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end pb-6">
            <button
              className="h-9 px-4 rounded border text-sm"
              onClick={() => { logout(); navigate('/login') }}
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
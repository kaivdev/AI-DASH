import { Shield, Key, Trash2 } from "lucide-react";
import React, { useState, useRef, useImperativeHandle, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/stores/useAuth';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import { inviteApi } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export interface ProfileContentHandle {
  save: () => Promise<void>
  cancel: () => void
}

interface ProfileContentProps {
  isEditing: boolean;
  onEditToggle: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onPickAvatar?: (file: File | null) => Promise<void>;
}

const ProfileContent = React.forwardRef<ProfileContentHandle, ProfileContentProps>(function ProfileContent({ isEditing, onEditToggle, fileInputRef, onPickAvatar }, ref) {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const me = useAuth((s) => s.me);
  const logout = useAuth((s) => s.logout);
  const localFileInputRef = useRef<HTMLInputElement | null>(null);
  const effectiveFileInputRef = (fileInputRef as React.RefObject<HTMLInputElement | null>) ?? localFileInputRef;

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [profile, setProfile] = useState({
    bio: user?.profile?.bio || '',
    phone: user?.profile?.phone || '',
    position: user?.profile?.position || '',
    company: user?.profile?.company || '',
    website: user?.profile?.website || '',
    telegram: user?.profile?.telegram || '',
    github: user?.profile?.github || '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Email/push notifications settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [loginNotifications, setLoginNotifications] = useState(true);

  // --- Invites state ---
  const [invites, setInvites] = useState<Array<{ id: number; code: string; is_active: boolean; created_at: string }>>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [creatingInvite, setCreatingInvite] = useState(false)

  async function loadInvites() {
    if (!token) return
    try {
      setLoadingInvites(true)
      const rows = await inviteApi.list()
      setInvites(rows as any)
    } catch (e: any) {
      // ignore 403 silently for non-owner/admin
      const msg = e?.message || ''
      if (!/403/.test(msg)) console.error(e)
    } finally {
      setLoadingInvites(false)
    }
  }

  useEffect(() => {
    // fetch invites when opening security tab component mounts
    loadInvites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!user) return null;

  async function onSaveProfile() {
    setSaving(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, profile }),
      });
      if (!resp.ok) throw new Error('save failed');
      await me(); // Refresh user data
      toast.success('Профиль сохранён');
      onEditToggle(); // Exit edit mode
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  function onCancelEdit() {
    setName(user!.name || '');
    setProfile({
      bio: user!.profile?.bio || '',
      phone: user!.profile?.phone || '',
      position: user!.profile?.position || '',
      company: user!.profile?.company || '',
      website: user!.profile?.website || '',
      telegram: user!.profile?.telegram || '',
      github: user!.profile?.github || '',
    });
    onEditToggle();
  }

  useImperativeHandle(ref, () => ({
    save: async () => {
      await onSaveProfile();
    },
    cancel: () => {
      onCancelEdit();
    }
  }))

  async function onChangePassword() {
    if (!currentPassword || !newPassword) {
      toast.error('Заполните все поля');
      return;
    }
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (resp.ok) {
        setCurrentPassword('');
        setNewPassword('');
        toast.success('Пароль обновлён');
      } else {
        toast.error('Ошибка смены пароля');
      }
    } catch {
      toast.error('Ошибка смены пароля');
    }
  }

  const handlePickAvatar = onPickAvatar
    ? onPickAvatar
    : async (file: File | null) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
          await fetch(`${API_BASE_URL}/auth/avatar`, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            } as any,
            body: formData,
          });
          await me();
          toast.success('Аватар обновлён');
        } catch {
          toast.error('Ошибка загрузки аватара');
        }
      };

  const [openRouterKey, setOpenRouterKey] = useState('');

  async function saveOpenRouterKey(value?: string) {
    const v = value ?? openRouterKey
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ profile: { openrouter_api_key: v } }),
      });
      if (!resp.ok) throw new Error('save failed');
      await me();
      toast.success('Ключ сохранён');
      setOpenRouterKey('');
    } catch {
      toast.error('Ошибка сохранения ключа');
    }
  }

  return (
    <>
      <input
        ref={effectiveFileInputRef as any}
        type="file"
        accept="image/*"
        onChange={(e) => handlePickAvatar(e.target.files?.[0] || null)}
        className="hidden"
      />
      
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Личные данные</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Личная информация</CardTitle>
                  <CardDescription>Обновите свои личные данные и информацию профиля.</CardDescription>
                </div>
                <div className="flex gap-2">{/* Buttons moved to header */}</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Имя и фамилия</Label>
                  <Input 
                    id="firstName" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isEditing}
                    className="disabled:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user.email}
                    disabled
                    className="disabled:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input 
                    id="phone" 
                    value={profile.phone}
                    onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                    disabled={!isEditing}
                    className="disabled:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Должность</Label>
                  <Input 
                    id="position" 
                    value={profile.position}
                    onChange={(e) => setProfile(p => ({ ...p, position: e.target.value }))}
                    disabled={!isEditing}
                    className="disabled:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Компания</Label>
                  <Input 
                    id="company" 
                    value={profile.company}
                    onChange={(e) => setProfile(p => ({ ...p, company: e.target.value }))}
                    disabled={!isEditing}
                    className="disabled:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Веб-сайт</Label>
                  <Input 
                    id="website" 
                    value={profile.website}
                    onChange={(e) => setProfile(p => ({ ...p, website: e.target.value }))}
                    disabled={!isEditing}
                    className="disabled:cursor-default"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">О себе</Label>
                <Textarea
                  id="bio"
                  placeholder="Расскажите о себе..."
                  value={profile.bio}
                  onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                  rows={4}
                  disabled={!isEditing}
                  className="disabled:cursor-default"
                />
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telegram">Telegram</Label>
                  <Input 
                    id="telegram" 
                    value={profile.telegram}
                    onChange={(e) => setProfile(p => ({ ...p, telegram: e.target.value }))}
                    disabled={!isEditing}
                    className="disabled:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub</Label>
                  <Input 
                    id="github" 
                    value={profile.github}
                    onChange={(e) => setProfile(p => ({ ...p, github: e.target.value }))}
                    disabled={!isEditing}
                    className="disabled:cursor-default"
                  />
                </div>
              </div>
              
              <Separator />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки безопасности</CardTitle>
              <CardDescription>Управляйте безопасностью аккаунта и аутентификацией.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Пароль</Label>
                    <p className="text-muted-foreground text-sm">Смените пароль для повышения безопасности</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Текущий пароль</Label>
                    <Input 
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Новый пароль</Label>
                    <Input 
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={onChangePassword}>
                    <Key className="mr-2 h-4 w-4" />
                    Обновить пароль
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="openrouter">OpenRouter API ключ</Label>
                  <div className="flex gap-2">
                    <Input id="openrouter" value={openRouterKey} onChange={(e) => setOpenRouterKey(e.target.value)} placeholder={user.profile ? '•••••••• (настроен)' : 'Введите ключ'} className="flex-1" />
                    <Button onClick={() => saveOpenRouterKey()} variant="outline">Сохранить</Button>
                    <Button onClick={() => saveOpenRouterKey('')} variant="outline">Очистить</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Двухфакторная аутентификация</Label>
                    <p className="text-muted-foreground text-sm">
                      Добавьте дополнительный уровень защиты вашего аккаунта
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">
                      Отключена
                    </Badge>
                    <Button variant="outline" size="sm">
                      Настроить
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Уведомления о входе</Label>
                    <p className="text-muted-foreground text-sm">
                      Получать уведомления, когда кто-то входит в ваш аккаунт
                    </p>
                  </div>
                  <Switch 
                    checked={loginNotifications}
                    onCheckedChange={setLoginNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Активные сессии</Label>
                    <p className="text-muted-foreground text-sm">
                      Управляйте устройствами, которые вошли в ваш аккаунт
                    </p>
                  </div>
                  <Button variant="outline">
                    <Shield className="mr-2 h-4 w-4" />
                    Просмотр сессий
                  </Button>
                </div>
                {/* Invite Codes */}
                {user?.role && (user.role === 'owner' || user.role === 'admin') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-base">Коды приглашения</Label>
                        <p className="text-muted-foreground text-sm">
                          Поделитесь кодом с сотрудником — он сможет зарегистрироваться. Первый зарегистрированный автоматически получает роль владельца.
                        </p>
                      </div>
                      <Button disabled={creatingInvite} onClick={async () => {
                        try {
                          setCreatingInvite(true)
                          const created = await inviteApi.create()
                          setInvites((prev) => [created as any, ...prev])
                          toast.success('Код создан')
                        } catch (e) {
                          toast.error('Не удалось создать код')
                        } finally {
                          setCreatingInvite(false)
                        }
                      }}>Создать код</Button>
                    </div>

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[160px]">Код</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead>Создан</TableHead>
                            <TableHead className="w-[220px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invites.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">Нет кодов</TableCell>
                            </TableRow>
                          )}
                          {invites.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-mono">{inv.code}</TableCell>
                              <TableCell>{inv.is_active ? 'активен' : 'деактивирован'}</TableCell>
                              <TableCell>{formatDateTime(inv.created_at)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2 justify-end">
                                  <Button variant="outline" size="sm" onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(inv.code)
                                      toast.success('Код скопирован')
                                    } catch {
                                      toast.error('Не удалось скопировать')
                                    }
                                  }}>Копировать</Button>
                                  <Button variant="outline" size="sm" disabled={!inv.is_active}
                                    onClick={async () => {
                                      try {
                                        const res = await inviteApi.deactivate(inv.id)
                                        setInvites((prev) => prev.map((r) => r.id === inv.id ? (res as any) : r))
                                        toast.success('Код деактивирован')
                                      } catch {
                                        toast.error('Не удалось деактивировать')
                                      }
                                    }}>Деактивировать</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Опасная зона</CardTitle>
              <CardDescription>Необратимые и разрушительные действия</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Выйти из аккаунта</Label>
                  <p className="text-muted-foreground text-sm">
                    Завершить текущую сессию
                  </p>
                </div>
                <Button variant="destructive" onClick={logout}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Выйти
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки уведомлений</CardTitle>
              <CardDescription>Выберите, какие уведомления вы хотите получать.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Email уведомления</Label>
                    <p className="text-muted-foreground text-sm">Получать уведомления по электронной почте</p>
                  </div>
                  <Switch 
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Push уведомления</Label>
                    <p className="text-muted-foreground text-sm">
                      Получать push уведомления в браузере
                    </p>
                  </div>
                  <Switch 
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Недельная сводка</Label>
                    <p className="text-muted-foreground text-sm">
                      Получать еженедельную сводку вашей активности
                    </p>
                  </div>
                  <Switch 
                    checked={weeklySummary}
                    onCheckedChange={setWeeklySummary}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Уведомления безопасности</Label>
                    <p className="text-muted-foreground text-sm">
                      Важные уведомления безопасности (всегда включены)
                    </p>
                  </div>
                  <Switch checked disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
});

export default ProfileContent;

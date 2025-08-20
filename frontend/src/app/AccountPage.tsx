import React, { useState, useRef } from 'react'
import ProfileHeader from '@/components/profile-page/components/profile-header'
import ProfileContent from '@/components/profile-page/components/profile-content'
import { useAuth } from '@/stores/useAuth'
import { API_BASE_URL } from '@/lib/api'
import { toast } from 'sonner'

export function AccountPage() {
  const [isEditing, setIsEditing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const contentRef = useRef<any>(null)
  const auth = useAuth((s) => ({ token: s.token, me: s.me }))

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const onCancel = () => {
    // call ProfileContent cancel if available
    contentRef.current?.cancel?.()
    setIsEditing(false)
  }

  const onSave = async () => {
    // call ProfileContent save
    await contentRef.current?.save?.()
    setIsEditing(false)
  }

  async function onPickAvatar(file: File | null) {
    if (!file) return
    try {
      const form = new FormData()
      form.append('file', file)
      await fetch(`${API_BASE_URL}/auth/avatar`, {
        method: 'POST',
        headers: {
          ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        } as any,
        body: form,
      })
      await auth.me()
      toast.success('Аватар сохранён')
    } catch (e) {
      toast.error('Ошибка загрузки аватара')
    }
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-10">
  <ProfileHeader onEditClick={handleEditToggle} onAvatarClick={() => fileInputRef.current?.click()} onSave={onSave} onCancel={onCancel} isEditing={isEditing} />
  <ProfileContent ref={contentRef} fileInputRef={fileInputRef} onPickAvatar={onPickAvatar} isEditing={isEditing} onEditToggle={handleEditToggle} />
    </div>
  )
} 
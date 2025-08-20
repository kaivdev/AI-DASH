import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Mail, MapPin } from "lucide-react";
import { useAuth } from '@/stores/useAuth';

type Props = {
  onEditClick?: () => void;
  onAvatarClick?: () => void;
  isEditing?: boolean;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
};

export default function ProfileHeader({ onEditClick, onAvatarClick, isEditing, onSave, onCancel }: Props) {
  const user = useAuth((s) => s.user);

  if (!user) return null;

  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((s) => (s || '').trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.profile?.avatar_url} alt="Профиль" />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="outline"
              className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full"
              onClick={() => (onAvatarClick ? onAvatarClick() : onEditClick?.())}
            >
              <Camera />
            </Button>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <h1 className="text-2xl font-bold">{user.name || 'Пользователь'}</h1>
            </div>
            <p className="text-muted-foreground">{user.profile?.position || 'Должность не указана'}</p>
            <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Mail className="size-4" />
                {user.email}
              </div>
              {user.profile?.phone && (
                <div className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  {user.profile.phone}
                </div>
              )}
            </div>
          </div>
          <div>
            {!isEditing ? (
              <Button variant="default" onClick={onEditClick}>
                Редактировать профиль
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onCancel?.()}>
                  Отменить
                </Button>
                <Button size="sm" onClick={() => void onSave?.()}>
                  Сохранить
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

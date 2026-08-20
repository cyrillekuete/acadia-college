'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { resolveUserAvatarUrl } from '@/lib/supabase/storage';

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  className?: string;
};

export function UserAvatar({ name, email, avatar, className }: UserAvatarProps) {
  const label = name?.trim() || email || '';
  const src = resolveUserAvatarUrl(avatar);

  return (
    <Avatar className={cn('size-9', className)}>
      {src ? <AvatarImage src={src} alt={label} /> : null}
      <AvatarFallback className="text-xs font-medium">
        {getInitials(label, 2) || '—'}
      </AvatarFallback>
    </Avatar>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Building2, User, ExternalLink, MapPin, Link as LinkIcon } from 'lucide-react';

interface UserProfile {
  name?: string;
  displayName?: string;
  bio?: string;
  photoURL?: string;
  avatar?: string;
  role?: 'creator' | 'business';
  location?: string;
  website?: string;
  username?: string;
}

export function ProfileCard() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(firestore, 'users', user.uid));
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [user, firestore]);

  if (!user) return null;

  const displayName = profile?.displayName ?? profile?.name ?? user.email ?? 'User';
  const avatar = profile?.photoURL ?? profile?.avatar;
  const role = profile?.role ?? 'creator';
  const profileHref =
    role === 'creator'
      ? `/creator/profile/${user.uid}`
      : `/business/profile`;

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-4/5 rounded" />
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div
      id="feed-profile-card"
      className="bg-card border border-border/50 rounded-2xl p-4 space-y-4"
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-primary/20">
          <AvatarImage src={avatar} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
            {displayName[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{displayName}</p>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide',
              role === 'business'
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-primary/15 text-primary'
            )}
          >
            {role === 'business' ? (
              <Building2 className="h-2.5 w-2.5" />
            ) : (
              <User className="h-2.5 w-2.5" />
            )}
            {role}
          </span>
        </div>
      </div>

      {/* Bio */}
      {profile?.bio && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {profile.bio}
        </p>
      )}

      {/* Meta: location & website */}
      <div className="space-y-1.5">
        {profile?.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{profile.location}</span>
          </div>
        )}
        {profile?.website && (
          <div className="flex items-center gap-1.5 text-xs">
            <LinkIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <a
              href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-2 truncate transition-colors"
            >
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* View profile button */}
      <Link href={profileHref} className="block">
        <Button
          id="profile-card-view-btn"
          variant="outline"
          size="sm"
          className="w-full rounded-xl gap-2 text-xs hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View My Profile
        </Button>
      </Link>
    </div>
  );
}

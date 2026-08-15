'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Building2, User, ExternalLink, MapPin, Link as LinkIcon, Sparkles, TrendingUp } from 'lucide-react';

interface UserProfile {
  name?: string;
  displayName?: string;
  bio?: string;
  photoURL?: string;
  avatar?: string;
  logoUrl?: string;
  role?: 'creator' | 'business';
  location?: string;
  website?: string;
  username?: string;
}

export function ProfileCard() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userRef);
  const isLoading = isUserLoading || isProfileLoading;

  if (!user) return null;

  const displayName = profile?.displayName ?? profile?.name ?? user.email ?? 'User';
  const avatar = profile?.logoUrl ?? profile?.photoURL ?? profile?.avatar;
  const role = profile?.role ?? 'creator';
  const profileHref =
    role === 'creator'
      ? `/creator/profile/${user.uid}`
      : `/business/profile`;

  if (isLoading) {
    return (
      <div className="bg-[#0f0f13] border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full flex-shrink-0 bg-white/10" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-28 rounded bg-white/10" />
            <Skeleton className="h-3 w-16 rounded bg-white/5" />
          </div>
        </div>
        <Skeleton className="h-3 w-full rounded bg-white/10" />
        <Skeleton className="h-3 w-4/5 rounded bg-white/5" />
        <Skeleton className="h-9 w-full rounded-xl bg-white/10" />
      </div>
    );
  }

  return (
    <div
      id="feed-profile-card"
      className="bg-[#0f0f13] border border-white/[0.06] rounded-2xl overflow-hidden"
    >
      {/* Banner gradient */}
      <div className="relative h-16 bg-gradient-to-br from-primary/30 via-blue-600/20 to-purple-600/30">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0f0f13] to-transparent" />
      </div>

      <div className="px-4 pb-4 -mt-7 space-y-3">
        {/* Avatar + name */}
        <div className="flex items-end justify-between">
          <div className="relative">
            <Avatar className="h-14 w-14 ring-3 ring-[#0f0f13] ring-offset-1 ring-offset-[#0f0f13]">
              <AvatarImage src={avatar} />
              <AvatarFallback className="bg-gradient-to-br from-primary/40 to-blue-600/30 text-primary font-bold text-lg">
                {displayName[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0f0f13] bg-green-500" />
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wider mb-1',
              role === 'business'
                ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20'
                : 'bg-primary/15 text-primary ring-1 ring-primary/20'
            )}
          >
            {role === 'business' ? (
              <Building2 className="h-2.5 w-2.5" />
            ) : (
              <Sparkles className="h-2.5 w-2.5" />
            )}
            {role}
          </span>
        </div>

        <div>
          <p className="font-bold text-base text-foreground">{displayName}</p>
          {profile?.username && (
            <p className="text-xs text-muted-foreground">@{profile.username}</p>
          )}
        </div>

        {/* Bio */}
        {profile?.bio && (
          <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3">
            {profile.bio}
          </p>
        )}

        {/* Meta: location & website */}
        <div className="space-y-1.5">
          {profile?.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <MapPin className="h-3 w-3 flex-shrink-0 text-primary/60" />
              <span className="truncate">{profile.location}</span>
            </div>
          )}
          {profile?.website && (
            <div className="flex items-center gap-1.5 text-xs">
              <LinkIcon className="h-3 w-3 flex-shrink-0 text-primary/60" />
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
        <div className="border-t border-white/[0.06]" />

        {/* View profile button */}
        <Link href={profileHref} className="block">
          <Button
            id="profile-card-view-btn"
            size="sm"
            className="w-full rounded-xl gap-2 text-xs btn-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View My Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

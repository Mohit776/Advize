'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase';
import { useNotifications } from '@/hooks/use-notifications';
import type { Notification } from '@/lib/types';

function getNotificationHref(notif: Notification): string {
  if (!notif.campaignId) return '#';
  if (notif.type === 'new_submission') return `/business/campaigns/${notif.campaignId}`;
  return `/campaigns/${notif.campaignId}`;
}

function groupByDate(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const notif of notifications) {
    const createdAt =
      notif.createdAt && typeof (notif.createdAt as any).toDate === 'function'
        ? (notif.createdAt as any).toDate()
        : notif.createdAt
        ? new Date(notif.createdAt as any)
        : new Date();

    if (createdAt >= today) {
      groups[0].items.push(notif);
    } else if (createdAt >= yesterday) {
      groups[1].items.push(notif);
    } else {
      groups[2].items.push(notif);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 border-b border-border/40">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { notifications, unreadCount, isLoading, markAllRead, markOneRead } = useNotifications();

  useEffect(() => {
    if (!user && !isLoading) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  const grouped = groupByDate(notifications);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/50 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">All caught up!</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              You have no notifications yet. They'll appear here when there's activity on your account.
            </p>
          </div>
        )}

        {/* Notification groups */}
        {!isLoading && grouped.length > 0 && (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                  {group.label}
                </p>
                <div className="rounded-xl border border-border/40 bg-card overflow-hidden divide-y divide-border/40">
                  {group.items.map((notif) => {
                    const href = getNotificationHref(notif);
                    const createdAt =
                      notif.createdAt && typeof (notif.createdAt as any).toDate === 'function'
                        ? (notif.createdAt as any).toDate()
                        : notif.createdAt
                        ? new Date(notif.createdAt as any)
                        : new Date();

                    return (
                      <Link
                        key={notif.id}
                        href={href}
                        onClick={() => markOneRead(notif.id)}
                        className={cn(
                          'flex items-start gap-4 p-4 transition-colors hover:bg-muted/30',
                          !notif.isRead && 'bg-primary/5'
                        )}
                      >
                        {/* Unread dot */}
                        <div className="flex-shrink-0 mt-1">
                          {notif.isRead ? (
                            <div className="h-2.5 w-2.5 rounded-full bg-transparent border border-border" />
                          ) : (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-semibold', notif.isRead && 'font-normal text-muted-foreground')}>
                            {notif.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1.5">
                            {formatDistanceToNow(createdAt, { addSuffix: true })}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

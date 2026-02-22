
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, User as UserIcon, Settings, LayoutDashboard, Wallet, Bell, FileText, MessageSquare, Search, Download, LogOut, Megaphone, Home } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useUser, useAuth, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { doc, getDoc, collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Campaign, Submission } from '@/lib/types';


const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
];

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userLogo, setUserLogo] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Capture the install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    // If already installed in standalone mode, hide the button
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          setUserLogo(userData.logoUrl || null);
        }
      } else {
        setUserRole(null);
        setUserLogo(null);
      }
    };
    fetchUserData();
  }, [user, firestore]);

  const campaignsQuery = useMemoFirebase(
    () => user && userRole === 'business' ? query(collection(firestore, 'campaigns'), where('businessId', '==', user.uid)) : null,
    [user, userRole, firestore]
  );
  const { data: rawCampaigns } = useCollection<Campaign>(campaignsQuery);
  const campaignIds = useMemo(() => rawCampaigns?.map(c => c.id) || [], [rawCampaigns]);

  const submissionsQuery = useMemoFirebase(
    () => (firestore && campaignIds.length > 0 && user) ? query(collection(firestore, 'submissions'), where('campaignId', 'in', campaignIds), where('businessId', '==', user.uid)) : null,
    [firestore, campaignIds, user]
  );
  const { data: submissions } = useCollection<Submission>(submissionsQuery);

  const pendingSubmissions = useMemo(() => {
    if (userRole !== 'business' || !submissions) return [];

    const campaignMap = new Map(rawCampaigns?.map(c => [c.id, c.name]));

    return submissions
      .filter(s => s.status === 'pending')
      .map(s => ({
        ...s,
        campaignName: campaignMap.get(s.campaignId) || 'a campaign',
      }));
  }, [submissions, rawCampaigns, userRole]);


  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      router.push('/');
    }
  };

  const getProfileLink = () => {
    if (userRole === 'creator') return `/creator/profile/${user?.uid}`;
    if (userRole === 'business') return '/business/profile';
    return '/'; // Fallback
  }

  const getMessagesLink = () => {
    if (userRole === 'business') return '/business/messages';
    if (userRole === 'creator') return '/creator/messages';
    return '#'; // Fallback
  }

  const getWalletLink = () => {
    if (userRole === 'business') return '/business/wallet';
    if (userRole === 'creator') return '/creator/wallet';
    return '#';
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 sm:h-20 max-w-screen-2xl items-center px-4 sm:px-6">
        <div className="mr-8 hidden md:flex">
          <Logo />
        </div>

        <div className="flex items-center md:hidden">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 hover:bg-primary/10 transition-all">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 flex flex-col p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              {/* Header */}
              <div className="p-5 border-b border-border/40">
                <Logo />
              </div>

              {/* User badge (logged-in only) */}
              {user && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/20">
                  <Avatar className="h-9 w-9 border-2 border-border/50">
                    <AvatarImage src={userLogo ?? user.photoURL ?? ''} alt={user.displayName ?? ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user.displayName || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                {user ? (
                  // Logged-in navigation: role-based
                  userRole === 'creator' ? (
                    <>
                      {[
                        { href: user?.uid ? `/creator/profile/${user.uid}` : '#', label: 'My Profile', icon: UserIcon },
                        { href: '/campaigns', label: 'Browse Campaigns', icon: Search },
                        { href: '/creator/messages', label: 'Messages', icon: MessageSquare },
                        { href: '/creator/wallet', label: 'Wallet', icon: Wallet },
                        { href: '/settings', label: 'Settings', icon: Settings },
                      ].map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setIsMenuOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                              isActive ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-muted/50 hover:text-foreground'
                            )}
                          >
                            <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                            {label}
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                          </Link>
                        );
                      })}
                    </>
                  ) : userRole === 'business' ? (
                    <>
                      {[
                        { href: '/business/profile', label: 'Profile', icon: UserIcon },
                        { href: '/business/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { href: '/business/campaigns', label: 'My Campaigns', icon: Megaphone },
                        { href: '/business/explore', label: 'Explore Creators', icon: Search },
                        { href: '/business/messages', label: 'Messages', icon: MessageSquare },
                        { href: '/business/wallet', label: 'Wallet', icon: Wallet },
                        { href: '/settings', label: 'Settings', icon: Settings },
                      ].map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setIsMenuOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                              isActive ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-muted/50 hover:text-foreground'
                            )}
                          >
                            <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                            {label}
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                          </Link>
                        );
                      })}
                    </>
                  ) : null
                ) : (
                  // Guest navigation
                  <>
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                          pathname === link.href
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground/70 hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <div className="pt-4 space-y-2">
                      <Button asChild className="w-full" onClick={() => setIsMenuOpen(false)}>
                        <Link href="/signup">Get Started</Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full" onClick={() => setIsMenuOpen(false)}>
                        <Link href="/login">Login</Link>
                      </Button>
                    </div>
                  </>
                )}
              </nav>

              {/* Sign Out (logged-in only) */}
              {user && (
                <div className="border-t border-border/40 p-3">
                  <button
                    onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              )}
            </SheetContent>
          </Sheet>
          <div className="md:hidden">
            <Logo />
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                'hover:bg-primary/10 hover:text-primary',
                pathname === link.href
                  ? 'text-primary bg-primary/10'
                  : 'text-foreground/70'
              )}
            >
              {link.label}
              {pathname === link.href && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-3">
          {/* Install App button — only shown when PWA is installable */}
          {!isInstalled && installPrompt && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstall}
              className="hidden sm:flex gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-all"
            >
              <Download className="h-4 w-4" />
              Install App
            </Button>
          )}
          {!isInstalled && installPrompt && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleInstall}
              className="sm:hidden text-primary hover:bg-primary/10 transition-all"
              title="Install App"
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          {isUserLoading ? (
            <div className="h-10 w-24 animate-pulse rounded-lg bg-muted/50" />
          ) : !user ? (
            <>
              <Button
                variant="ghost"
                asChild
                className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                <Link href="/login">Login</Link>
              </Button>
              <Button
                asChild
                className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 hover:scale-105"
              >
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          ) : (
            <>
              {userRole === 'business' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative hover:bg-primary/10 transition-all duration-200"
                    >
                      <Bell className="h-5 w-5" />
                      {pendingSubmissions.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
                          {pendingSubmissions.length}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Pending Submissions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {pendingSubmissions.length > 0 ? (
                      pendingSubmissions.map(submission => (
                        <DropdownMenuItem key={submission.id} asChild className="p-0">
                          <Link href={`/business/campaigns/${submission.campaignId}`} className="block w-full p-2 text-wrap hover:bg-accent">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <FileText className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground">New submission for</p>
                                <p className="font-semibold text-foreground text-sm truncate">"{submission.campaignName}"</p>
                                <p className="text-xs text-muted-foreground">from {submission.creatorName}</p>
                              </div>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        You have no new notifications.
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-11 w-11 rounded-full hover:ring-2 hover:ring-primary/20 transition-all duration-200"
                  >
                    <Avatar className="h-10 w-10 border-2 border-border/50">
                      <AvatarImage src={userLogo ?? user.photoURL ?? ''} alt={user.displayName ?? ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={getProfileLink()}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  {userRole === 'business' && (
                    <DropdownMenuItem asChild>
                      <Link href="/business/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {userRole === 'business' && (
                    <DropdownMenuItem asChild>
                      <Link href="/business/explore">
                        <Search className="mr-2 h-4 w-4" />
                        <span>Explore</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href={getMessagesLink()}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Messages</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={getWalletLink()}>
                      <Wallet className="mr-2 h-4 w-4" />
                      <span>Wallet</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Home,
    LayoutDashboard,
    Megaphone,
    MessageSquare,
    User,
    Settings,
    LogOut,
    TrendingUp,
    Search,
    Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

export function Sidebar() {
    const pathname = usePathname();
    const { signOut } = useAuth();
    const { user } = useUser();
    const firestore = useFirestore();
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserRole = async () => {
            if (user) {
                const userDocRef = doc(firestore, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role);
                }
            } else {
                setUserRole(null);
            }
        };
        fetchUserRole();
    }, [user, firestore]);

    const handleSignOut = async () => {
        await signOut();
    };

    // Business-specific navigation
    const businessNav = [
        { name: 'Profile', href: '/business/profile', icon: User },
        { name: 'Dashboard', href: '/business/dashboard', icon: LayoutDashboard },
        { name: 'My Campaigns', href: '/business/campaigns', icon: Megaphone },
        { name: 'Explore Creators', href: '/business/explore', icon: Search },
        { name: 'Messages', href: '/business/messages', icon: MessageSquare },
        { name: 'Wallet', href: '/business/wallet', icon: Wallet },
    ];

    // Creator-specific navigation
    const creatorNav = [
        { name: 'My Profile', href: user?.uid ? `/creator/profile/${user.uid}` : '#', icon: User },
        { name: 'Browse Campaigns', href: '/campaigns', icon: Search },
        { name: 'Messages', href: '/creator/messages', icon: MessageSquare },
        { name: 'Wallet', href: '/creator/wallet', icon: Wallet },
    ];

    // Public navigation (guest)
    const publicNav = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
    ];

    // Common navigation for all logged-in users
    const commonNav = [
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    // Determine which navigation to show
    let navigation = publicNav;

    if (user && userRole === 'business') {
        navigation = [...businessNav, ...commonNav];
    } else if (user && userRole === 'creator') {
        navigation = [...creatorNav, ...commonNav];
    }

    // Don't render sidebar if not logged in (show only on dashboard pages)
    if (!user) {
        return null;
    }

    return (
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:border-r lg:bg-card/50 lg:backdrop-blur-xl lg:shrink-0 transition-all duration-300 sticky top-16 h-[calc(100vh-theme(spacing.16))]">
            <div className="flex flex-col flex-1 min-h-0">
                {/* Section Header */}
                <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-border/40">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            {userRole === 'business' ? <LayoutDashboard className="h-5 w-5 text-primary" /> :
                                userRole === 'creator' ? <User className="h-5 w-5 text-primary" /> :
                                    <Home className="h-5 w-5 text-primary" />}
                        </div>
                        <h2 className="text-lg font-bold tracking-tight">
                            {userRole === 'business' ? 'Business Hub' : userRole === 'creator' ? 'Creator Studio' : 'Advize'}
                        </h2>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                )}
                            >
                                <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                                {item.name}
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="flex-shrink-0 p-4 border-t border-border/40 bg-muted/10">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={handleSignOut}
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </aside>
    );
}

'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useState, useMemo } from 'react';
import { collection, query, where, orderBy, DocumentData } from 'firebase/firestore';
import { Campaign } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Activity, CreditCard, TrendingUp, Users } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';


import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { CampaignPost } from '@/app/business/profile/_components/campaign-post';

export default function BusinessCampaignsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

    const campaignsQuery = useMemoFirebase(
        () => user ? query(collection(firestore, 'campaigns'), where('businessId', '==', user.uid)) : null,
        [user, firestore]
    );
    const { data: allCampaigns, isLoading } = useCollection<Campaign>(campaignsQuery);

    const stats = useMemo(() => {
        if (!allCampaigns) return { active: 0, budget: 0, distinctCreators: 0 };

        const active = allCampaigns.filter(c => c.status === 'Active').length;
        const budget = allCampaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
        // Estimate unique creators (mock logic as we don't fetch all sub-collections here efficiently)
        // Just sum up creatorIds arrays if available
        const distinctCreators = new Set(allCampaigns.flatMap(c => c.creatorIds || [])).size;

        return { active, budget, distinctCreators };
    }, [allCampaigns]);

    // Client-side sort and filter
    const getFilteredCampaigns = (statusFilter: 'all' | 'active' | 'completed') => {
        return allCampaigns
            ?.sort((a, b) => {
                const dateA = a.startDate?.seconds ? new Date(a.startDate.seconds * 1000) : new Date(0);
                const dateB = b.startDate?.seconds ? new Date(b.startDate.seconds * 1000) : new Date(0);
                return dateB.getTime() - dateA.getTime();
            })
            .filter(campaign => {
                if (statusFilter === 'all') return true;
                const status = (campaign.status as string).toLowerCase();
                if (statusFilter === 'active') return status === 'active';
                if (statusFilter === 'completed') return status === 'completed';
                return true;
            }) || [];
    };

    if (isUserLoading || isLoading) {
        return (
            <div className="container py-8 space-y-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-[300px]" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Campaign Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Overview of your marketing performance and campaigns.</p>
                </div>
                <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
                    <Link href="/business/campaigns/new">
                        <Plus className="mr-2 h-4 w-4" /> Create New Campaign
                    </Link>
                </Button>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                        <p className="text-xs text-muted-foreground">Currently running</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Budget Committed</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.budget.toLocaleString('en-IN')}</div>
                        <p className="text-xs text-muted-foreground">Across all campaigns</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Creators</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.distinctCreators}</div>
                        <p className="text-xs text-muted-foreground">Participating in campaigns</p>
                    </CardContent>
                </Card>
            </div>

            {/* Campaign Lists */}
            <Tabs defaultValue="active" className="space-y-6" onValueChange={(v) => setFilter(v as any)}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="completed">Completed</TabsTrigger>
                        <TabsTrigger value="all">All Campaigns</TabsTrigger>
                    </TabsList>
                </div>

                {['active', 'completed', 'all'].map((tabValue) => {
                    const campaigns = getFilteredCampaigns(tabValue as any);
                    return (
                        <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                            {campaigns.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {campaigns.map((campaign) => (
                                        <CampaignPost
                                            key={campaign.id}
                                            campaign={{
                                                ...campaign,
                                                views: 0,
                                                progress: 0,
                                                acquiredCpm: 0
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg border-dashed bg-card/50">
                                    <div className="bg-muted/50 p-4 rounded-full mb-4">
                                        <TrendingUp className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-lg font-medium">No {tabValue === 'all' ? '' : tabValue} campaigns found</p>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                        {tabValue === 'active'
                                            ? "You don't have any active campaigns running at the moment."
                                            : "No campaigns match this filter."}
                                    </p>
                                    {tabValue === 'active' && (
                                        <Button asChild variant="outline" className="mt-6">
                                            <Link href="/business/campaigns/new">Launch a Campaign</Link>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}

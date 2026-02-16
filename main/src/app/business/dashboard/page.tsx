
'use client';

import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Eye,
  Percent,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignPost } from '../profile/_components/campaign-post';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Campaign } from '@/lib/types';

export default function BusinessDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const campaignsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'campaigns'), where('businessId', '==', user.uid)) : null,
    [user, firestore]
  );
  
  const { data: rawCampaigns, isLoading: campaignsLoading } = useCollection<Campaign>(campaignsQuery);

  const campaigns = useMemo(() => {
    if (!rawCampaigns) return [];
    return rawCampaigns.map(c => {
      const views = 0;
      const progress = 0;
      const acquiredCpm = undefined;

      return {
          ...c,
          views: views,
          progress: progress,
          acquiredCpm: acquiredCpm,
      };
    });
  }, [rawCampaigns]);
  
  const stats = useMemo(() => {
    if (!campaigns) return { totalCampaigns: 0, totalViews: 0, totalBudget: 0, avgEngagement: 0, avgCpm: 0, totalPaid: 0, totalPending: 0 };
    
    const totalViews = campaigns.reduce((acc, c) => acc + c.views, 0);
    const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget ?? 0), 0);
    const totalPaid = 0;

    return {
        totalCampaigns: campaigns.length,
        totalViews: totalViews,
        totalBudget: totalBudget,
        avgEngagement: 0,
        avgCpm: 0,
        totalPaid: totalPaid,
        totalPending: 0,
    };
  }, [campaigns]);
  
  const topCampaignsData = useMemo(() => {
    if (!campaigns) return [];
    return campaigns
      .sort((a, b) => b.views - a.views)
      .slice(0, 4)
      .map(c => ({ 
          id: c.id,
          name: c.name, 
          views: c.views,
          performance: [
              {name: 'W1', views: 0},
              {name: 'W2', views: 0},
              {name: 'W3', views: 0},
              {name: 'W4', views: c.views},
          ]
      }));
  }, [campaigns]);

  const isLoading = isUserLoading || campaignsLoading;

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/business/profile">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">
                Dashboard
            </h2>
        </div>
      </div>
      
      {/* Quick Actions */}
      <Card>
          <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button asChild variant="default" size="lg">
                <Link href="/business/campaigns/new">
                  <Briefcase className="mr-2 h-4 w-4"/>
                  New Campaign
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                  <Link href="/business/wallet">
                    <Wallet className="mr-2 h-4 w-4"/>
                    Add Funds
                  </Link>
              </Button>
          </CardContent>
      </Card>

       {/* Summary Bar */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[126px]" />)
        ) : (
            <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">+{stats.totalCampaigns}</div>
                    <p className="text-xs text-muted-foreground">Active and Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Verified Views</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalViews.toLocaleString('en-IN')}</div>
                    <p className="text-xs text-muted-foreground">Across all campaigns</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average CPM</CardTitle>
                    <span className="text-muted-foreground">₹</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{stats.avgCpm.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Cost per 1,000 views</p>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.avgEngagement}%</div>
                    <p className="text-xs text-muted-foreground">Across all campaigns</p>
                  </CardContent>
                </Card>
            </>
        )}
      </div>


      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        
        {/* Left Column - Campaign Performance */}
        <div className="col-span-1 lg:col-span-3">
            <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">📊 Overview</TabsTrigger>
                  <TabsTrigger value="campaigns">🗂 Campaign Feed</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Verified Views Over Time</CardTitle>
                            <CardDescription>Performance data will be shown here once campaigns are live.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center">
                           <div className="text-center">
                              <Eye className="mx-auto h-12 w-12 text-muted-foreground" />
                              <h3 className="mt-4 text-lg font-medium">No View Data Yet</h3>
                              <p className="mt-2 text-sm text-muted-foreground">
                                View analytics will appear here once creators start posting.
                              </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Campaigns</CardTitle>
                            <CardDescription>A quick look at your top performing campaigns by views.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {campaigns.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topCampaignsData.map((campaign) => (
                                    <Card key={campaign.id} className="flex flex-col">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">{campaign.name}</CardTitle>
                                            <p className="text-2xl font-bold">{campaign.views.toLocaleString('en-IN')}</p>
                                            <CardDescription>Total Views</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1 pb-0">
                                            <ResponsiveContainer width="100%" height={80}>
                                                <AreaChart data={campaign.performance}>
                                                    <defs>
                                                        <linearGradient id={`colorViews-${campaign.id}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <Tooltip
                                                        cursor={{fill: 'hsl(var(--muted))'}}
                                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                                                        labelFormatter={() => ''}
                                                    />
                                                    <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill={`url(#colorViews-${campaign.id})`} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                          ) : (
                            <div className="h-[200px] flex items-center justify-center text-center">
                              <div>
                                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-medium">No Campaigns Found</h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Create a campaign to see its performance here.
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="campaigns">
                     <Card>
                        <CardHeader>
                            <CardTitle>Campaign Feed</CardTitle>
                            <CardDescription>An overview of your active and past campaigns.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {isLoading ? (
                            <>
                                <Skeleton className="h-[380px]" />
                                <Skeleton className="h-[380px]" />
                            </>
                           ) : campaigns.length > 0 ? (
                             campaigns.map((campaign) => (
                               <CampaignPost key={campaign.id} campaign={campaign} />
                             ))
                           ) : (
                            <p className="text-muted-foreground md:col-span-2 text-center py-8">You haven't created any campaigns yet.</p>
                           )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>

        {/* Right Column - Financial Analytics */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Financial Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Total Brand Budget</h4>
                            <span className="font-bold">₹{stats.totalBudget.toLocaleString('en-IN')}</span>
                        </div>
                        <Progress value={(stats.totalPaid / stats.totalBudget) * 100} />
                         <p className="text-xs text-muted-foreground">Total allocated budget for all campaigns.</p>
                    </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Total Paid to Creators</h4>
                            <span className="font-bold text-green-400">₹{stats.totalPaid.toLocaleString('en-IN')}</span>
                        </div>
                        <Progress value={(stats.totalPaid / stats.totalBudget) * 100} className="[&>div]:bg-green-500" />
                        <p className="text-xs text-muted-foreground">{stats.totalBudget > 0 ? ((stats.totalPaid / stats.totalBudget) * 100).toFixed(1) : 0}% of total budget paid out.</p>
                    </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium">Pending Payouts</h4>
                            <span className="font-bold text-orange-400">₹{stats.totalPending.toLocaleString('en-IN')}</span>
                        </div>
                        <Progress value={(stats.totalPending / stats.totalBudget) * 100} className="[&>div]:bg-orange-500" />
                        <p className="text-xs text-muted-foreground">{stats.totalBudget > 0 ? ((stats.totalPending / stats.totalBudget) * 100).toFixed(1) : 0}% of total budget pending verification.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}


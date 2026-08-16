'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Earning, Transaction } from '@/lib/types';
import { TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WalletAnalyticsProps {
    earnings: Earning[] | null;
    transactions: Transaction[] | null;
    isLoading: boolean;
}

export function WalletAnalytics({ earnings, transactions, isLoading }: WalletAnalyticsProps) {
  
  if (isLoading) {
      return <Skeleton className="h-[320px]" />
  }

  const noData = !earnings || earnings.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Trends</CardTitle>
        <CardDescription>Analytics will appear here as you complete campaigns.</CardDescription>
      </CardHeader>
      <CardContent>
        {noData ? (
          <div className="h-[240px] flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No Analytics Data</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete campaigns to see your financial trends.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="weekly-earnings">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="weekly-earnings">Weekly</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="platform">Platforms</TabsTrigger>
            </TabsList>
            <TabsContent value="weekly-earnings">
              <div className="h-[200px] w-full pt-4">
                 <p className="text-center text-muted-foreground">Weekly earnings chart coming soon.</p>
              </div>
            </TabsContent>
            <TabsContent value="trends">
              <div className="h-[200px] w-full pt-4">
                 <p className="text-center text-muted-foreground">Monthly trends chart coming soon.</p>
              </div>
            </TabsContent>
            <TabsContent value="platform">
              <div className="h-[200px] w-full pt-4">
                <p className="text-center text-muted-foreground">Earnings by platform chart coming soon.</p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

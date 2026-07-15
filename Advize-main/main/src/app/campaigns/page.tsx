
'use client';
import { PublicFooter } from '@/components/layout/public-footer';
import { PublicHeader } from '@/components/layout/public-header';
import { Sidebar } from '@/components/layout/sidebar';
import { CampaignFeed } from './_components/campaign-feed';


export default function CampaignsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="container py-8 px-4 md:px-6">
            {/* Header & Filters */}
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between mb-8">
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold tracking-tighter font-headline md:text-4xl">
                  Content Rewards
                </h1>
                <p className="mt-2 text-muted-foreground max-w-lg">
                  Post content on social media and get paid for the views you generate.
                </p>
              </div>
            </div>

            <CampaignFeed />

          </div>
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}

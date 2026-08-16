
'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Group, Campaign } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export default function MessagesPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const groupsQuery = useMemoFirebase(
        () => (user ? query(collection(firestore, 'groups'), where('adminId', '==', user.uid)) : null),
        [user, firestore]
    );
    const { data: groups, isLoading: groupsLoading } = useCollection<Group>(groupsQuery);
    
    const campaignIds = useMemo(() => groups?.map(g => g.campaignId) || [], [groups]);

    const campaignsQuery = useMemoFirebase(
        () => (firestore && campaignIds.length > 0 ? query(collection(firestore, 'campaigns'), where('id', 'in', campaignIds)) : null),
        [firestore, campaignIds]
    );
    const { data: campaigns, isLoading: campaignsLoading } = useCollection<Campaign>(campaignsQuery);

    const campaignMap = useMemo(() => {
        if (!campaigns) return new Map();
        return new Map(campaigns.map(c => [c.id, c]));
    }, [campaigns]);

    const isLoading = isUserLoading || groupsLoading || (campaignIds.length > 0 && campaignsLoading);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/business/profile">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold font-headline">Messages</h1>
                    <p className="text-muted-foreground">Your campaign chat groups.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Campaign Groups</CardTitle>
                    <CardDescription>Select a campaign to view messages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-3">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        ))
                    ) : groups && groups.length > 0 ? (
                        groups.map(group => {
                            const campaign = campaignMap.get(group.campaignId);
                            return (
                                <Link key={group.id} href={`/business/messages/${group.id}`} className="block">
                                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={campaign?.brandLogo} alt={group.name} />
                                            <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-semibold">{group.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {group.memberIds.length} creator(s) in this group.
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                             <MessageSquare className="mx-auto h-12 w-12" />
                            <p className="mt-4 font-semibold">No message groups found.</p>
                            <p className="mt-1 text-sm">Groups are automatically created when you start a new campaign.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

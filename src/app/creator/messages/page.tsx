
'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { Group, Campaign, CollaborationRequest } from "@/lib/types";
import { CollaborationRequestCard } from "@/app/creator/profile/_components/collaboration-request-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export default function CreatorMessagesPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const groupsQuery = useMemoFirebase(
        () => (user ? query(collection(firestore, 'groups'), where('memberIds', 'array-contains', user.uid)) : null),
        [user, firestore]
    );
    const { data: groups, isLoading: groupsLoading } = useCollection<Group>(groupsQuery);
    
    const requestsQuery = useMemoFirebase(
        () => (user ? query(collection(firestore, `users/${user.uid}/collaborationRequests`), orderBy('createdAt', 'desc')) : null),
        [user, firestore]
    );
    const { data: collaborationRequests, isLoading: requestsLoading } = useCollection<CollaborationRequest>(requestsQuery);
    
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

    const isLoading = isUserLoading || groupsLoading || (campaignIds.length > 0 && campaignsLoading) || requestsLoading;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href={`/creator/profile/${user?.uid}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold font-headline">Messages</h1>
                    <p className="text-muted-foreground">Your campaign group chats and direct messages.</p>
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
                                <Link key={group.id} href={`/creator/messages/${group.id}`} className="block">
                                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={campaign?.brandLogo} alt={group.name} />
                                            <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-semibold">{group.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Group chat for {campaign?.brandName}
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
                            <p className="mt-1 text-sm">When you join a campaign, its group chat will appear here.</p>
                             <Button asChild variant="link" className="mt-4">
                                <Link href="/campaigns">Explore Campaigns</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Direct Messages</CardTitle>
                    <CardDescription>Messages from businesses and brands.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-1/4" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </div>
                        ))
                    ) : collaborationRequests && collaborationRequests.length > 0 ? (
                        collaborationRequests.map((request) => (
                            <CollaborationRequestCard key={request.id} request={request} />
                        ))
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <MessageSquare className="mx-auto h-12 w-12" />
                            <p className="mt-4 font-semibold">No direct messages yet.</p>
                            <p className="mt-1 text-sm">When brands reach out, their messages will appear here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

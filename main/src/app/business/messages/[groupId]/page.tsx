
'use client';

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Group } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";


export default function GroupChatPage() {
    const params = useParams();
    const groupId = params.groupId as string;
    const firestore = useFirestore();
    const { user } = useUser();

    const groupRef = useMemoFirebase(
        () => (firestore && groupId && user ? doc(firestore, 'groups', groupId) : null),
        [firestore, groupId, user]
    );
    const { data: group, isLoading } = useDoc<Group>(groupRef);


    if (isLoading) {
        return (
            <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-1/2" />
                </div>
                <Skeleton className="flex-1 w-full" />
            </div>
        )
    }

    if (!group) {
        return (
             <div className="text-center py-10 text-muted-foreground flex-1 flex flex-col items-center justify-center">
                <MessageSquare className="mx-auto h-12 w-12" />
                <p className="mt-4 font-semibold">Group not found.</p>
                <p className="mt-1 text-sm">This chat group does not exist or you may not have access.</p>
                 <Button asChild variant="link" className="mt-4">
                    <Link href="/business/messages">Back to Messages</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/business/messages">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-xl font-bold font-headline">{group.name}</h1>
                    <p className="text-sm text-muted-foreground">Campaign Group Chat</p>
                </div>
            </div>

            <Card className="flex-1 flex flex-col">
                <ChatInterface groupId={groupId} />
            </Card>
        </div>
    );
}


'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import type { CollaborationRequest } from '@/lib/types';
import { format } from 'date-fns';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CollaborationRequestCardProps {
  request: CollaborationRequest;
}

export function CollaborationRequestCard({ request }: CollaborationRequestCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [receivedAt, setReceivedAt] = useState('');

  useEffect(() => {
    if (request.createdAt) {
      setReceivedAt(format(new Date(request.createdAt.seconds * 1000), "PPP p"));
    }
  }, [request.createdAt]);


  const handleMarkAsRead = () => {
    if (user && firestore && request.status === 'pending') {
      const requestRef = doc(firestore, `users/${user.uid}/collaborationRequests`, request.id);
      updateDocumentNonBlocking(requestRef, { status: 'read' });
    }
  };

  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
                 <Avatar>
                    <AvatarFallback>{request.fromUserName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-base font-semibold">{request.fromUserName}</CardTitle>
                    <CardDescription>{receivedAt}</CardDescription>
                </div>
            </div>
            <Badge
                variant={request.status === 'pending' ? 'secondary' : 'default'}
                className={
                  request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  : request.status === 'read' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : ''
                }
            >
                {request.status}
            </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible onValueChange={handleMarkAsRead}>
          <AccordionItem value="item-1" className="border-none">
            <h4 className="font-semibold text-foreground">{request.subject}</h4>
            <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline justify-start gap-1 py-1">View Message</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-2">
                {request.body}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
       {request.campaignId && (
        <CardFooter className="justify-end">
          <Button asChild variant="default" size="sm">
            <Link href={`/campaigns/${request.campaignId}`}>
              View Campaign <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

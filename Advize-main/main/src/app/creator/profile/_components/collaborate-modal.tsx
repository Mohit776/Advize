'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import React, { useState } from 'react';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';

const formSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters.'),
  body: z.string().min(20, 'Message body must be at least 20 characters.'),
});

interface CollaborateModalProps {
  children: React.ReactNode;
  creatorName: string;
  creatorId: string;
}

export function CollaborateModal({
  children,
  creatorName,
  creatorId,
}: CollaborateModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      body: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to send a collaboration request.',
      });
      return;
    }

    if (!firestore) return;
    
    // Fetch the sender's user document to get their name
    const fromUserRef = doc(firestore, 'users', user.uid);
    const fromUserDoc = await getDoc(fromUserRef);
    const fromUserName = fromUserDoc.exists() ? fromUserDoc.data().name : 'A Business';

    const requestsColRef = collection(firestore, `users/${creatorId}/collaborationRequests`);
    
    addDocumentNonBlocking(requestsColRef, {
      fromUserId: user.uid,
      fromUserName: fromUserName || 'A Business',
      toUserId: creatorId,
      subject: values.subject,
      body: values.body,
      status: 'pending',
      createdAt: new Date(),
    });

    toast({
      title: 'Request Sent!',
      description: `Your collaboration request has been sent to ${creatorName}.`,
    });
    setIsOpen(false);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Collaborate with {creatorName}</DialogTitle>
          <DialogDescription>
            Send a message to start a conversation about a potential partnership.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Partnership Opportunity" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Hi ${creatorName},\n\nWe'd love to discuss a potential collaboration...`}
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Sending...' : 'Send Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

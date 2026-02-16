
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, arrayUnion, serverTimestamp, getDoc } from 'firebase/firestore';

const publicSchema = z.object({
  link: z.string().url({ message: 'Please enter a valid URL for your post.' }),
  username: z.string(), // Not explicitly shown, but can be part of logic
});

const privateSchema = z.object({
  link: z.string().min(2, 'Please enter your profile username/link.'),
  username: z.string(), // Same as above
});


interface JoinCampaignModalProps {
  children: React.ReactNode;
  campaignId: string;
  campaignName: string;
  visibility: 'public' | 'private';
  businessId: string;
}

export function JoinCampaignModal({
  children,
  campaignId,
  campaignName,
  visibility,
  businessId
}: JoinCampaignModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const formSchema = visibility === 'public' ? publicSchema : privateSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      link: '',
      username: ''
    },
  });

  const linkLabel = visibility === 'public' ? "Post Link" : "Profile Link";
  const linkPlaceholder = visibility === 'public' ? "https://instagram.com/p/..." : "@your-username";
  const linkDescription = visibility === 'public'
    ? "The direct URL to your video or post."
    : "Your username or profile link on the relevant platform.";


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to join a campaign.',
      });
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    const creatorName = userDoc.exists() ? userDoc.data().name : 'Unnamed Creator';

    // 1. Add submission to the 'submissions' collection
    const submissionsColRef = collection(firestore, 'submissions');
    addDocumentNonBlocking(submissionsColRef, {
      campaignId: campaignId,
      businessId: businessId, // Required by security rules
      creatorId: user.uid,
      creatorName: creatorName,
      postUrl: values.link,
      username: values.link, // Use the same value for simplicity for now
      status: 'pending',
      submittedAt: serverTimestamp(),
    });

    // Note: creatorIds is updated by the business when they approve the submission

    toast({
      title: 'Submission Received!',
      description: `Your submission for "${campaignName}" has been received for verification.`,
    });
    setIsOpen(false);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Campaign: {campaignName}</DialogTitle>
          <DialogDescription>
            Submit your content for verification. Once approved, you'll be eligible for payouts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{linkLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={linkPlaceholder} {...field} />
                    </FormControl>
                    <FormDescription>{linkDescription}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Submit for Verification</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

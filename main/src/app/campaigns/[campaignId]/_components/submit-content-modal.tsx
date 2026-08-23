'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';

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
import { useFirestore } from '@/firebase';

import {
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const schema = z.object({
  link: z.string().url({
    message: 'Please enter a valid URL.',
  }),
});

interface SubmitContentModalProps {
  children: React.ReactNode;
  submissionId: string;
  currentPostUrl?: string;
}

export function SubmitContentModal({
  children,
  submissionId,
  currentPostUrl,
}: SubmitContentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      link: currentPostUrl || '',
    },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!firestore || !submissionId) return;

    setIsLoading(true);

    try {
      const submissionRef = doc(
        firestore,
        'submissions',
        submissionId
      );

      await updateDoc(submissionRef, {
        postUrl: values.link,
        status: 'pending',
        rejectionReason: null,
        submittedAt: serverTimestamp(),
        resubmittedAt: serverTimestamp(),
      });

      toast({
        title: 'Reel Submitted',
        description:
          'Your Reel has been submitted and is pending verification.',
      });

      setIsOpen(false);

      form.reset({
        link: '',
      });
    } catch (error) {
      console.error('Error submitting content:', error);

      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          'An error occurred while submitting your Reel. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);

        if (open) {
          form.reset({
            link: currentPostUrl || '',
          });
        }
      }}
    >
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentPostUrl
              ? 'Update Submitted Reel'
              : 'Submit Reel'}
          </DialogTitle>

          <DialogDescription>
            {currentPostUrl
              ? 'Enter the new Instagram Reel URL. The new Reel will be sent for verification again.'
              : 'Enter the URL of the Instagram Reel you created for this campaign.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram Reel Link</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="https://www.instagram.com/reel/..."
                      {...field}
                    />
                  </FormControl>

                  <FormDescription>
                    Paste the direct URL of the Reel you created for this campaign.
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />

            {currentPostUrl && (
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Changing the Reel will reset the submission status to{' '}
                  <span className="font-semibold text-foreground">
                    Pending
                  </span>{' '}
                  and the new Reel will be verified again.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading
                  ? 'Submitting...'
                  : currentPostUrl
                    ? 'Submit for Re-verification'
                    : 'Submit Reel'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
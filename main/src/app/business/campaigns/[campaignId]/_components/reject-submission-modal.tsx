
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useUser, useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { Submission, Campaign } from '@/lib/types';
import { Ban } from 'lucide-react';

const REJECTION_REASONS = [
    'Content does not meet the quality guidelines.',
    'Post does not align with the campaign brief or requirements.',
    'Required tags, mentions, or links are missing.',
    'The product is not featured correctly.',
    'Audio or visual elements are of poor quality.',
    'Other (please specify below)',
];

const formSchema = z.object({
  reason: z.string().min(1, 'Please select a reason for rejection.'),
  customReason: z.string().optional(),
}).refine((data) => {
    if (data.reason === 'Other (please specify below)') {
        return data.customReason && data.customReason.length >= 10;
    }
    return true;
}, {
    message: 'Custom reason must be at least 10 characters.',
    path: ['customReason'],
});

interface RejectSubmissionModalProps {
  submission: Submission;
  campaign: Campaign;
}

export function RejectSubmissionModal({
  submission,
  campaign,
}: RejectSubmissionModalProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: '',
      customReason: '',
    },
  });

  const selectedReason = form.watch('reason');
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    const finalReason = values.reason === 'Other (please specify below)' 
        ? values.customReason 
        : values.reason;

    if (!finalReason) {
         toast({
            variant: 'destructive',
            title: 'Invalid Reason',
            description: 'A reason for rejection is required.',
        });
        return;
    }


    // 1. Update submission status and reason
    const submissionRef = doc(firestore, 'submissions', submission.id);
    updateDocumentNonBlocking(submissionRef, { 
        status: 'rejected',
        rejectionReason: finalReason
    });

    // 2. Send a message to the creator's inbox
    const creatorInboxRef = collection(firestore, `users/${submission.creatorId}/collaborationRequests`);
    const formalMessageBody = `Dear ${submission.creatorName},

Thank you for your content submission for the "${campaign.name}" campaign. After careful review, we have determined that this submission does not meet the requirements for approval at this time.

Feedback: "${finalReason}"

We encourage you to review the campaign brief and this feedback. If the campaign is still active, you may have the opportunity to make adjustments and submit your content again.

Best regards,
The ${campaign.brandName || 'Campaign'} Team`;

    addDocumentNonBlocking(creatorInboxRef, {
        fromUserId: user.uid,
        fromUserName: campaign.brandName || 'A Business',
        toUserId: submission.creatorId,
        subject: `Update on your submission for "${campaign.name}"`,
        body: formalMessageBody,
        status: 'pending',
        createdAt: new Date(),
        campaignId: campaign.id,
    });


    toast({
      title: 'Submission Rejected',
      description: `The submission has been marked as rejected and the creator has been notified.`,
    });
    handleOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={submission.status !== 'pending'}>
                <Ban className="mr-2 h-4 w-4" />
                Reject
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
                Provide a reason for rejecting the submission from {submission.creatorName}. This feedback will be sent to them.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Reason for Rejection</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {REJECTION_REASONS.map((reason) => (
                            <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />

                {selectedReason === 'Other (please specify below)' && (
                    <FormField
                    control={form.control}
                    name="customReason"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Custom Reason</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder="Provide specific details for the rejection."
                            className="min-h-[100px]"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}

                <DialogFooter>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleOpenChange(false)}
                >
                    Cancel
                </Button>
                <Button type="submit">Confirm Rejection</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}

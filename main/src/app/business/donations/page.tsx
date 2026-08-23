'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Donation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, ExternalLink, Mail, Phone } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  under_review: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  verified: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  rejected: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
};

function formatDate(value: any) {
  if (!value) return '—';
  // Firestore Timestamp instances expose .toDate(); plain strings/Dates don't.
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function BusinessDonationsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const q = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'donations'), where('businessId', '==', user.uid))
        : null,
    [user, firestore]
  );

  const { data: donations, isLoading } = useCollection<Donation>(q);

  const updateStatus = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await updateDoc(doc(firestore, 'donations', id), {
        status,
        verifiedAt: status === 'verified' ? serverTimestamp() : null,
        verifiedBy: user?.uid || null,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: status === 'verified' ? 'Donation verified' : 'Donation rejected',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Could not update donation' });
    }
  };

  const pendingCount =
    donations?.filter((d) => d.status === 'submitted' || d.status === 'under_review').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">NGO Donations</h1>
        <p className="text-muted-foreground">
          Review donations submitted to your NGO campaigns and verify their payment proof.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{donations?.length || 0} Donations</CardTitle>
            <CardDescription>
              {pendingCount > 0
                ? `${pendingCount} awaiting your review`
                : 'All caught up — nothing pending review'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !donations?.length ? (
            <p className="text-muted-foreground">No donations yet.</p>
          ) : (
            <div className="space-y-4">
              {donations.map((d) => {
                const isPending = d.status === 'submitted' || d.status === 'under_review';
                const statusStyle = STATUS_STYLES[d.status] || '';

                return (
                  <div key={d.id} className="border rounded-lg p-4 space-y-4">
                    {/* Header: donor + amount + status */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold">{d.donorName}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {d.donorEmail}
                          </span>

                          {d.donorNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {d.donorNumber}
                            </span>
                          )}
                        </div>

                        {d.campaignName && (
                          <p className="text-sm text-muted-foreground">
                            Campaign: <span className="font-medium">{d.campaignName}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <strong className="text-lg">₹{Number(d.amount).toLocaleString('en-IN')}</strong>
                        <Badge variant="outline" className={statusStyle}>
                          {isPending && <Clock className="h-3 w-3 mr-1" />}
                          {d.status === 'verified' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {d.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                          {d.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {/* Transaction details */}
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-muted/30 rounded-md p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Method</p>
                        <p className="font-medium">{d.paymentMethod}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Payment Date</p>
                        <p className="font-medium">{formatDate(d.paymentDate)}</p>
                      </div>

                      <div className="sm:col-span-2 md:col-span-1">
                        <p className="text-xs text-muted-foreground">Transaction Reference</p>
                        <p className="font-mono text-xs break-all">{d.transactionReference || 'Not provided'}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Referred Creator</p>
                        <p className="font-medium">
                          {d.creatorName
                            ? `${d.creatorName}${d.creatorUsername ? ` (@${d.creatorUsername})` : ''}`
                            : 'Direct'}
                        </p>
                      </div>
                    </div>

                    {/* Payment proof */}
                    {d.paymentProofUrl && (
                      <a
                        href={d.paymentProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        View payment screenshot
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}

                    {/* Actions */}
                    {isPending ? (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="gap-1.5" onClick={() => updateStatus(d.id, 'verified')}>
                          <CheckCircle2 className="h-4 w-4" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5"
                          onClick={() => updateStatus(d.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {d.status === 'verified' ? 'Verified' : 'Rejected'} on {formatDate(d.verifiedAt || d.updatedAt)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

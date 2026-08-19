'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Donation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function BusinessDonationsPage() {
  const { user } = useUser(); const firestore = useFirestore(); const { toast } = useToast();
  const q = useMemoFirebase(() => user ? query(collection(firestore, 'donations'), where('businessId', '==', user.uid)) : null, [user, firestore]);
  const { data: donations, isLoading } = useCollection<Donation>(q);
  const updateStatus = async (id: string, status: 'verified' | 'rejected') => { try { await updateDoc(doc(firestore, 'donations', id), { status, verifiedAt: status === 'verified' ? serverTimestamp() : null, verifiedBy: user?.uid || null, updatedAt: serverTimestamp() }); toast({ title: status === 'verified' ? 'Donation verified' : 'Donation rejected' }); } catch { toast({ variant: 'destructive', title: 'Could not update donation' }); } };
  return <div className="space-y-6"><div><h1 className="text-3xl font-bold">NGO Donations</h1><p className="text-muted-foreground">Review donations submitted to your NGO campaigns.</p></div><Card><CardHeader><CardTitle>{donations?.length || 0} Donations</CardTitle></CardHeader><CardContent>{isLoading ? <p>Loading...</p> : !donations?.length ? <p className="text-muted-foreground">No donations yet.</p> : <div className="space-y-4">{donations.map(d => <div key={d.id} className="border rounded-lg p-4 space-y-3"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><p className="font-semibold">{d.donorName}</p><p className="text-sm text-muted-foreground">{d.donorEmail}</p></div><div className="flex items-center gap-2"><strong>₹{Number(d.amount).toLocaleString('en-IN')}</strong><Badge>{d.status}</Badge></div></div><div className="grid md:grid-cols-3 gap-2 text-sm"><span>Payment: {d.paymentMethod}</span><span>Reference: {d.transactionReference}</span><span>Creator: {d.creatorId || 'Direct'}</span></div>{d.status === 'submitted' || d.status === 'under_review' ? <div className="flex gap-2"><Button size="sm" onClick={() => updateStatus(d.id, 'verified')}>Verify</Button><Button size="sm" variant="destructive" onClick={() => updateStatus(d.id, 'rejected')}>Reject</Button></div> : null}</div>)}</div>}</CardContent></Card></div>;
}

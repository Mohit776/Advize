'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Campaign } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Copy, Heart, ExternalLink, CheckCircle2, User, Printer, Mail, ShieldCheck } from 'lucide-react';

export default function DonatePage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [submitted, setSubmitted] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [creatorUser, setCreatorUser] = useState<{ name: string; username?: string; logoUrl?: string } | null>(null);
  const [form, setForm] = useState({
    donorName: '',
    donorEmail: '',
    amount: '',
    paymentMethod: 'UPI',
    transactionReference: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentProofUrl: '',
  });

  const campaignRef = useMemoFirebase(
    () => (campaignId ? doc(firestore, 'campaigns', campaignId) : null),
    [campaignId, firestore]
  );
  const { data: campaign, isLoading } = useDoc<Campaign>(campaignRef);

  useEffect(() => {
    if (ref) localStorage.setItem(`advize_donation_ref_${campaignId}`, ref);
  }, [ref, campaignId]);

  const creatorRef = ref || (typeof window !== 'undefined' ? localStorage.getItem(`advize_donation_ref_${campaignId}`) : null);

  useEffect(() => {
    if (!creatorRef || !firestore) return;
    const cleanRef = creatorRef.trim().replace(/^@/, '');
    const loadCreator = async () => {
      try {
        const userDocRef = doc(firestore, 'users', cleanRef);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setCreatorUser({ name: data.name || 'Creator', username: data.username, logoUrl: data.logoUrl });
          return;
        }
        const q = query(collection(firestore, 'users'), where('username', '==', cleanRef));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const data = querySnap.docs[0].data();
          setCreatorUser({ name: data.name || 'Creator', username: data.username, logoUrl: data.logoUrl });
        }
      } catch (err) {
        console.error('Failed to load creator info', err);
      }
    };
    loadCreator();
  }, [creatorRef, firestore]);

  const payment = campaign?.ngoPaymentDetails;

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: 'Copied to clipboard' });
  };

  const setPresetAmount = (amt: number) => {
    setForm(prev => ({ ...prev, amount: String(amt) }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          creatorId: creatorRef || null,
          ...form,
          amount: Number(form.amount),
          currency: 'INR',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit donation');
      setReceiptData(data.receipt || {
        receiptNumber: data.donationId,
        campaignName: campaign?.name,
        ngoName: campaign?.brandName,
        donorName: form.donorName,
        donorEmail: form.donorEmail,
        amount: Number(form.amount),
        currency: 'INR',
        paymentMethod: form.paymentMethod,
        transactionReference: form.transactionReference,
        paymentDate: form.paymentDate,
        creatorName: creatorUser ? `${creatorUser.name}${creatorUser.username ? ` (@${creatorUser.username})` : ''}` : null,
      });
      setSubmitted(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Submission failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading donation page...</div>;
  }
  if (!campaign || campaign.type !== 'NGO Support') {
    return <div className="min-h-screen flex items-center justify-center">This donation campaign is unavailable.</div>;
  }
  if (campaign.status !== 'Active') {
    return <div className="min-h-screen flex items-center justify-center">This campaign is no longer accepting donations.</div>;
  }

  if (submitted && receiptData) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-green-500/30 shadow-lg">
            <CardHeader className="text-center pb-4 border-b bg-green-500/5">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <Badge className="mx-auto bg-green-600 hover:bg-green-700 text-white mb-1">Donation Submitted</Badge>
              <CardTitle className="text-2xl font-bold">Donation Receipt</CardTitle>
              <CardDescription>Receipt ID: <span className="font-mono text-foreground font-semibold">{receiptData.receiptNumber}</span></CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="bg-muted/40 p-4 rounded-lg space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">NGO Partner</span>
                  <span className="font-semibold text-right">{receiptData.ngoName || campaign.brandName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Campaign</span>
                  <span className="font-medium text-right">{receiptData.campaignName || campaign.name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Donor Name</span>
                  <span className="font-medium text-right">{receiptData.donorName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Donor Email</span>
                  <span className="font-medium text-right">{receiptData.donorEmail}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-bold text-lg text-primary text-right">₹{Number(receiptData.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium text-right">{receiptData.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Transaction Reference</span>
                  <span className="font-mono text-xs text-right break-all">{receiptData.transactionReference}</span>
                </div>
                {receiptData.creatorName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attributed Creator</span>
                    <span className="font-semibold text-primary text-right">{receiptData.creatorName}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-800 dark:text-blue-300">
                <Mail className="h-5 w-5 flex-shrink-0 text-blue-500" />
                <p>A copy of this donation receipt has been sent to <strong>{receiptData.donorEmail}</strong>.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={() => window.print()} variant="outline" className="flex-1 gap-2">
                  <Printer className="h-4 w-4" /> Print / Save Receipt
                </Button>
                <Button onClick={() => setSubmitted(false)} className="flex-1">
                  Make Another Donation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 md:py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Campaign Header Card */}
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-7">
            <div className="flex gap-4 items-center">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">NGO Support</Badge>
                <h1 className="text-2xl font-bold mt-1">{campaign.name}</h1>
                <p className="text-muted-foreground font-medium">{campaign.brandName}</p>
              </div>
            </div>
            {campaign.description && (
              <p className="mt-5 text-muted-foreground whitespace-pre-wrap leading-relaxed">{campaign.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Creator Referral Attribution Banner */}
        {creatorUser ? (
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20 shadow-xs">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-primary/30">
                <AvatarImage src={creatorUser.logoUrl} />
                <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Supporting via Creator</p>
                <p className="font-bold text-base">{creatorUser.name} {creatorUser.username ? <span className="font-normal text-muted-foreground text-sm">(@{creatorUser.username})</span> : null}</p>
              </div>
            </div>
            <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified Ambassador
            </Badge>
          </div>
        ) : null}

        {/* NGO Payment Methods Card */}
        <Card>
          <CardHeader>
            <CardTitle>Direct NGO Payment Details</CardTitle>
            <CardDescription>
              Pay directly to <strong>{campaign.brandName}</strong> using any of the methods below. Advize does not collect or hold donation funds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {payment?.upiId && (
              <div>
                <Label className="text-sm font-semibold">NGO UPI ID</Label>
                <div className="flex gap-2 mt-1">
                  <Input readOnly value={payment.upiId} className="font-mono text-base bg-muted/30" />
                  <Button type="button" variant="secondary" onClick={() => copy(payment.upiId!)} className="gap-2">
                    <Copy className="h-4 w-4" /> Copy
                  </Button>
                </div>
              </div>
            )}

            {payment?.upiPaymentLink && (
              <Button asChild className="w-full text-base py-6" size="lg">
                <a href={payment.upiPaymentLink} target="_blank" rel="noreferrer">
                  Pay via UPI App (GPay / PhonePe / Paytm) <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
            )}

            {payment?.qrCodeUrl && (
              <div className="text-center pt-2">
                <Label className="text-sm font-semibold">Scan QR Code to Pay</Label>
                <div className="mt-3 flex justify-center">
                  <img
                    src={payment.qrCodeUrl}
                    alt="NGO payment QR code"
                    className="w-60 h-60 object-contain rounded-xl border bg-white p-3 shadow-md"
                  />
                </div>
              </div>
            )}

            {(payment?.bankAccountName || payment?.bankAccountNumber || payment?.ifsc || payment?.bankName) && (
              <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                <Label className="text-sm font-semibold block border-b pb-2">Bank Transfer Details</Label>
                {[
                  ['Account Name', payment.bankAccountName],
                  ['Account Number', payment.bankAccountNumber],
                  ['IFSC Code', payment.ifsc],
                  ['Bank Name', payment.bankName],
                ].map(
                  ([label, value]) =>
                    value && (
                      <div key={label as string} className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium break-all">{value}</span>
                      </div>
                    )
                )}
              </div>
            )}

            {payment?.paymentInstructions && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-900 dark:text-amber-300">
                <p className="font-semibold mb-1">NGO Payment Instructions</p>
                <p className="whitespace-pre-wrap">{payment.paymentInstructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donation Attribution Form */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Donation Reference & Claim Receipt</CardTitle>
            <CardDescription>
              Fill out your details after completing the payment so we can attribute your donation and send your receipt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              {/* Prefilled Creator Field */}
              {creatorUser && (
                <div>
                  <Label>Referred Creator</Label>
                  <Input
                    readOnly
                    value={`${creatorUser.name}${creatorUser.username ? ` (@${creatorUser.username})` : ''}`}
                    className="bg-muted/50 font-medium text-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">This creator will receive attribution for inspiring your donation.</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="donorName">Your Name</Label>
                  <Input
                    id="donorName"
                    required
                    placeholder="Enter your full name"
                    value={form.donorName}
                    onChange={e => setForm({ ...form, donorName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="donorEmail">Email Address (for receipt)</Label>
                  <Input
                    id="donorEmail"
                    required
                    type="email"
                    placeholder="name@example.com"
                    value={form.donorEmail}
                    onChange={e => setForm({ ...form, donorEmail: e.target.value })}
                  />
                </div>
              </div>

              {/* Amount Input (User Entered) */}
              <div>
                <Label htmlFor="amount">Donation Amount (₹)</Label>
                <Input
                  id="amount"
                  required
                  min="1"
                  step="0.01"
                  type="number"
                  placeholder="Enter amount (e.g. 500)"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="text-lg font-semibold"
                />
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground font-medium">Quick select:</span>
                  {[100, 250, 500, 1000, 5000].map(amt => (
                    <Button
                      key={amt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5 rounded-full"
                      onClick={() => setPresetAmount(amt)}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <select
                    id="paymentMethod"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.paymentMethod}
                    onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="Payment Link">Direct Payment Link</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="transactionReference">Transaction / Reference ID (UPI Ref / UTR)</Label>
                  <Input
                    id="transactionReference"
                    required
                    placeholder="e.g. 123456789012"
                    value={form.transactionReference}
                    onChange={e => setForm({ ...form, transactionReference: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  required
                  type="date"
                  value={form.paymentDate}
                  onChange={e => setForm({ ...form, paymentDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="paymentProofUrl">Payment Screenshot / Proof URL (Optional)</Label>
                <Input
                  id="paymentProofUrl"
                  placeholder="https://..."
                  value={form.paymentProofUrl}
                  onChange={e => setForm({ ...form, paymentProofUrl: e.target.value })}
                />
              </div>

              <Button disabled={loading} type="submit" size="lg" className="w-full text-base font-semibold">
                {loading ? 'Submitting & Generating Receipt...' : 'Submit & Receive Receipt'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By submitting, you confirm that you paid directly to the NGO. Advize attributes your donation to the creator and emails your donation receipt.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

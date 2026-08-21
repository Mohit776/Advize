'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  doc,
  getDoc,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { useUser, useFirestore, useStorage, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import type { Campaign } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  Copy,
  Heart,
  ExternalLink,
  CheckCircle2,
  User,
  Printer,
  Mail,
  ShieldCheck,
} from 'lucide-react';

export default function DonatePage() {
  // The route segment is a combined "{campaignId}_{creatorUid}" link
  // (see /app/donate/[linkId]/page.tsx), not a bare campaign id. Both
  // halves are real Firestore/Auth document ids, generated server-side
  // when the creator's share link was built — never a freeform string
  // typed into a query param — so resolving them here always points at
  // real documents and the donation can be saved against the actual
  // creator uid with no drift risk.
  const { linkId } = useParams<{ linkId: string }>();

  const [campaignId, creatorId] = useMemo(() => {
    if (!linkId) return ['', ''] as const;
    const separatorIndex = linkId.indexOf('_');
    if (separatorIndex === -1) return [linkId, ''] as const;
    return [
      linkId.slice(0, separatorIndex),
      linkId.slice(separatorIndex + 1),
    ] as const;
  }, [linkId]);

  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const [submitted, setSubmitted] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const [creatorUser, setCreatorUser] = useState<{
    name: string;
    username?: string;
    logoUrl?: string;
  } | null>(null);
  const storage = useStorage();

  const [form, setForm] = useState({
    donorName: '',
    donorEmail: '',
    donorNumber: '',
    amount: '',
    paymentMethod: 'UPI',
    transactionReference: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentProofUrl: '',
  });

  /*
   * Handle the actual File once selected, upload it to Storage,
   * then store the resulting download URL on form state.
   */
  const handlePaymentProofChange = async (file: File) => {
    if (!storage) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Could not connect to storage. Please refresh and try again.',
      });
      return;
    }

    setPaymentProofFile(file);

    try {
      setUploadingProof(true);
      const safeName = file.name.replace(/\s+/g, '-');
      // Keyed by the referred creator's real uid (falling back to the
      // campaign) rather than the donor's uid, since most donors won't
      // be signed in.
      const ownerKey = creatorId || campaignId;
      const imageRef = storageRef(
        storage,
        `donation-proofs/${ownerKey}/${Date.now()}-${safeName}`
      );
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setForm(prev => ({
        ...prev,
        paymentProofUrl: downloadURL,
      }));

      toast({
        title: 'Payment Proof Uploaded',
        description: 'Your payment screenshot was uploaded successfully.',
      });
    } catch (error) {
      console.error('Error uploading payment proof image:', error);
      setPaymentProofFile(null);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Could not upload payment proof image. Please try again.',
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const campaignRef = useMemoFirebase(
    () =>
      campaignId
        ? doc(firestore, 'campaigns', campaignId)
        : null,
    [campaignId, firestore]
  );

  const {
    data: campaign,
    isLoading,
  } = useDoc<Campaign>(campaignRef);

  /*
   * Load creator information directly by uid — creatorId is the real
   * Firebase Auth uid encoded in the link, so a single doc lookup is
   * sufficient. No username fallback, no localStorage persistence, no
   * ambiguity: this uid is what gets saved on the donation record too.
   */
  useEffect(() => {
    if (!creatorId || !firestore) {
      setCreatorUser(null);
      return;
    }

    let cancelled = false;

    const loadCreator = async () => {
      try {
        const userDocRef = doc(firestore, 'users', creatorId);
        const userDocSnap = await getDoc(userDocRef);

        if (cancelled) return;

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();

          setCreatorUser({
            name: data.name || 'Creator',
            username: data.username,
            logoUrl: data.logoUrl,
          });
        } else {
          setCreatorUser(null);
        }
      } catch (err) {
        console.error('Failed to load creator info', err);
        if (!cancelled) setCreatorUser(null);
      }
    };

    loadCreator();

    return () => {
      cancelled = true;
    };
  }, [creatorId, firestore]);

  const payment = campaign?.ngoPaymentDetails;

  /*
   * NGO profile image is already denormalized onto
   * campaign.brandLogo.
   */
  const ngoBackgroundUrl =
    campaign?.brandLogo || null;

  const pageBackgroundStyle = ngoBackgroundUrl
    ? {
      backgroundImage: `linear-gradient(rgba(15, 15, 15, 0.72), rgba(15, 15, 15, 0.72)), url(${ngoBackgroundUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
    }
    : undefined;

  /*
   * Copy text to clipboard.
   */
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);

    toast({
      title: 'Copied to clipboard',
    });
  };

  /*
   * Quick amount buttons.
   */
  const setPresetAmount = (amt: number) => {
    setForm(prev => ({
      ...prev,
      amount: String(amt),
    }));
  };

  /*
   * Submit donation.
   */
  const submit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    /*
     * Validate mobile number.
     */
    if (!/^[0-9]{10}$/.test(form.donorNumber)) {
      toast({
        variant: 'destructive',
        title: 'Invalid mobile number',
        description:
          'Please enter a valid 10-digit mobile number.',
      });

      return;
    }

    /*
     * Validate amount.
     */
    const amount = Number(form.amount);

    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid donation amount',
        description:
          'Please enter a valid donation amount greater than ₹0.',
      });

      return;
    }

    /*
     * Require either transaction reference
     * OR payment proof URL.
     */
    const hasReference =
      form.transactionReference.trim().length > 0;

    const hasProof =
      form.paymentProofUrl.trim().length > 0;

    if (!hasReference && !hasProof) {
      toast({
        variant: 'destructive',
        title: 'Proof of payment required',
        description:
          'Please provide either a Transaction/Reference ID or a Payment Screenshot URL so we can verify your donation.',
      });

      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          creatorId: creatorId || null,
          ...form,
          amount,
          currency: 'INR',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || 'Could not submit donation'
        );
      }

      setReceiptData(
        data.receipt || {
          receiptNumber: data.donationId,
          campaignName: campaign?.name,
          ngoName: campaign?.brandName,
          donorName: form.donorName,
          donorNumber: form.donorNumber,
          donorEmail: form.donorEmail,
          amount,
          currency: 'INR',
          paymentMethod: form.paymentMethod,
          transactionReference:
            form.transactionReference,
          paymentDate: form.paymentDate,
          creatorName: creatorUser
            ? `${creatorUser.name}${creatorUser.username
              ? ` (@${creatorUser.username})`
              : ''
            }`
            : null,
        }
      );

      setSubmitted(true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description:
          err.message ||
          'Something went wrong while submitting your donation.',
      });
    } finally {
      setLoading(false);
    }
  };

  /*
   * Loading state.
   */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading donation page...
      </div>
    );
  }

  /*
   * Malformed link — couldn't parse a creator id out of the segment.
   */
  if (!campaignId || !creatorId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        This donation link is invalid or incomplete.
      </div>
    );
  }

  /*
   * Invalid campaign.
   */
  if (
    !campaign ||
    campaign.type !== 'NGO Support'
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        This donation campaign is unavailable.
      </div>
    );
  }

  /*
   * Inactive campaign.
   */
  if (campaign.status !== 'Active') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        This campaign is no longer accepting donations.
      </div>
    );
  }

  /*
   * Donation receipt.
   */
  if (submitted && receiptData) {
    return (
      <main
        className="min-h-screen bg-muted/30 px-4 py-8 md:py-12"
        style={pageBackgroundStyle}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-green-500/30 shadow-lg">
            <CardHeader className="text-center pb-4 border-b bg-green-500/5">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>

              <Badge className="mx-auto bg-green-600 hover:bg-green-700 text-white mb-1">
                Donation Submitted
              </Badge>

              <CardTitle className="text-2xl font-bold">
                Donation Receipt
              </CardTitle>

              <CardDescription>
                Receipt ID:{' '}
                <span className="font-mono text-foreground font-semibold">
                  {receiptData.receiptNumber}
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <div className="bg-muted/40 p-4 rounded-lg space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    NGO Partner
                  </span>
                  <span className="font-semibold text-right">
                    {receiptData.ngoName ||
                      campaign.brandName}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Campaign
                  </span>
                  <span className="font-medium text-right">
                    {receiptData.campaignName ||
                      campaign.name}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Donor Name
                  </span>
                  <span className="font-medium text-right">
                    {receiptData.donorName}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Mobile Number
                  </span>
                  <span className="font-medium text-right">
                    {receiptData.donorNumber}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Donor Email
                  </span>
                  <span className="font-medium text-right">
                    {receiptData.donorEmail}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Amount Paid
                  </span>
                  <span className="font-bold text-lg text-primary text-right">
                    ₹
                    {Number(
                      receiptData.amount
                    ).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Payment Method
                  </span>
                  <span className="font-medium text-right">
                    {receiptData.paymentMethod}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Transaction Reference
                  </span>
                  <span className="font-mono text-xs text-right break-all">
                    {receiptData.transactionReference ||
                      'Not provided'}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Payment Date
                  </span>
                  <span className="font-medium text-right">
                    {receiptData.paymentDate}
                  </span>
                </div>

                {receiptData.creatorName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Attributed Creator
                    </span>

                    <span className="font-semibold text-primary text-right">
                      {receiptData.creatorName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-800 dark:text-blue-300">
                <Mail className="h-5 w-5 flex-shrink-0 text-blue-500" />

                <p>
                  A copy of this donation receipt has
                  been sent to{' '}
                  <strong>
                    {receiptData.donorEmail}
                  </strong>
                  .
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print / Save Receipt
                </Button>

                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setReceiptData(null);
                    setPaymentProofFile(null);
                    setForm({
                      donorName: '',
                      donorEmail: '',
                      donorNumber: '',
                      amount: '',
                      paymentMethod: 'UPI',
                      transactionReference: '',
                      paymentDate:
                        new Date()
                          .toISOString()
                          .slice(0, 10),
                      paymentProofUrl: '',
                    });
                  }}
                  className="flex-1"
                >
                  Make Another Donation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  /*
   * Donation page.
   */
  return (
    <main
      className="min-h-screen bg-muted/30 px-4 py-6 md:py-10"
      style={pageBackgroundStyle}
    >
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Campaign Header Card */}
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="pt-7">
            <div className="flex gap-4 items-center">
              {ngoBackgroundUrl ? (
                <img
                  src={ngoBackgroundUrl}
                  alt={
                    campaign.brandName
                      ? `${campaign.brandName} logo`
                      : 'NGO logo'
                  }
                  className="h-16 w-16 rounded-xl object-cover border flex-shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
              )}

              <div>
                <Badge
                  variant="outline"
                  className="bg-primary/5 text-primary border-primary/20"
                >
                  NGO Support
                </Badge>

                <h1 className="text-2xl font-bold mt-1">
                  {campaign.name}
                </h1>

                <p className="text-muted-foreground font-medium">
                  {campaign.brandName}
                </p>
              </div>
            </div>

            {campaign.description && (
              <p className="mt-5 text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {campaign.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Creator Referral Attribution Banner */}
        {creatorUser && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20 shadow-xs">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-primary/30">
                <AvatarImage src={creatorUser.logoUrl} />

                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>

              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Supporting via Creator
                </p>

                <p className="font-bold text-base">
                  {creatorUser.name}{' '}
                  {creatorUser.username ? (
                    <span className="font-normal text-muted-foreground text-sm">
                      (@{creatorUser.username})
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Ambassador
            </Badge>
          </div>
        )}

        {/* NGO Payment Methods Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              Direct NGO Payment Details
            </CardTitle>

            <CardDescription>
              Pay directly to{' '}
              <strong>{campaign.brandName}</strong>{' '}
              using any of the methods below. Advize does
              not collect or hold donation funds.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* UPI ID */}
            {payment?.upiId && (
              <div>
                <Label className="text-sm font-semibold">
                  NGO UPI ID
                </Label>

                <div className="flex gap-2 mt-1">
                  <Input
                    readOnly
                    value={payment.upiId}
                    className="font-mono text-base bg-muted/30"
                  />

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      copy(payment.upiId!)
                    }
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
            )}

            {/* UPI Payment Link */}
            {payment?.upiPaymentLink && (
              <Button
                asChild
                className="w-full text-base py-6"
                size="lg"
              >
                <a
                  href={payment.upiPaymentLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pay via UPI App (GPay / PhonePe / Paytm)
                  <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
            )}

            {/* QR Code */}
            {payment?.qrCodeUrl && (
              <div className="text-center pt-2">
                <Label className="text-sm font-semibold">
                  Scan QR Code to Pay
                </Label>

                <div className="mt-3 flex justify-center">
                  <img
                    src={payment.qrCodeUrl}
                    alt="NGO payment QR code"
                    className="w-60 h-60 object-contain rounded-xl border bg-white p-3 shadow-md"
                  />
                </div>
              </div>
            )}

            {/* Bank Details */}
            {(
              payment?.bankAccountName ||
              payment?.bankAccountNumber ||
              payment?.ifsc ||
              payment?.bankName
            ) && (
                <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                  <Label className="text-sm font-semibold block border-b pb-2">
                    Bank Transfer Details
                  </Label>

                  {[
                    [
                      'Account Name',
                      payment.bankAccountName,
                    ],
                    [
                      'Account Number',
                      payment.bankAccountNumber,
                    ],
                    ['IFSC Code', payment.ifsc],
                    ['Bank Name', payment.bankName],
                  ].map(
                    ([label, value]) =>
                      value && (
                        <div
                          key={label as string}
                          className="flex justify-between gap-4 text-sm"
                        >
                          <span className="text-muted-foreground">
                            {label}
                          </span>

                          <span className="font-mono font-medium break-all">
                            {value}
                          </span>
                        </div>
                      )
                  )}
                </div>
              )}

            {/* Payment Instructions */}
            {payment?.paymentInstructions && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-900 dark:text-amber-300">
                <p className="font-semibold mb-1">
                  NGO Payment Instructions
                </p>

                <p className="whitespace-pre-wrap">
                  {payment.paymentInstructions}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donation Attribution Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              Submit Donation Reference & Claim Receipt
            </CardTitle>

            <CardDescription>
              Complete the payment directly to the NGO,
              then fill out your details below so we can
              attribute your donation and send your receipt.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={submit}
              className="space-y-5"
            >

              {/* Creator */}
              {creatorUser && (
                <div>
                  <Label>Referred Creator</Label>

                  <Input
                    readOnly
                    value={`${creatorUser.name}${creatorUser.username
                      ? ` (@${creatorUser.username})`
                      : ''
                      }`}
                    className="bg-muted/50 font-medium text-foreground cursor-not-allowed"
                  />

                  <p className="text-xs text-muted-foreground mt-1">
                    This creator will receive attribution
                    for inspiring your donation.
                  </p>
                </div>
              )}

              {/* Donor Details */}
              <div className="grid md:grid-cols-3 gap-4">

                {/* Name */}
                <div>
                  <Label htmlFor="donorName">
                    Your Name
                  </Label>

                  <Input
                    id="donorName"
                    required
                    placeholder="Enter your full name"
                    value={form.donorName}
                    onChange={e =>
                      setForm({
                        ...form,
                        donorName: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="donorEmail">
                    Email Address (for receipt)
                  </Label>

                  <Input
                    id="donorEmail"
                    required
                    type="email"
                    placeholder="name@example.com"
                    value={form.donorEmail}
                    onChange={e =>
                      setForm({
                        ...form,
                        donorEmail: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <Label htmlFor="donorNumber">
                    Mobile Number
                  </Label>

                  <Input
                    id="donorNumber"
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={form.donorNumber}
                    onChange={e => {
                      const value =
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 10);

                      setForm({
                        ...form,
                        donorNumber: value,
                      });
                    }}
                  />

                  <p className="text-xs text-muted-foreground mt-1">
                    Required for receipt and donation
                    verification.
                  </p>
                </div>
              </div>

              {/* Donation Amount */}
              <div>
                <Label htmlFor="amount">
                  Donation Amount (₹)
                </Label>

                <Input
                  id="amount"
                  required
                  min="1"
                  step="0.01"
                  type="number"
                  placeholder="Enter amount (e.g. 500)"
                  value={form.amount}
                  onChange={e =>
                    setForm({
                      ...form,
                      amount: e.target.value,
                    })
                  }
                  className="text-lg font-semibold"
                />

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    Quick select:
                  </span>

                  {[100, 250, 500, 1000, 5000].map(
                    amt => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5 rounded-full"
                        onClick={() =>
                          setPresetAmount(amt)
                        }
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </Button>
                    )
                  )}
                </div>
              </div>

              {/* Proof Requirement */}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Please provide at least one:
                  <strong> Transaction / Reference ID</strong>{' '}
                  or a <strong>Payment Screenshot / Proof URL</strong>.
                </p>
              </div>

              {/* Payment Method + Transaction ID */}
              <div className="grid md:grid-cols-2 gap-4">

                {/* Payment Method */}
                <div>
                  <Label htmlFor="paymentMethod">
                    Payment Method
                  </Label>

                  <select
                    id="paymentMethod"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.paymentMethod}
                    onChange={e =>
                      setForm({
                        ...form,
                        paymentMethod: e.target.value,
                      })
                    }
                  >
                    <option value="UPI">
                      UPI (GPay / PhonePe / Paytm)
                    </option>

                    <option value="Bank Transfer">
                      Bank Transfer (NEFT/RTGS/IMPS)
                    </option>

                    <option value="Payment Link">
                      Direct Payment Link
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                {/* Transaction Reference */}
                <div>
                  <Label htmlFor="transactionReference">
                    Transaction / Reference ID
                  </Label>

                  <Input
                    id="transactionReference"
                    placeholder="e.g. 123456789012"
                    value={form.transactionReference}
                    onChange={e =>
                      setForm({
                        ...form,
                        transactionReference:
                          e.target.value,
                      })
                    }
                  />

                  <div className="rounded-md bg-muted/50 border p-3 mt-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">
                        What is this?
                      </strong>{' '}
                      It is the unique number generated
                      by your UPI app or bank after you
                      complete the payment.
                    </p>

                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      Open the completed payment in
                      GPay, PhonePe, Paytm, or your bank
                      app and look for{' '}
                      <strong>
                        Transaction ID, UPI Reference ID,
                        Reference Number, or UTR
                      </strong>
                      . It is usually a 12-digit number.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <Label htmlFor="paymentDate">
                  Payment Date
                </Label>

                <Input
                  id="paymentDate"
                  required
                  type="date"
                  value={form.paymentDate}
                  onChange={e =>
                    setForm({
                      ...form,
                      paymentDate: e.target.value,
                    })
                  }
                />
              </div>

              {/* Payment Proof */}
              <div>
                <Label htmlFor="paymentProof">
                  Payment Screenshot / Proof
                </Label>

                <Input
                  id="paymentProof"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  disabled={uploadingProof}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handlePaymentProofChange(file);
                    }
                  }}
                  className="cursor-pointer"
                />

                <p className="text-xs text-muted-foreground mt-1.5">
                  Upload a screenshot of your completed payment from
                  GPay, PhonePe, Paytm, or your bank app.
                </p>

                {uploadingProof && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Uploading...
                  </div>
                )}

                {!uploadingProof && paymentProofFile && form.paymentProofUrl && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ {paymentProofFile.name}
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                disabled={loading || uploadingProof}
                type="submit"
                size="lg"
                className="w-full text-base font-semibold"
              >
                {loading
                  ? 'Submitting & Generating Receipt...'
                  : 'Submit & Receive Receipt'}
              </Button>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center">
                By submitting, you confirm that you paid
                directly to the NGO. Advize attributes your
                donation to the creator and emails your
                donation receipt.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

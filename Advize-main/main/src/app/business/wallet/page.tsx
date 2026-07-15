
'use client';
import {
  Wallet,
  Landmark,
  CheckCircle,
  Clock,
  ArrowLeft,
  CreditCard,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, serverTimestamp } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function BusinessWalletPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [amount, setAmount] = useState('5000');
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);

  const transactionsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'transactions'), where('userId', '==', user.uid)) : null,
    [user, firestore]
  );
  const { data: transactions, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const balanceData = useMemo(() => {
    const totalDeposits = transactions
      ?.filter(t => t.type === 'deposit' && t.status === 'completed')
      .reduce((acc, t) => acc + t.amount, 0) || 0;
    
    const totalSpend = transactions
      ?.filter(t => t.type === 'spend' && t.status === 'completed')
      .reduce((acc, t) => acc + t.amount, 0) || 0;
    
    return {
      totalDeposits,
      totalSpend,
      available: totalDeposits - totalSpend,
    };
  }, [transactions]);

  const isLoading = isUserLoading || transactionsLoading;
  
  const handleAddFundsClick = () => {
    const fundAmount = parseInt(amount, 10);
     if (isNaN(fundAmount) || fundAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to add.',
      });
      return;
    }
    setConfirmationOpen(true);
  }

  const handleConfirmAddFunds = async () => {
    const fundAmount = parseInt(amount, 10);
    if (!user || !firestore) return;

    setConfirmationOpen(false);
    setIsAddingFunds(true);

    const transactionData = {
        userId: user.uid,
        type: 'deposit' as const,
        amount: fundAmount,
        status: 'completed' as const,
        date: serverTimestamp(),
        details: `Added funds via ${selectedMethod}`
    }
    
    const transactionsColRef = collection(firestore, 'transactions');
    await addDocumentNonBlocking(transactionsColRef, transactionData);

    toast({
        title: "Funds Added!",
        description: `₹${fundAmount.toLocaleString()} has been added to your wallet.`
    });
    
    setAmount('5000');
    setIsAddingFunds(false);
  }

  return (
    <>
      <div className="w-full mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
              <Link href="/business/profile">
                  <ArrowLeft className="h-4 w-4" />
              </Link>
          </Button>
          <div>
              <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
                  <Wallet className="w-8 h-8 text-primary" />
                  Business Wallet
              </h1>
              <p className="text-muted-foreground mt-1">
                  Manage your account balance and view transaction history.
              </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              <Card>
                  <CardHeader>
                      <CardTitle>Add Funds</CardTitle>
                      <CardDescription>Top up your account balance to fund campaigns.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="space-y-2">
                          <Label htmlFor="amount">Amount to Add (₹)</Label>
                          <Input
                              id="amount"
                              type="number"
                              placeholder="e.g., 5000"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="text-lg"
                          />
                          <div className="flex gap-2 pt-2">
                              {[1000, 5000, 10000, 25000].map(val => (
                                  <Button key={val} variant="outline" size="sm" onClick={() => setAmount(String(val))}>₹{val.toLocaleString()}</Button>
                              ))}
                          </div>
                      </div>
                      <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="upi">
                                  <Image src="/upi-icon.svg" alt="UPI" width={40} height={16} data-ai-hint="payment method" />
                              </TabsTrigger>
                              <TabsTrigger value="card">
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Card
                              </TabsTrigger>
                              <TabsTrigger value="netbanking">
                                  <Landmark className="h-4 w-4 mr-2" />
                                  Net Banking
                              </TabsTrigger>
                          </TabsList>
                          <TabsContent value="upi">
                              <div className="p-4 text-center border rounded-md mt-4">
                                  <p className="text-sm text-muted-foreground">You will be redirected to your UPI app to complete the payment.</p>
                              </div>
                          </TabsContent>
                          <TabsContent value="card">
                            <div className="p-4 text-center border rounded-md mt-4">
                                  <p className="text-sm text-muted-foreground">Enter card details on the next screen to complete the payment.</p>
                              </div>
                          </TabsContent>
                          <TabsContent value="netbanking">
                            <div className="p-4 text-center border rounded-md mt-4">
                                  <p className="text-sm text-muted-foreground">You will be redirected to your bank's website to complete the payment.</p>
                              </div>
                          </TabsContent>
                      </Tabs>
                        <Button onClick={handleAddFundsClick} disabled={isAddingFunds} className="w-full" size="lg">
                          {isAddingFunds ? 'Processing...' : `Add ₹${parseInt(amount || '0', 10).toLocaleString()} to Wallet`}
                      </Button>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                      {isLoading ? (
                          <div className="space-y-4">
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                          </div>
                      ) : transactions && transactions.length > 0 ? (
                          <div className="space-y-3">
                              {transactions.map(tx => (
                                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                      <div>
                                          <p className="font-semibold capitalize">{tx.details || tx.type}</p>
                                          <p className="text-sm text-muted-foreground">{new Date(tx.date.seconds * 1000).toLocaleString()}</p>
                                      </div>
                                      <div className="text-right">
                                          <p className={cn("font-bold", tx.type === 'deposit' ? 'text-green-500' : 'text-red-500')}>
                                              {tx.type === 'deposit' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                          </p>
                                          <p className="text-xs text-muted-foreground capitalize">{tx.status}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-muted-foreground text-center py-4">No transactions yet.</p>
                      )}
                  </CardContent>
              </Card>
          </div>

          <div className="lg:col-span-1 space-y-8">
              <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20 sticky top-24">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                  <Wallet className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">
                    {isLoading ? <Skeleton className="h-10 w-32" /> : `₹${balanceData.available.toLocaleString('en-IN')}`}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This balance will be used for campaign budgets and payouts.
                  </p>
                </CardContent>
              </Card>
          </div>
        </div>
      </div>
      <AlertDialog open={isConfirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to add ₹{parseInt(amount || '0', 10).toLocaleString()} to your wallet. This will simulate a transaction using Razorpay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='py-4'>
            <Image src="/razorpay-logo.svg" alt="Razorpay" width={120} height={30} className="mx-auto" data-ai-hint="company logo"/>
            <p className='text-center text-sm text-muted-foreground mt-2'>Proceed to our secure payment gateway.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAddFunds}>Proceed to Pay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


'use client';
import {
  Wallet,
  CheckCircle,
  Clock,
  Landmark,
  MessageSquareWarning,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WithdrawModal } from './_components/withdraw-modal';
import { TransactionTable } from './_components/transaction-table';
import { WalletAnalytics } from './_components/wallet-analytics';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Earning, Transaction } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const savedMethods = [
  {
    type: 'UPI',
    details: 'aisha.sharma@okicici',
    isDefault: true,
  },
  {
    type: 'Bank Account',
    details: 'HDFC Bank, A/C **** 1234',
    isDefault: false,
  },
];

function AddPaymentMethodModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleAddMethod = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would securely send data to Razorpay's API
    // to create a fund account. For now, we just simulate success.
    toast({
      title: "Payment Method Added",
      description: "Your new payment method has been securely saved.",
    });
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-4">
          <Plus className="mr-2 h-4 w-4" /> Add New Method
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a New Payment Method</DialogTitle>
          <DialogDescription>
            This information is sent securely to our payment processor and never stored on our servers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddMethod}>
           <Tabs defaultValue="bank" className="w-full pt-4">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bank">Bank Account</TabsTrigger>
                <TabsTrigger value="upi">UPI ID</TabsTrigger>
            </TabsList>
            <TabsContent value="bank" className="space-y-4 pt-4">
                 <div className="space-y-2">
                    <Label htmlFor="account-holder">Account Holder Name</Label>
                    <Input id="account-holder" placeholder="e.g., Aisha Sharma" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input id="account-number" placeholder="Enter your bank account number" required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="ifsc">IFSC Code</Label>
                    <Input id="ifsc" placeholder="e.g., HDFC0001234" required />
                </div>
            </TabsContent>
            <TabsContent value="upi" className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI ID</Label>
                    <Input id="upi-id" placeholder="yourname@bank" required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="upi-name">Beneficiary Name</Label>
                    <Input id="upi-name" placeholder="e.g., Aisha Sharma" required />
                </div>
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Payment Method</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function WalletPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Fetch all payout transactions for the user
  const payoutsQuery = useMemoFirebase(
    () => user ? query(
        collection(firestore, 'transactions'),
        where('userId', '==', user.uid),
        where('type', '==', 'payout'),
        orderBy('date', 'desc')
    ) : null,
    [user, firestore]
  );
  const { data: payouts, isLoading: payoutsLoading } = useCollection<Transaction>(payoutsQuery);
  
  // Fetch all withdrawal transactions for the user
  const withdrawalsQuery = useMemoFirebase(
    () => user ? query(
        collection(firestore, 'transactions'),
        where('userId', '==', user.uid),
        where('type', '==', 'withdrawal'),
        orderBy('date', 'desc')
    ) : null,
    [user, firestore]
  );
  const { data: withdrawals, isLoading: withdrawalsLoading } = useCollection<Transaction>(withdrawalsQuery);
  
  const allTransactions = useMemo(() => {
    const combined = [...(payouts || []), ...(withdrawals || [])];
    return combined.sort((a, b) => b.date.seconds - a.date.seconds);
  }, [payouts, withdrawals]);


  const balanceData = useMemo(() => {
    const totalEarnings = payouts?.reduce((acc, t) => acc + t.amount, 0) || 0;
    
    const totalWithdrawals = withdrawals
      ?.filter(t => t.status === 'completed')
      .reduce((acc, t) => acc + t.amount, 0) || 0;
    
    // For now, pending amount is 0 as we don't have a status on earnings
    const pending = 0; 
    
    return {
      totalEarnings,
      totalWithdrawals,
      available: totalEarnings - totalWithdrawals,
      pending,
    };
  }, [payouts, withdrawals]);

  const isLoading = isUserLoading || payoutsLoading || withdrawalsLoading;

  return (
    <div className="w-full mx-auto space-y-8">
      {/* Header Section */}
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold font-headline flex items-center justify-center md:justify-start gap-3">
          <Wallet className="w-8 h-8 text-primary" />
          Wallet
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto md:mx-0">
          Track your total earnings, completed checkouts, and withdraw your remaining balance instantly.
        </p>
      </div>

      {/* Balance Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <Card className="bg-gradient-to-tr from-green-500/10 to-transparent border-green-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <span className="text-green-400">₹</span>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">
                  ₹{balanceData.totalEarnings.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">
                  All verified earnings from campaigns
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-tr from-blue-500/10 to-transparent border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
                <ArrowUpRight className="h-5 w-5 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400">
                  ₹{balanceData.totalWithdrawals.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Amount successfully sent to your bank
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-tr from-primary/10 to-transparent border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <Wallet className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  ₹{balanceData.available.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready for instant withdrawal
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-tr from-yellow-500/10 to-transparent border-yellow-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
                <Clock className="h-5 w-5 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-400">
                  ₹{balanceData.pending.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting campaign verification
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Checkout Section */}
          <Card>
            <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Checkout</CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">Withdraw your available balance to your linked account.</p>
              </div>
               <WithdrawModal availableBalance={balanceData.available}>
                 <Button disabled={isLoading || balanceData.available <= 0} className="w-full sm:w-auto">Withdraw Now</Button>
              </WithdrawModal>
            </CardHeader>
          </Card>
          
          {/* Transaction History */}
          <TransactionTable transactions={allTransactions} isLoading={isLoading} />
        </div>

        <div className="lg:col-span-1 space-y-8">
            {/* Analytics */}
            <WalletAnalytics earnings={null} transactions={allTransactions} isLoading={isLoading} />
            {/* Payment Methods */}
             <Card>
                <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {savedMethods.map((method, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-4">
                                {method.type === 'UPI' ? <span className='text-muted-foreground'>₹</span> : <Landmark className="h-5 w-5 text-muted-foreground" />}
                                <div>
                                    <p className="font-semibold">{method.type}</p>
                                    <p className="text-sm text-muted-foreground">{method.details}</p>
                                </div>
                            </div>
                             {method.isDefault && <CheckCircle className="h-5 w-5 text-green-500" />}
                        </div>
                    ))}
                    <AddPaymentMethodModal />
                </CardContent>
             </Card>

             {/* Help & Support */}
             <Card className="bg-accent/10 border-accent/20">
                <CardHeader className="flex-row items-center gap-4">
                     <MessageSquareWarning className="h-8 w-8 text-accent" />
                     <CardTitle className="text-accent">Need Help?</CardTitle>
                </CardHeader>
                 <CardContent>
                     <p className="text-muted-foreground text-sm">
                         Contact our support team at <a href="mailto:support@advizor.in" className="text-accent hover:underline">support@advizeor.in</a> or raise a ticket directly.
                     </p>
                 </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}

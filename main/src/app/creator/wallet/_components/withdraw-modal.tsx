'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WithdrawModalProps {
  availableBalance: number;
  children: React.ReactNode;
}

export function WithdrawModal({
  availableBalance,
  children,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to withdraw.',
      });
      return;
    }
    if (withdrawAmount > availableBalance) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Balance',
        description: 'Withdrawal amount cannot exceed your available balance.',
      });
      return;
    }
    // Placeholder for API call
    console.log(`Withdrawing ${withdrawAmount}`);
    setIsSuccess(true);
  };
  
  const resetAndClose = () => {
    setIsOpen(false);
    // Delay reset to allow closing animation
    setTimeout(() => {
        setIsSuccess(false);
        setAmount('');
    }, 300);
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {!isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Withdraw Funds</DialogTitle>
              <DialogDescription>
                Transfer your available balance to your preferred account.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold text-primary">₹{availableBalance.toLocaleString('en-IN')}</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount to Withdraw</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">₹</span>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="e.g., 5000"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
              <Tabs defaultValue="upi" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upi">UPI</TabsTrigger>
                  <TabsTrigger value="paytm">Paytm</TabsTrigger>
                  <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
                </TabsList>
                <TabsContent value="upi">
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="upi-id">UPI ID</Label>
                    <Input
                      id="upi-id"
                      placeholder="yourname@bank"
                      defaultValue="aisha.sharma@okicici"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="paytm">
                    <div className="space-y-2 mt-4">
                        <Label htmlFor="paytm-num">Paytm Number</Label>
                        <Input id="paytm-num" placeholder="9876543210" />
                    </div>
                </TabsContent>
                <TabsContent value="bank">
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="bank-acc">Bank Account</Label>
                    <Input
                      id="bank-acc"
                      placeholder="Account Number"
                      defaultValue="HDFC Bank, A/C **** 1234"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">Use saved payment methods to manage bank accounts.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={resetAndClose}>Cancel</Button>
              <Button type="button" onClick={handleWithdraw}>
                Confirm Withdrawal
              </Button>
            </DialogFooter>
          </>
        ) : (
            <>
            <DialogHeader>
                <DialogTitle>Withdrawal Success</DialogTitle>
                <DialogDescription className="sr-only">Your withdrawal has been processed successfully.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h3 className="text-xl font-bold">Withdrawal Successful!</h3>
                <p className="text-muted-foreground">
                    ₹{parseFloat(amount).toLocaleString('en-IN')} has been successfully transferred. It should reflect in your account shortly.
                </p>
                <Button onClick={resetAndClose} className="mt-4">Done</Button>
            </div>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}

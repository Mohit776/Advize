
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface TransactionTableProps {
  transactions: Transaction[] | null;
  isLoading: boolean;
}

export function TransactionTable({ transactions, isLoading }: TransactionTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>A record of all your financial activities on the platform.</CardDescription>
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Select defaultValue="all-types">
                <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all-types">All Types</SelectItem>
                    <SelectItem value="payout">Payout</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
            </Select>
             <Select defaultValue="all-status">
                <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all-status">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : transactions && transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(transaction.date.seconds * 1000).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className='font-medium'>{transaction.details}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold whitespace-nowrap',
                        transaction.type === 'payout' || transaction.type === 'deposit'
                          ? 'text-green-500'
                          : 'text-red-500'
                      )}
                    >
                      {transaction.type === 'payout' || transaction.type === 'deposit' ? '+' : '-'}₹
                      {transaction.amount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          transaction.status === 'completed'
                            ? 'default'
                            : transaction.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className={cn(
                            'capitalize',
                            transaction.status === 'completed' && 'bg-green-500/10 text-green-400 border-green-500/20',
                            transaction.status === 'pending' && 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                            transaction.status === 'failed' && 'bg-red-500/10 text-red-400 border-red-500/20'
                        )}
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                          No transactions yet.
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

    
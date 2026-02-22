
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  useFirestore,
  addDocumentNonBlocking,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where, serverTimestamp } from 'firebase/firestore';
import type { Review } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const reviewFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  role: z.string({ required_error: 'Please select your role.' }),
  reviewText: z.string().min(10, 'Review must be at least 10 characters.'),
  rating: z.number().min(1).max(5),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

function StarRating({
  rating,
  setRating,
}: {
  rating: number;
  setRating: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-6 w-6 cursor-pointer',
            rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
          )}
          onClick={() => setRating(star)}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Card className="bg-card/80 border-border/50">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback>{review.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">{review.name}</CardTitle>
            <CardDescription>{review.role}</CardDescription>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="font-bold">{review.rating.toFixed(1)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{review.reviewText}</p>
      </CardContent>
    </Card>
  );
}

function ReviewForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [rating, setRating] = useState(5);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      name: '',
      role: undefined,
      reviewText: '',
      rating: 5,
    },
  });

  async function onSubmit(data: ReviewFormValues) {
    if (!firestore) return;
    const reviewsColRef = collection(firestore, 'reviews');
    addDocumentNonBlocking(reviewsColRef, {
      ...data,
      rating,
      isApproved: true, // Auto-approve for now
      createdAt: serverTimestamp(),
    });

    toast({
      title: 'Review Submitted!',
      description: 'Thank you for your feedback.',
    });
    form.reset();
    setRating(5);
    onSubmitted();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Aisha Sharma" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>You are a...</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Creator">Creator</SelectItem>
                  <SelectItem value="Business Owner">
                    Business Owner
                  </SelectItem>
                  <SelectItem value="Marketer">Marketer</SelectItem>
                  <SelectItem value="Visitor">Visitor</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reviewText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Review</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What did you like or dislike?"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rating"
          render={() => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <StarRating
                  rating={rating}
                  setRating={(newRating) => {
                    setRating(newRating);
                    form.setValue('rating', newRating);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Submit Review
        </Button>
      </form>
    </Form>
  );
}

const REVIEWS_PER_PAGE = 3;

function ReviewsGrid({ reviews }: { reviews: Review[] }) {
  const [visibleCount, setVisibleCount] = useState(REVIEWS_PER_PAGE);
  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      {(hasMore || visibleCount > REVIEWS_PER_PAGE) && (
        <div className="flex items-center justify-center gap-3 mt-8">
          {hasMore && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setVisibleCount((c) => c + REVIEWS_PER_PAGE)}
            >
              Show More ({reviews.length - visibleCount} remaining)
            </Button>
          )}
          {visibleCount > REVIEWS_PER_PAGE && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setVisibleCount(REVIEWS_PER_PAGE)}
            >
              Show Less
            </Button>
          )}
        </div>
      )}
    </>
  );
}

export function Testimonials() {
  const firestore = useFirestore();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const reviewsQuery = useMemoFirebase(
    () =>
      firestore ? query(collection(firestore, 'reviews'), where('isApproved', '==', true)) : null,
    [firestore]
  );
  const { data: reviews, isLoading } = useCollection<Review>(reviewsQuery);


  return (
    <section className="bg-background py-20 md:py-24">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
          <div>
            <h2 className="text-3xl font-bold tracking-tighter font-headline sm:text-4xl">
              Trusted by the Best
            </h2>
            <p className="mt-2 text-muted-foreground md:text-lg">
              Hear what our partners have to say about their success with Advize.
            </p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shrink-0">+ Add Review</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Your Experience</DialogTitle>
                <DialogDescription>
                  Loved using Advize? Leave a review and let others know what you think.
                </DialogDescription>
              </DialogHeader>
              <div className="pt-4">
                <ReviewForm onSubmitted={() => setIsFormOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-12 max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : reviews && reviews.length > 0 ? (
            <ReviewsGrid reviews={reviews} />
          ) : (
            <div className="flex h-60 items-center justify-center rounded-lg border-2 border-dashed border-border/50 bg-card/20">
              <div className="text-center">
                <p className="font-semibold">No reviews yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Be the first to share your experience!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


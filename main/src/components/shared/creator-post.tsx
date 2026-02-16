'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import Image from 'next/image';

interface CreatorPostProps {
    children: React.ReactNode;
    creatorName: string;
    postUrl: string;
}

export function CreatorPost({
    children,
    creatorName,
    postUrl,
}: CreatorPostProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Post by {creatorName}</DialogTitle>
                    <DialogDescription>
                        A preview of the social media post created by {creatorName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="aspect-square relative mt-4">
                    <Image
                        src="https://picsum.photos/seed/post-image/600/600"
                        alt={`Post by ${creatorName}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="rounded-md"
                        data-ai-hint="social media post"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

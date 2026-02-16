
'use client';

import { Search, MapPin, Users, Library, Club, Video, Play, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ExploreVideo } from '@/lib/types';

const postLayouts = [
  { aspect: '9:16', span: 'col-span-1' },
  { aspect: '4:5', span: 'col-span-1' },
  { aspect: '16:9', span: 'col-span-2' },
  { aspect: '9:16', span: 'col-span-1' },
  { aspect: '1:1', span: 'col-span-1' },
  { aspect: '4:5', span: 'col-span-1' },
  { aspect: '9:16', span: 'col-span-1' },
  { aspect: '16:9', span: 'col-span-2' },
  { aspect: '1:1', span: 'col-span-1' },
  { aspect: '4:5', span: 'col-span-1' },
  { aspect: '9:16', span: 'col-span-1' },
  { aspect: '9:16', span: 'col-span-1' },
];

const mockCreators = [
  {
    id: '1',
    name: 'Aisha Sharma',
    avatarUrl: 'https://picsum.photos/seed/creator1/100/100',
    category: 'Lifestyle',
    followers: '1.2M',
  },
  {
    id: '2',
    name: 'Rohan Verma',
    avatarUrl: 'https://picsum.photos/seed/creator2/100/100',
    category: 'Tech',
    followers: '500K',
  },
  {
    id: '3',
    name: 'Priya Singh',
    avatarUrl: 'https://picsum.photos/seed/creator3/100/100',
    category: 'Food',
    followers: '750K',
  },
  {
    id: '4',
    name: 'Karan Desai',
    avatarUrl: 'https://picsum.photos/seed/creator4/100/100',
    category: 'Travel',
    followers: '320K',
  },
];

const aspectRatios = ['9:16', '4:5', '16:9', '1:1'];

function VideoCard({
  video,
  layout,
  aspectFilter,
  onSelect
}: {
  video: ExploreVideo;
  layout: typeof postLayouts[0];
  aspectFilter: string;
  onSelect: (video: ExploreVideo) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => { });
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleClick = () => {
    onSelect(video);
  };

  const aspectClass =
    video.aspectRatio === '9:16' ? 'aspect-[9/16]' :
      video.aspectRatio === '4:5' ? 'aspect-[4/5]' :
        video.aspectRatio === '16:9' ? 'aspect-[16/9]' :
          'aspect-square';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-md cursor-pointer bg-muted',
        aspectClass,
        aspectFilter === 'all' ? layout.span : 'col-span-1'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl || undefined}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        loop
        preload="metadata"
      />

      {/* Thumbnail fallback when not hovering */}
      {video.thumbnailUrl && !isHovering && !isPlaying && (
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover"
        />
      )}

      {/* Play icon when not playing */}
      {!isPlaying && !isHovering && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/30 rounded-full p-2">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Hover overlay with info - Always visible on mobile, hover on desktop */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
        <p className="text-white text-sm font-semibold truncate">
          {video.title}
        </p>
        <p className="text-white/80 text-xs truncate">
          {video.creatorName}
        </p>
      </div>
    </div>
  );
}

export default function BusinessExplorePage() {
  const [aspectFilter, setAspectFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<ExploreVideo | null>(null);
  const firestore = useFirestore();

  // Fetch explore videos from Firestore (simple collection read)
  const videosQuery = useMemoFirebase(
    () => collection(firestore, 'exploreVideos'),
    [firestore]
  );

  const { data: exploreVideos, isLoading } = useCollection<ExploreVideo>(videosQuery);

  // Filter active videos, by aspect ratio, and by search query
  const filteredVideos = exploreVideos?.filter(video => {
    // 1. Must be active
    if (!video.isActive) return false;

    // 2. Aspect Ratio filter
    if (aspectFilter !== 'all' && video.aspectRatio !== aspectFilter) return false;

    // 3. Search Query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        video.title.toLowerCase().includes(query) ||
        video.creatorName.toLowerCase().includes(query) ||
        (video.category && video.category.toLowerCase().includes(query))
      );
    }

    return true;
  });

  return (
    <div className="flex-1 space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search for content, creators, or places..."
          className="pl-10 h-11 bg-muted border-0 focus-visible:ring-primary"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="library">
            <Library className="mr-2 h-4 w-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="people">
            <Users className="mr-2 h-4 w-4" />
            People
          </TabsTrigger>
          <TabsTrigger value="place">
            <MapPin className="mr-2 h-4 w-4" />
            Place
          </TabsTrigger>
          <TabsTrigger value="clubs">
            <Club className="mr-2 h-4 w-4" />
            Clubs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-6">
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={aspectFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAspectFilter('all')}
            >
              All
            </Button>
            {aspectRatios.map(ratio => (
              <Button
                key={ratio}
                variant={aspectFilter === ratio ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAspectFilter(ratio)}
              >
                {ratio}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVideos && filteredVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
              {filteredVideos.map((video, index) => {
                const layout = postLayouts[index % postLayouts.length];
                return (
                  <VideoCard
                    key={video.id}
                    video={video}
                    layout={layout}
                    aspectFilter={aspectFilter}
                    onSelect={setSelectedVideo}
                  />
                );
              })}
            </div>
          ) : (
            <div className="col-span-full text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
              <Video className="mx-auto h-12 w-12 mb-4" />
              <h3 className="mt-2 text-lg font-medium">No Content Yet</h3>
              <p className="mt-2 text-sm max-w-xs mx-auto">
                {aspectFilter !== 'all'
                  ? 'No videos found for the selected aspect ratio.'
                  : 'Videos can be added from the admin panel.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mockCreators.map((creator) => (
              <Card key={creator.id} className="text-center hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <Image
                    src={creator.avatarUrl}
                    alt={creator.name}
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-full mx-auto border-4 border-muted"
                  />
                  <h3 className="mt-4 font-bold font-headline">{creator.name}</h3>
                  <p className="text-sm text-muted-foreground">{creator.category}</p>
                  <p className="mt-2 text-lg font-bold">{creator.followers}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                  <Button asChild className="mt-4 w-full" size="sm">
                    <Link href={`/creator/profile/${creator.id}`}>View Profile</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="place" className="mt-6">
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
            <MapPin className="mx-auto h-12 w-12 mb-4" />
            <h3 className="mt-2 text-lg font-medium">Location Search Coming Soon</h3>
            <p className="mt-2 text-sm max-w-xs mx-auto">
              You'll soon be able to discover creators and content by city or region.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="clubs" className="mt-6">
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
            <Club className="mx-auto h-12 w-12 mb-4" />
            <h3 className="mt-2 text-lg font-medium">Clubs Feature Coming Soon</h3>
            <p className="mt-2 text-sm max-w-xs mx-auto">
              You'll soon be able to discover and create curated groups of creators.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Video Detail Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black border-zinc-800 w-[95vw] md:w-full rounded-xl">
          <div className="flex flex-col md:grid md:grid-cols-[1fr,400px] h-[85vh] md:h-[80vh]">
            {/* Left: Video Player - Takes roughly half height on mobile, full column on desktop */}
            <div className="bg-black relative flex items-center justify-center flex-1 md:flex-auto min-h-[300px] md:min-h-0 bg-zinc-950">
              {selectedVideo && (
                <video
                  src={selectedVideo.videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  playsInline
                />
              )}
            </div>

            {/* Right: Info - Scrollable on mobile */}
            <div className="bg-background flex flex-col md:h-full border-t md:border-t-0 md:border-l border-border md:min-w-[400px]">
              <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4 md:space-y-6">
                <DialogHeader className="space-y-2 md:space-y-4 text-left">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{selectedVideo?.category || 'Uncategorized'}</span>
                    </div>
                    <DialogTitle className="text-xl md:text-2xl font-bold leading-tight">{selectedVideo?.title}</DialogTitle>
                  </div>

                  <div className="flex items-center gap-3 py-3 border-y border-border/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden relative">
                      {selectedVideo?.creatorName ? (
                        // If we had a creator avatar URL, we'd use it here. For now, initials.
                        <span className="text-sm">{selectedVideo.creatorName.substring(0, 2).toUpperCase()}</span>
                      ) : '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{selectedVideo?.creatorName}</p>
                      <p className="text-xs text-muted-foreground">Creator</p>
                    </div>
                  </div>

                  <DialogDescription className="text-base text-foreground/80 whitespace-pre-wrap">
                    {selectedVideo?.description || 'No description provided.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Upload Date</p>
                      <p className="font-medium text-sm">
                        {selectedVideo?.createdAt?.seconds
                          ? new Date(selectedVideo.createdAt.seconds * 1000).toLocaleDateString()
                          : 'Just now'}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Format</p>
                      <p className="font-medium text-sm">{selectedVideo?.aspectRatio}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

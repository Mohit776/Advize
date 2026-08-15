import { NextRequest, NextResponse } from 'next/server';
import { scrapeInstagramProfile, scrapeInstagramPost, extractUsernameFromUrl } from '@/lib/instagram-scraper';
import { getAdminStorage } from '@/lib/firebase-admin';

/**
 * Downloads an Instagram CDN image and re-uploads it to Firebase Storage.
 * Returns a permanent public URL, or null on failure.
 *
 * Instagram CDN URLs (scontent-*.cdninstagram.com) are short-lived and IP-signed.
 * They cannot be embedded on third-party domains. We download them server-side
 * (where they are still valid at scrape time) and host them permanently in Storage.
 */
async function reuploadToStorage(instagramUrl: string, pathPrefix: string): Promise<string | null> {
    if (!instagramUrl) return null;
    try {
        const res = await fetch(instagramUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/',
            },
        });
        if (!res.ok) {
            console.warn(`Failed to download Instagram image (${res.status}): ${instagramUrl.slice(0, 80)}`);
            return null;
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const storage = getAdminStorage();
        const bucket = storage.bucket();
        const file = bucket.file(fileName);

        await file.save(buffer, { metadata: { contentType } });
        await file.makePublic();

        return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    } catch (e) {
        console.error('Failed to re-upload image to storage:', e);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, type = 'profile' } = body;

        if (!url) {
            return NextResponse.json(
                { success: false, error: 'URL or username is required' },
                { status: 400 }
            );
        }

        if (type === 'post') {
            const result = await scrapeInstagramPost(url);

            // Re-upload post thumbnail to Firebase Storage
            if (result.success && result.data?.recentPosts?.[0]?.displayUrl) {
                const post = result.data.recentPosts[0];
                const hosted = await reuploadToStorage(post.displayUrl, `instagram-cache/posts`);
                if (hosted) post.displayUrl = hosted;
            }

            return NextResponse.json(result);
        } else {
            const username = extractUsernameFromUrl(url);
            if (!username) {
                return NextResponse.json(
                    { success: false, error: 'Invalid Instagram URL or username' },
                    { status: 400 }
                );
            }

            const result = await scrapeInstagramProfile(username);

            if (result.success && result.data) {
                const prefix = `instagram-cache/${username}`;

                // Re-upload profile picture
                if (result.data.profile?.profilePicUrl) {
                    const hosted = await reuploadToStorage(result.data.profile.profilePicUrl, `${prefix}/profile`);
                    if (hosted) result.data.profile.profilePicUrl = hosted;
                }

                // Re-upload post thumbnails in parallel
                if (result.data.recentPosts?.length) {
                    await Promise.all(
                        result.data.recentPosts.map(async (post: any) => {
                            if (post.displayUrl) {
                                const hosted = await reuploadToStorage(post.displayUrl, `${prefix}/posts`);
                                if (hosted) post.displayUrl = hosted;
                            }
                        })
                    );
                }
            }

            return NextResponse.json(result);
        }
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const type = searchParams.get('type') || 'profile';

    if (!url) {
        return NextResponse.json(
            { success: false, error: 'URL or username is required' },
            { status: 400 }
        );
    }

    if (type === 'post') {
        const result = await scrapeInstagramPost(url);
        return NextResponse.json(result);
    } else {
        const username = extractUsernameFromUrl(url);
        if (!username) {
            return NextResponse.json(
                { success: false, error: 'Invalid Instagram URL or username' },
                { status: 400 }
            );
        }

        const result = await scrapeInstagramProfile(username);
        return NextResponse.json(result);
    }
}

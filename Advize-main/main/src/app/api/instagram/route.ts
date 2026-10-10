import { NextRequest, NextResponse } from 'next/server';
import { scrapeInstagramProfile, scrapeInstagramPost, extractUsernameFromUrl } from '@/lib/instagram-scraper';

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
            // Scrape a specific post
            const result = await scrapeInstagramPost(url);
            return NextResponse.json(result);
        } else {
            // Scrape profile
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

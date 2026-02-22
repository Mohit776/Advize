import { NextRequest, NextResponse } from 'next/server';

/**
 * Image proxy route to bypass Instagram CDN hotlink protection.
 * Usage: /api/image-proxy?url=<encoded-image-url>
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Only allow proxying from known Instagram/Facebook CDN domains
    const allowedDomains = [
        'cdninstagram.com',
        'instagram.com',
        'fbcdn.net',
        'scontent',
    ];

    const isAllowed = allowedDomains.some(domain => imageUrl.includes(domain));
    if (!isAllowed) {
        return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.status}` },
                { status: response.status }
            );
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error: any) {
        console.error('Image proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to proxy image' },
            { status: 500 }
        );
    }
}

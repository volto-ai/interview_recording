import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Get client IP address from various headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    // Log tracking details to console for debugging
    console.log('Tracking request:', {
      url,
      userAgent: request.headers.get('user-agent') || null,
      ipAddress: clientIp,
      timestamp: new Date().toISOString(),
    });

    // Execute the tracking request (fire & forget)
    try {
      // Fetch with no-cors mode to avoid CORS issues with third-party URLs
      // We don't await this to make it truly fire & forget
      fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-cache',
      });
      console.log('Tracking fired');
    } catch (fetchError) {
      console.error('Error executing tracking URL:', fetchError);
      // We intentionally don't throw here, as we want this to be fire & forget
    }

    // Return success even if the fetch might fail later
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in tracking API:', error);
    return NextResponse.json(
      { error: 'Failed to process tracking request' },
      { status: 500 }
    );
  }
} 
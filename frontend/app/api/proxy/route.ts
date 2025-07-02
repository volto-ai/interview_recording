import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }
  
  try {
    // Remove /api prefix if present to avoid double /api/
    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(5) : endpoint;
    const response = await fetch(`${BACKEND_URL}/api/${cleanEndpoint}`, {
      headers: {
        'X-API-Key': API_KEY || '',
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }
  
  try {
    // Remove /api prefix if present to avoid double /api/
    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(5) : endpoint;
    
    // Check if this is a FormData request (file upload)
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      
      const response = await fetch(`${BACKEND_URL}/api/${cleanEndpoint}`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY || '',
        },
        body: formData,
      });
      
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      // Handle JSON request
      const body = await request.json();
      
      const response = await fetch(`${BACKEND_URL}/api/${cleanEndpoint}`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }
  
  try {
    // Remove /api prefix if present to avoid double /api/
    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(5) : endpoint;
    
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/${cleanEndpoint}`, {
      method: 'PUT',
      headers: {
        'X-API-Key': API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }
  
  try {
    // Remove /api prefix if present to avoid double /api/
    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(5) : endpoint;
    
    const response = await fetch(`${BACKEND_URL}/api/${cleanEndpoint}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': API_KEY || '',
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
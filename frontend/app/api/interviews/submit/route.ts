import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // Get the JSON data from the frontend request
    const submissionData = await request.json()
    
    console.log('Forwarding interview submission to backend:', JSON.stringify(submissionData, null, 2))
    
    // Forward the request to the Flask backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/interviews/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData),
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend submission failed:', errorText)
      return NextResponse.json(
        { error: 'Submission failed', details: errorText },
        { status: backendResponse.status }
      )
    }

    // Forward the successful response from backend
    const result = await backendResponse.json()
    console.log('Backend submission successful:', result)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error proxying submission request:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js API Route: Menu Process Proxy
 * 
 * This route acts as a secure proxy between the management platform and Cloudflare Worker.
 * The API key is stored server-side and never exposed to the client.
 */

export async function POST(request: NextRequest) {
  try {
    // Get the Cloudflare Worker URL
    const workerUrl = process.env.CLOUDFLARE_MENU_PROCESS_WORKER_URL || 
                      process.env.NEXT_PUBLIC_CLOUDFLARE_MENU_PROC_URL
    if (!workerUrl) {
      console.error('CLOUDFLARE_MENU_PROCESS_WORKER_URL or NEXT_PUBLIC_CLOUDFLARE_MENU_PROC_URL is not configured')
      return NextResponse.json(
        { error: 'Server configuration error: Cloudflare Worker URL not found' },
        { status: 500 }
      )
    }

    // Get the API key (server-side only, never exposed to client)
    const apiKey = process.env.CLOUDFLARE_MENU_PROCESS_WORKER_API_KEY
    if (!apiKey) {
      console.error('CLOUDFLARE_MENU_PROCESS_WORKER_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Server configuration error: API key not found' },
        { status: 500 }
      )
    }

    // Check if this is a multipart/form-data request (file upload)
    const contentType = request.headers.get('content-type') || ''
    const isMultipart = contentType.includes('multipart/form-data')

    // Get the request body first
    let body: BodyInit
    let headers: HeadersInit = {
      'X-API-Key': apiKey, // Server-side API key
    }

    if (isMultipart) {
      // For multipart/form-data, we need to forward the FormData
      // Don't set Content-Type header - fetch will automatically set it with boundary
      const formData = await request.formData()
      body = formData
      // Don't set Content-Type - fetch handles it automatically for FormData
    } else {
      // For JSON requests, parse and forward
      headers['Content-Type'] = 'application/json'
      const jsonBody = await request.json()
      body = JSON.stringify(jsonBody)
    }

    // Forward request to Cloudflare Worker
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers,
      body,
    })

    // Get response data
    const data = await response.json()

    // Forward the response status and data
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error('Menu process proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to process menu images. Please try again.' },
      { status: 500 }
    )
  }
}


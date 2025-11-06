import { NextRequest, NextResponse } from 'next/server'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Extract the key from the public URL
    // URL format: https://bucket.zeelu.me/image/filename.jpg
    // or: https://bucket.zeelu.me/video/filename.mp4
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL!
    if (!url.startsWith(publicUrl)) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Extract the key (path after the public URL)
    const key = url.replace(publicUrl + '/', '')

    const command = new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
    })

    await s3Client.send(command)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file', details: error.message },
      { status: 500 }
    )
  }
}


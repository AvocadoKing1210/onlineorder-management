import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
    const { filename, contentType, folder } = await request.json()

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Filename and contentType are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const isImage = contentType.startsWith('image/')
    const isVideo = contentType.startsWith('video/')
    
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Only image and video files are allowed' },
        { status: 400 }
      )
    }

    // Determine folder based on file type or provided folder
    const fileFolder = folder || (isImage ? 'image' : 'video')
    
    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = filename.split('.').pop()
    const uniqueFilename = `${timestamp}-${randomString}.${fileExtension}`
    
    const key = `${fileFolder}/${uniqueFilename}`

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    })

    // Generate pre-signed URL (valid for 1 hour)
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    })

    // Construct public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`

    return NextResponse.json({
      presignedUrl,
      key,
      publicUrl,
    })
  } catch (error: any) {
    console.error('Error generating pre-signed URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL', details: error.message },
      { status: 500 }
    )
  }
}


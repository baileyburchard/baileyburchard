import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

const STORE_NAME = 'portfolio-items'
const IMAGE_STORE_NAME = 'portfolio-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    return handleList()
  }

  if (req.method === 'POST') {
    return handleUpload(req)
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) {
      return Response.json({ error: 'Missing id parameter' }, { status: 400 })
    }
    return handleDelete(id)
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}

async function handleList() {
  const store = getStore(STORE_NAME)
  const { blobs } = await store.list()

  const items = await Promise.all(
    blobs.map(async (blob) => {
      const data = await store.get(blob.key, { type: 'json' })
      return data
    })
  )

  // Sort by creation date, newest first
  items.sort((a: any, b: any) => (b?.createdAt || 0) - (a?.createdAt || 0))

  return Response.json({ items })
}

async function handleUpload(req: Request) {
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return Response.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const title = (formData.get('title') as string) || 'Untitled'
  const description = (formData.get('description') as string) || ''

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG' }, { status: 400 })
  }

  const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const imageKey = `${id}-${file.name}`

  // Store the image binary
  const imageStore = getStore(IMAGE_STORE_NAME)
  const arrayBuffer = await file.arrayBuffer()
  await imageStore.set(imageKey, arrayBuffer, {
    metadata: { contentType: file.type }
  })

  // Store the metadata
  const metaStore = getStore(STORE_NAME)
  const item = {
    id,
    title,
    description,
    imageKey,
    mimeType: file.type,
    fileName: file.name,
    createdAt: Date.now(),
  }
  await metaStore.setJSON(id, item)

  return Response.json({ item }, { status: 201 })
}

async function handleDelete(id: string) {
  const metaStore = getStore(STORE_NAME)
  const item = await metaStore.get(id, { type: 'json' }) as any

  if (!item) {
    return Response.json({ error: 'Item not found' }, { status: 404 })
  }

  // Delete the image
  const imageStore = getStore(IMAGE_STORE_NAME)
  await imageStore.delete(item.imageKey)

  // Delete the metadata
  await metaStore.delete(id)

  return Response.json({ success: true })
}

export const config: Config = {
  path: '/api/portfolio',
}

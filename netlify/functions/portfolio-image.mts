import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  const key = context.params.key
  if (!key) {
    return new Response('Missing image key', { status: 400 })
  }

  const store = getStore('portfolio-images')
  const result = await store.getWithMetadata(key, { type: 'arrayBuffer' })

  if (!result) {
    return new Response('Image not found', { status: 404 })
  }

  const contentType = result.metadata?.contentType || 'image/jpeg'

  return new Response(result.data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

export const config: Config = {
  path: '/api/images/:key',
}

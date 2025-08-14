import { NextRequest, NextResponse } from 'next/server'
import { ClashTemplate, type ClashProxy } from '@/lib/clash-template'
import { randomUUID } from 'crypto'

// 简易内存存储（含 TTL），短期缓存 token -> { payload(JSON), expiresAt }
// 注意：无持久化，仅为解决长链接问题
type StoredEntry = { payload: string; expiresAt: number }
const memoryStore = new Map<string, StoredEntry>()
const TTL_MS = 5 * 60 * 1000 // 5分钟

function cleanupExpired() {
  const now = Date.now()
  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt <= now) memoryStore.delete(key)
  }
}

function generateToken(): string {
  // 使用 UUID，碰撞概率极低
  return randomUUID()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const proxies = (body?.proxies || []) as ClashProxy[]

    if (!Array.isArray(proxies) || proxies.length === 0) {
      return new NextResponse('Missing proxies payload', { status: 400 })
    }

    const payload = JSON.stringify(proxies)
    const token = generateToken()
    cleanupExpired()
    memoryStore.set(token, { payload, expiresAt: Date.now() + TTL_MS })

    return NextResponse.json({ token }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Clash token generation error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('t')
    const proxiesParam = searchParams.get('proxies')

    let proxies: ClashProxy[] | null = null

    if (token) {
      cleanupExpired()
      const stored = memoryStore.get(token)
      if (!stored || stored.expiresAt <= Date.now()) {
        if (stored) memoryStore.delete(token)
        return new NextResponse('Token not found or expired', { status: 404 })
      }
      proxies = JSON.parse(stored.payload) as ClashProxy[]
    } else if (proxiesParam) {
      // 兼容旧版：base64(json)
      const json = Buffer.from(proxiesParam, 'base64').toString('utf-8')
      proxies = JSON.parse(json) as ClashProxy[]
    } else {
      return new NextResponse('Missing query parameter', { status: 400 })
    }

    if (!Array.isArray(proxies) || proxies.length === 0) {
      return new NextResponse('Invalid proxies payload', { status: 400 })
    }

    const yaml = ClashTemplate.build(proxies)

    return new NextResponse(yaml, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Transfer-Encoding': 'binary',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Clash GET generation error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}



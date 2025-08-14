import { NextRequest, NextResponse } from 'next/server'
import { ClashTemplate, type ClashProxy } from '@/lib/clash-template'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const proxies = (body?.proxies || []) as ClashProxy[]

    if (!Array.isArray(proxies) || proxies.length === 0) {
      return new NextResponse('Missing proxies payload', { status: 400 })
    }

    const yaml = ClashTemplate.build(proxies)

    return new NextResponse(yaml, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Transfer-Encoding': 'binary',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Clash generation error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const proxiesParam = searchParams.get('proxies')

    if (!proxiesParam) {
      return new NextResponse('Missing proxies parameter', { status: 400 })
    }

    // base64 -> utf-8 json
    const json = Buffer.from(proxiesParam, 'base64').toString('utf-8')
    const proxies = JSON.parse(json) as ClashProxy[]

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



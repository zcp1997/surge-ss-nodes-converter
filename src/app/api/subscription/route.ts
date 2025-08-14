import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const urls = searchParams.get('urls');
  
  if (!urls) {
    return new NextResponse('Missing urls parameter', { status: 400 });
  }

  try {
    // 解码 URL 参数并分割成数组
    const decodedUrls = decodeURIComponent(urls);
    const urlList = decodedUrls.split('\n').filter(url => url.trim());
    
    // 直接返回URL列表，因为convertToSSUrl已经正确编码了节点名称
    const subscriptionContent = urlList.join('\n');
    
    return new NextResponse(subscriptionContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Subscription generation error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

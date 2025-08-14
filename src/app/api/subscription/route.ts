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
    
    // 确保节点名称部分保持 URL 编码格式
    const encodedUrlList = urlList.map(url => {
      if (url.includes('#')) {
        const [baseUrl, nodeName] = url.split('#');
        // 重新编码节点名称，确保显示为 URL 编码格式
        const reEncodedNodeName = encodeURIComponent(decodeURIComponent(nodeName));
        return `${baseUrl}#${reEncodedNodeName}`;
      }
      return url;
    });
    
    const subscriptionContent = encodedUrlList.join('\n');
    
    return new NextResponse(subscriptionContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=ascii',
        'Content-Transfer-Encoding': 'binary',
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

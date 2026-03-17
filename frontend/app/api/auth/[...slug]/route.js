import { NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function mapAuthPath(path) {
  if (path === 'register') return 'vendor/register';
  return path;
}

export async function GET(request, context) {
  const params = await context.params;
  const { slug } = params;
  const path = Array.isArray(slug) ? slug.join('/') : slug;
  const mappedPath = mapAuthPath(path);
  
  console.log(`🔄 [API Proxy] GET slug:`, slug, `path:`, path);
  
  try {
    const backendUrl = `${BACKEND_URL}/api/auth/${mappedPath}`;
    console.log(`🔄 [API Proxy] GET ${path} -> ${backendUrl}`);
    
    const cookieHeader = request.headers.get('cookie') || '';
    console.log(`🍪 [API Proxy] GET forwarding cookies:`, cookieHeader ? 'YES' : 'NO', cookieHeader.substring(0, 100));
    
    // Use axios to properly handle multiple Set-Cookie headers
    const axiosResponse = await axios.get(backendUrl, {
      headers: {
        'Cookie': cookieHeader,
      },
      validateStatus: () => true, // Don't throw on any status
    });
    
    console.log(`✅ [API Proxy] GET response status: ${axiosResponse.status}`);
    
    // Create response
    const response = NextResponse.json(axiosResponse.data, { status: axiosResponse.status });
    
    // Forward ALL Set-Cookie headers from backend
    const setCookieHeaders = axiosResponse.headers['set-cookie'];
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      console.log(`🍪 [API Proxy] Forwarding ${setCookieHeaders.length} cookies:`, setCookieHeaders);
      setCookieHeaders.forEach(cookie => {
        response.headers.append('set-cookie', cookie);
      });
    } else {
      console.log('⚠️ [API Proxy] No cookies in GET response');
    }
    
    return response;
  } catch (error) {
    console.error('[API Proxy] GET error:', error.message, error.stack);
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 500 });
  }
}

export async function POST(request, context) {
  const params = await context.params;
  const { slug } = params;
  const path = Array.isArray(slug) ? slug.join('/') : slug;
  const mappedPath = mapAuthPath(path);
  
  console.log(`🔄 [API Proxy] POST slug:`, slug, `path:`, path);
  
  try {
    const body = await request.json();
    
    const backendUrl = `${BACKEND_URL}/api/auth/${mappedPath}`;
    console.log(`🔄 [API Proxy] POST ${path} -> ${backendUrl}`);
    
    const cookieHeader = request.headers.get('cookie') || '';
    console.log(`🍪 [API Proxy] POST forwarding cookies:`, cookieHeader ? 'YES' : 'NO');
    
    // Use axios to properly handle multiple Set-Cookie headers
    const axiosResponse = await axios.post(backendUrl, body, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      validateStatus: () => true, // Don't throw on any status
    });
    
    console.log(`✅ [API Proxy] POST response status: ${axiosResponse.status}`);
    
    // Create response
    const response = NextResponse.json(axiosResponse.data, { status: axiosResponse.status });
    
    // Forward ALL Set-Cookie headers from backend
    const setCookieHeaders = axiosResponse.headers['set-cookie'];
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      console.log(`🍪 [API Proxy] Forwarding ${setCookieHeaders.length} cookies:`, setCookieHeaders);
      setCookieHeaders.forEach(cookie => {
        response.headers.append('set-cookie', cookie);
      });
    } else {
      console.log('⚠️ [API Proxy] No cookies in POST response');
    }
    
    return response;
  } catch (error) {
    console.error('[API Proxy] POST error:', error.message, error.stack);
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 500 });
  }
}

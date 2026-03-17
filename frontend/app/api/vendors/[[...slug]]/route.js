import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function buildBackendUrl(slug) {
  if (!slug || (Array.isArray(slug) && slug.length === 0)) {
    return `${BACKEND_URL}/api/vendors`;
  }
  const path = Array.isArray(slug) ? slug.join('/') : slug;
  return `${BACKEND_URL}/api/vendors/${path}`;
}

async function forwardRequest(method, request, context) {
  try {
    const params = await context.params;
    const slug = params?.slug;
    const incomingUrl = new URL(request.url);
    const backendUrl = new URL(buildBackendUrl(slug));

    if (incomingUrl.search) {
      backendUrl.search = incomingUrl.search;
    }

    const headers = {
      Cookie: request.headers.get('cookie') || '',
      Accept: request.headers.get('accept') || 'application/json',
    };

    const authorization = request.headers.get('authorization');
    if (authorization) headers.Authorization = authorization;

    const contentType = request.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    const body = ['GET', 'HEAD'].includes(method) ? undefined : await request.text();

    const backendResponse = await fetch(backendUrl.toString(), {
      method,
      headers,
      body,
    });

    const raw = await backendResponse.text();
    let payload = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = { message: raw };
    }

    const response = NextResponse.json(payload, { status: backendResponse.status });

    const setCookie = backendResponse.headers.get('set-cookie');
    if (setCookie) {
      response.headers.append('set-cookie', setCookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Vendor API proxy failed', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request, context) {
  return forwardRequest('GET', request, context);
}

export async function POST(request, context) {
  return forwardRequest('POST', request, context);
}

export async function PUT(request, context) {
  return forwardRequest('PUT', request, context);
}

export async function PATCH(request, context) {
  return forwardRequest('PATCH', request, context);
}

export async function DELETE(request, context) {
  return forwardRequest('DELETE', request, context);
}

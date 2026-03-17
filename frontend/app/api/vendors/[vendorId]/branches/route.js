export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

async function forward(method, req, context) {
  try {
    const params = await context?.params;
    const vendorId = params?.vendorId;

    if (!vendorId) {
      return NextResponse.json({ message: 'Missing vendorId' }, { status: 400 });
    }

    const incomingUrl = new URL(req.url);
    const backendUrl = new URL(`${BACKEND_URL}/api/vendors/${vendorId}/branches`);
    if (incomingUrl.search) {
      backendUrl.search = incomingUrl.search;
    }

    const headers = {
      Cookie: req.headers.get('cookie') || '',
      Accept: req.headers.get('accept') || 'application/json',
    };

    const contentType = req.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const authorization = req.headers.get('authorization');
    if (authorization) {
      headers.Authorization = authorization;
    }

    const body = ['GET', 'HEAD'].includes(method) ? undefined : await req.text();

    const backendResp = await fetch(backendUrl.toString(), {
      method,
      headers,
      body,
    });

    const raw = await backendResp.text();
    let payload = null;

    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = { message: raw };
    }

    const response = NextResponse.json(payload, { status: backendResp.status });

    const setCookie = backendResp.headers.get('set-cookie');
    if (setCookie) {
      response.headers.append('set-cookie', setCookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Vendors branches proxy failed', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req, context) {
  return forward('GET', req, context);
}

export async function POST(req, context) {
  return forward('POST', req, context);
}

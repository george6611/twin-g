export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(req) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';

    const { searchParams } = new URL(req.url);
    const queryString = searchParams.toString();

    const resp = await fetch(`${BACKEND}/api/vendor/products${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to fetch products' },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/vendor/products] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.formData();
    const cookieHeader = req.headers.get('cookie') || '';

    const resp = await fetch(`${BACKEND}/api/vendor/products`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
      },
      body: body,
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json(
        { message: data?.message || 'Product creation failed' },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[POST /api/vendor/products] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

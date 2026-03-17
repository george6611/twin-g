export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(req, context) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ message: 'Missing product id' }, { status: 400 });
    }

    const resp = await fetch(`${BACKEND}/api/vendor/products/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to fetch product details' },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/vendor/products/:id] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req, context) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ message: 'Missing product id' }, { status: 400 });
    }

    const body = await req.json();

    const resp = await fetch(`${BACKEND}/api/vendor/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to update product' },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[PUT /api/vendor/products/:id] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req, context) {
  return PUT(req, context);
}

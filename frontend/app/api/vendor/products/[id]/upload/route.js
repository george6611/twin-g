export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function POST(req, context) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ message: 'Missing product id' }, { status: 400 });
    }

    const formData = await req.formData();

    const resp = await fetch(`${BACKEND}/api/vendor/products/${id}/upload`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
      },
      body: formData,
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to upload product image(s)' },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[POST /api/vendor/products/:id/upload] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

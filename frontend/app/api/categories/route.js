export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(req) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';

    const resp = await fetch(`${BACKEND}/api/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to fetch categories' },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/categories] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function POST(req) {
  try {
    const body = await req.formData();
    const cookieHeader = req.headers.get('cookie') || '';

    console.log('[Bulk Import] Forwarding to backend');

    const resp = await fetch(`${BACKEND}/api/vendor/products/bulk/import`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
      },
      body: body,
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json(
        { message: data?.message || 'Bulk import failed', ...data },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/vendor/products/bulk/import] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

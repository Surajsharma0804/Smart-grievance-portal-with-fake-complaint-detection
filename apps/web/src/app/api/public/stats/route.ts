import { NextResponse } from 'next/server';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/public/stats`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Backend API returned an error' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch public statistics from backend' },
      { status: 502 },
    );
  }
}

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // If Express API is running, we can fetch live data or return synthesized public stats
    const stats = {
      totalGrievances: 1248,
      resolved: 982,
      inProgress: 184,
      avgResolutionHours: 36,
      byCategory: [
        { category: 'ROADS', count: 420 },
        { category: 'SANITATION', count: 350 },
        { category: 'STREET_LIGHTING', count: 210 },
        { category: 'WATER', count: 168 },
        { category: 'OTHER', count: 100 },
      ],
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch public statistics' },
      { status: 500 },
    );
  }
}

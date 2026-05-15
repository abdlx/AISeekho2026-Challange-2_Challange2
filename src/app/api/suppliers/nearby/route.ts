import { NextResponse } from 'next/server';
import { findNearbySuppliers } from '@/lib/google-maps';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '50000';
  const keyword = searchParams.get('keyword') || 'supplier';

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing lat or lng query parameters' },
      { status: 400 }
    );
  }

  try {
    const suppliers = await findNearbySuppliers(`${lat},${lng}`, parseInt(radius, 10), keyword);
    return NextResponse.json({ suppliers });
  } catch (error: any) {
    console.error('API /suppliers/nearby error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch nearby suppliers' },
      { status: 500 }
    );
  }
}

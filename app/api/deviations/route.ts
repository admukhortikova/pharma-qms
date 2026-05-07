import { NextRequest, NextResponse } from 'next/server';
import { getAllDeviations, createDeviation } from '@/lib/db';

export async function GET() {
  try {
    const deviations = getAllDeviations();
    return NextResponse.json(deviations);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch deviations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const deviation = createDeviation(data);
    return NextResponse.json(deviation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create deviation' }, { status: 500 });
  }
}

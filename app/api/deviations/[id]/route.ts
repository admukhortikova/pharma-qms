import { NextRequest, NextResponse } from 'next/server';
import { getDeviationById, updateDeviation, findSimilarCases } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deviation = getDeviationById(id);
    if (!deviation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const similar = findSimilarCases(deviation);
    return NextResponse.json({ ...deviation, similar_cases: similar });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const deviation = updateDeviation(id, data);
    if (!deviation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(deviation);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

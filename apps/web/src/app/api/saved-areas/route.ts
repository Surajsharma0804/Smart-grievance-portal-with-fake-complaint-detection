import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth-actions';
import { connectDB } from '@/lib/db';
import { SavedArea, type ISavedArea } from '@/lib/models/saved-area';
import { savedAreaCreateSchema } from '@nagrik-setu/shared';

const MAX_SAVED_AREAS = 5;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  await connectDB();
  const areas = await SavedArea.find({ userId: session.user.id }).sort({ createdAt: -1 });

  return NextResponse.json({
    savedAreas: areas.map((a: ISavedArea) => ({
      id: a._id.toString(),
      label: a.label,
      center: a.center,
      radiusM: a.radiusM,
      categories: a.categories,
      createdAt: a.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = savedAreaCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: parsed.error.issues,
        },
      },
      { status: 422 },
    );
  }

  await connectDB();
  const count = await SavedArea.countDocuments({ userId: session.user.id });
  if (count >= MAX_SAVED_AREAS) {
    return NextResponse.json(
      {
        error: {
          code: 'LIMIT_EXCEEDED',
          message: `Maximum limit of ${MAX_SAVED_AREAS} saved areas reached`,
        },
      },
      { status: 400 },
    );
  }

  const created = await SavedArea.create({
    userId: session.user.id,
    label: parsed.data.label,
    center: parsed.data.center,
    radiusM: parsed.data.radiusM,
    categories: parsed.data.categories,
  });

  return NextResponse.json(
    {
      savedArea: {
        id: created._id.toString(),
        label: created.label,
        center: created.center,
        radiusM: created.radiusM,
        categories: created.categories,
        createdAt: created.createdAt,
      },
    },
    { status: 201 },
  );
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Area ID is required' } }, { status: 400 });
  }

  await connectDB();
  const res = await SavedArea.deleteOne({ _id: id, userId: session.user.id });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Area not found or unauthorized' } }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

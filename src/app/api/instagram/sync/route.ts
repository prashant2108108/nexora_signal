import { NextResponse } from 'next/server';
import { syncInstagramData } from '@/features/instagram/services/processor';

/**
 * POST /api/instagram/sync
 * Triggers a manual synchronization of media and insights from Meta.
 */
export async function POST() {
  try {
    await syncInstagramData();
    return NextResponse.json({ success: true, message: 'Sync complete' });
  } catch (error) {
    console.error('[Instagram Sync API Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync data' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { isWhatsAppConfigured } from '@/lib/acadia/whatsapp';
import { requireSessionApi } from '@/lib/acadia/require-session-api';

export async function GET() {
  const auth = await requireSessionApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }
  return NextResponse.json({ configured: isWhatsAppConfigured() });
}

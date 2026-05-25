import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'manara-web',
      version: process.env.npm_package_version ?? '1.0.0',
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}

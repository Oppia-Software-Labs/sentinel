import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Not implemented', hint: 'MPP session manager — see MATIAS.md' },
    { status: 501 },
  )
}

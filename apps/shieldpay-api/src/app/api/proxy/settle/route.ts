import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Not implemented', hint: 'Matías + Santiago: sentinel.evaluate + OZ forward' },
    { status: 501 },
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { clearStatus } from '@/lib/api/reconciliation'

/** Mark an entity as reviewed: removes its reconciliation flag. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cleared = await clearStatus(id)
    return NextResponse.json({ success: true, cleared })
  } catch (error) {
    console.error('Error clearing reconciliation status:', error)
    return NextResponse.json({ error: 'Failed to mark entity as reviewed' }, { status: 500 })
  }
}

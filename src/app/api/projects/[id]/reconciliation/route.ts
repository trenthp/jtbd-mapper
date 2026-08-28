import { NextRequest, NextResponse } from 'next/server'
import { getProjectStatuses } from '@/lib/api/reconciliation'

/** Flagged entities for a project. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const statuses = await getProjectStatuses(id)
    return NextResponse.json({ statuses })
  } catch (error) {
    console.error('Error fetching reconciliation statuses:', error)
    return NextResponse.json({ error: 'Failed to fetch reconciliation statuses' }, { status: 500 })
  }
}

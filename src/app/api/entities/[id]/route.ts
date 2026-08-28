import { NextRequest, NextResponse } from 'next/server'
import { getEntity, updateEntity, deleteEntity } from '@/lib/api/entities'
import { recordEntityChange } from '@/lib/api/reconciliation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const entity = await getEntity(id)

    if (!entity) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ entity })
  } catch (error) {
    console.error('Error fetching entity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entity' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Remove fields that shouldn't be updated directly
    const {
      id: entityId,
      createdAt,
      project,
      fromConnections,
      toConnections,
      reconciliationStatus,
      changeEvents,
      triggeredReconciliations,
      ...updateData
    } = body

    const before = await getEntity(id)
    if (!before) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    const updated = await updateEntity(id, updateData)
    const { affected } = await recordEntityChange(before, updated, 'user')
    // Re-read so the returned entity reflects its (possibly cleared) status
    const entity = await getEntity(id)

    return NextResponse.json({ entity, affected })
  } catch (error) {
    console.error('Error updating entity:', error)
    return NextResponse.json(
      { error: 'Failed to update entity' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteEntity(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting entity:', error)
    return NextResponse.json(
      { error: 'Failed to delete entity' },
      { status: 500 }
    )
  }
}
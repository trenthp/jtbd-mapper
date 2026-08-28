import { NextRequest, NextResponse } from 'next/server'
import { getConnection, updateConnection, deleteConnection } from '@/lib/api/connections'
import { ConnectionType, ConnectionStrength } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const connection = await getConnection(id)
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }
    return NextResponse.json({ connection })
  } catch (error) {
    console.error('Error fetching connection:', error)
    return NextResponse.json({ error: 'Failed to fetch connection' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const { connectionType, strength, rationale } = body

    if (connectionType && !Object.values(ConnectionType).includes(connectionType)) {
      return NextResponse.json({ error: 'Invalid connection type' }, { status: 400 })
    }
    if (strength && !Object.values(ConnectionStrength).includes(strength)) {
      return NextResponse.json({ error: 'Invalid connection strength' }, { status: 400 })
    }

    // Only allow editing the descriptive fields; endpoints/layers are immutable.
    const connection = await updateConnection(id, {
      ...(connectionType && { connectionType }),
      ...(strength && { strength }),
      ...(rationale !== undefined && { rationale }),
    })
    return NextResponse.json({ connection })
  } catch (error) {
    console.error('Error updating connection:', error)
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await deleteConnection(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting connection:', error)
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 })
  }
}

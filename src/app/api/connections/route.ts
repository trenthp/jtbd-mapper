import { NextRequest, NextResponse } from 'next/server'
import { createConnection, getConnectionsByProject, validateConnection } from '@/lib/api/connections'
import { ConnectionType, ConnectionStrength } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const entityId = searchParams.get('entityId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const connections = await getConnectionsByProject(projectId)

    // Filter by entity if specified
    const filteredConnections = entityId
      ? connections.filter(conn =>
          conn.fromEntityId === entityId || conn.toEntityId === entityId
        )
      : connections

    return NextResponse.json({ connections: filteredConnections })
  } catch (error) {
    console.error('Error fetching connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      projectId,
      fromEntityId,
      toEntityId,
      connectionType,
      strength,
      rationale,
      createdBy
    } = body

    if (!projectId || !fromEntityId || !toEntityId || !connectionType || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, fromEntityId, toEntityId, connectionType, createdBy' },
        { status: 400 }
      )
    }

    // Validate connection type
    if (!Object.values(ConnectionType).includes(connectionType)) {
      return NextResponse.json(
        { error: 'Invalid connection type' },
        { status: 400 }
      )
    }

    // Validate strength if provided
    if (strength && !Object.values(ConnectionStrength).includes(strength)) {
      return NextResponse.json(
        { error: 'Invalid connection strength' },
        { status: 400 }
      )
    }

    // Validate the connection is allowed
    const validation = await validateConnection(fromEntityId, toEntityId)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 400 }
      )
    }

    const connection = await createConnection({
      ...(typeof id === 'string' && { id }),
      projectId,
      fromEntityId,
      toEntityId,
      connectionType,
      strength: strength || 'MEDIUM',
      rationale,
      createdBy
    })

    return NextResponse.json({ connection }, { status: 201 })
  } catch (error) {
    console.error('Error creating connection:', error)
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    )
  }
}
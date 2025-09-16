import { NextRequest, NextResponse } from 'next/server'
import { createEntity, getEntitiesByProject } from '@/lib/api/entities'
import { createEntityWithDefaults } from '@/stores/entityStore'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const layer = searchParams.get('layer')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const entities = await getEntitiesByProject(projectId)
    
    // Filter by layer if specified
    const filteredEntities = layer 
      ? entities.filter(entity => entity.layer === parseInt(layer))
      : entities

    return NextResponse.json({ entities: filteredEntities })
  } catch (error) {
    console.error('Error fetching entities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      projectId,
      type,
      layer,
      title,
      description,
      positionX,
      positionY,
      tags,
      data
    } = body

    if (!projectId || !type || layer === undefined || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, type, layer, title' },
        { status: 400 }
      )
    }

    // Validate layer number
    if (layer < 1 || layer > 4) {
      return NextResponse.json(
        { error: 'Layer must be between 1 and 4' },
        { status: 400 }
      )
    }

    // Create entity with provided data or defaults
    const entityData = data || createEntityWithDefaults(
      type, 
      layer, 
      { x: positionX || 0, y: positionY || 0 },
      projectId
    ).data

    const entity = await createEntity({
      projectId,
      type,
      layer,
      title,
      description,
      data: entityData,
      positionX: positionX || 0,
      positionY: positionY || 0,
      tags: tags || []
    })

    return NextResponse.json({ entity }, { status: 201 })
  } catch (error) {
    console.error('Error creating entity:', error)
    return NextResponse.json(
      { error: 'Failed to create entity' },
      { status: 500 }
    )
  }
}
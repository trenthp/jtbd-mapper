import { prisma } from '@/lib/prisma'
import { LayerConnection, ConnectionType, ConnectionStrength } from '@prisma/client'
import { LayerConnectionWithEntities } from '@/lib/types'

export async function createConnection(data: {
  projectId: string
  fromEntityId: string
  toEntityId: string
  connectionType: ConnectionType
  strength?: ConnectionStrength
  rationale?: string
  createdBy: string
}): Promise<LayerConnectionWithEntities> {
  // Get the entities to determine layers
  const [fromEntity, toEntity] = await Promise.all([
    prisma.entity.findUnique({ where: { id: data.fromEntityId } }),
    prisma.entity.findUnique({ where: { id: data.toEntityId } })
  ])

  if (!fromEntity || !toEntity) {
    throw new Error('One or both entities not found')
  }

  // Allow connections between same layer or adjacent layers
  const layerDifference = Math.abs(fromEntity.layer - toEntity.layer)
  if (layerDifference > 1) {
    throw new Error('Connections can only be made between same layer or adjacent layers')
  }

  const connection = await prisma.layerConnection.create({
    data: {
      ...data,
      fromLayer: fromEntity.layer,
      toLayer: toEntity.layer,
      strength: data.strength || 'MEDIUM'
    },
    include: {
      project: true,
      fromEntity: true,
      toEntity: true
    }
  })

  return connection as LayerConnectionWithEntities
}

export async function updateConnection(
  connectionId: string,
  data: Partial<LayerConnection>
): Promise<LayerConnectionWithEntities> {
  const connection = await prisma.layerConnection.update({
    where: { id: connectionId },
    data,
    include: {
      project: true,
      fromEntity: true,
      toEntity: true
    }
  })

  return connection as LayerConnectionWithEntities
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await prisma.layerConnection.delete({
    where: { id: connectionId }
  })
}

export async function getConnection(connectionId: string): Promise<LayerConnectionWithEntities | null> {
  const connection = await prisma.layerConnection.findUnique({
    where: { id: connectionId },
    include: {
      project: true,
      fromEntity: true,
      toEntity: true
    }
  })

  return connection as LayerConnectionWithEntities | null
}

export async function getConnectionsByProject(projectId: string): Promise<LayerConnectionWithEntities[]> {
  const connections = await prisma.layerConnection.findMany({
    where: { projectId },
    include: {
      project: true,
      fromEntity: true,
      toEntity: true
    },
    orderBy: { createdAt: 'asc' }
  })

  return connections as LayerConnectionWithEntities[]
}

export async function getConnectionsForEntity(entityId: string): Promise<LayerConnectionWithEntities[]> {
  const connections = await prisma.layerConnection.findMany({
    where: {
      OR: [
        { fromEntityId: entityId },
        { toEntityId: entityId }
      ]
    },
    include: {
      project: true,
      fromEntity: true,
      toEntity: true
    },
    orderBy: { createdAt: 'asc' }
  })

  return connections as LayerConnectionWithEntities[]
}

export async function getConnectionsBetweenLayers(
  projectId: string,
  fromLayer: number,
  toLayer: number
): Promise<LayerConnectionWithEntities[]> {
  const connections = await prisma.layerConnection.findMany({
    where: {
      projectId,
      fromLayer,
      toLayer
    },
    include: {
      project: true,
      fromEntity: true,
      toEntity: true
    },
    orderBy: { createdAt: 'asc' }
  })

  return connections as LayerConnectionWithEntities[]
}

export async function validateConnection(
  fromEntityId: string,
  toEntityId: string
): Promise<{ valid: boolean; reason?: string }> {
  // Check if entities exist
  const [fromEntity, toEntity] = await Promise.all([
    prisma.entity.findUnique({ where: { id: fromEntityId } }),
    prisma.entity.findUnique({ where: { id: toEntityId } })
  ])

  if (!fromEntity || !toEntity) {
    return { valid: false, reason: 'One or both entities not found' }
  }

  // Check if they're in the same project
  if (fromEntity.projectId !== toEntity.projectId) {
    return { valid: false, reason: 'Entities must be in the same project' }
  }

  // Check same layer or adjacent layers
  const layerDifference = Math.abs(fromEntity.layer - toEntity.layer)
  if (layerDifference > 1) {
    return { valid: false, reason: 'Connections can only be made between same layer or adjacent layers' }
  }

  // Check for existing connection
  const existingConnection = await prisma.layerConnection.findFirst({
    where: {
      fromEntityId,
      toEntityId
    }
  })

  if (existingConnection) {
    return { valid: false, reason: 'Connection already exists between these entities' }
  }

  return { valid: true }
}
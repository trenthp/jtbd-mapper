import { prisma } from '@/lib/prisma'
import { EntityStatus, Prisma } from '@prisma/client'
import { EntityWithRelations } from '@/lib/types'

export async function createEntity(data: {
  projectId: string
  type: string
  layer: number
  title: string
  description?: string
  data: Prisma.InputJsonValue
  positionX: number
  positionY: number
  tags?: string[]
  status?: EntityStatus
}): Promise<EntityWithRelations> {
  const entity = await prisma.entity.create({
    data: {
      ...data,
      tags: data.tags || [],
      status: data.status || 'ACTIVE'
    },
    include: {
      project: true,
      fromConnections: true,
      toConnections: true,
      reconciliationStatus: true
    }
  })

  return entity as EntityWithRelations
}

export async function updateEntity(
  entityId: string, 
  data: Prisma.EntityUncheckedUpdateInput
): Promise<EntityWithRelations> {
  const entity = await prisma.entity.update({
    where: { id: entityId },
    data,
    include: {
      project: true,
      fromConnections: true,
      toConnections: true,
      reconciliationStatus: true
    }
  })

  return entity as EntityWithRelations
}

export async function deleteEntity(entityId: string): Promise<void> {
  await prisma.entity.delete({
    where: { id: entityId }
  })
}

export async function getEntity(entityId: string): Promise<EntityWithRelations | null> {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      project: true,
      fromConnections: true,
      toConnections: true,
      reconciliationStatus: true
    }
  })

  return entity as EntityWithRelations | null
}

export async function getEntitiesByProject(projectId: string): Promise<EntityWithRelations[]> {
  const entities = await prisma.entity.findMany({
    where: { projectId },
    include: {
      project: true,
      fromConnections: true,
      toConnections: true,
      reconciliationStatus: true
    },
    orderBy: [
      { layer: 'asc' },
      { createdAt: 'asc' }
    ]
  })

  return entities as EntityWithRelations[]
}

export async function getEntitiesByLayer(
  projectId: string, 
  layer: number
): Promise<EntityWithRelations[]> {
  const entities = await prisma.entity.findMany({
    where: { 
      projectId,
      layer 
    },
    include: {
      project: true,
      fromConnections: true,
      toConnections: true,
      reconciliationStatus: true
    },
    orderBy: { createdAt: 'asc' }
  })

  return entities as EntityWithRelations[]
}

export async function updateEntityPosition(
  entityId: string,
  position: { x: number, y: number }
): Promise<EntityWithRelations> {
  const entity = await prisma.entity.update({
    where: { id: entityId },
    data: {
      positionX: position.x,
      positionY: position.y
    },
    include: {
      project: true,
      fromConnections: true,
      toConnections: true,
      reconciliationStatus: true
    }
  })

  return entity as EntityWithRelations
}

export async function duplicateEntity(
  entityId: string,
  newPosition: { x: number, y: number }
): Promise<EntityWithRelations> {
  const originalEntity = await prisma.entity.findUnique({
    where: { id: entityId }
  })

  if (!originalEntity) {
    throw new Error('Entity not found')
  }

  const duplicatedEntity = await prisma.entity.create({
    data: {
      projectId: originalEntity.projectId,
      type: originalEntity.type,
      layer: originalEntity.layer,
      title: `${originalEntity.title} (Copy)`,
      description: originalEntity.description,
      data: originalEntity.data ?? Prisma.JsonNull,
      positionX: newPosition.x,
      positionY: newPosition.y,
      tags: originalEntity.tags ?? [],
      status: originalEntity.status
    },
    include: {
      project: true,
      fromConnections: true,
      toConnections: true,
      reconciliationStatus: true
    }
  })

  return duplicatedEntity as EntityWithRelations
}
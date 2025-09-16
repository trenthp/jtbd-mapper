import { prisma } from '@/lib/prisma'
import { Project } from '@prisma/client'

export async function createProject(data: {
  name: string
  description?: string
  framework?: string
}): Promise<Project> {
  const project = await prisma.project.create({
    data: {
      ...data,
      framework: data.framework || 'custom'
    }
  })

  return project
}

export async function updateProject(
  projectId: string,
  data: Partial<Project>
): Promise<Project> {
  const project = await prisma.project.update({
    where: { id: projectId },
    data
  })

  return project
}

export async function deleteProject(projectId: string): Promise<void> {
  await prisma.project.delete({
    where: { id: projectId }
  })
}

export async function getProject(projectId: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  })

  return project
}

export async function getAllProjects(): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return projects
}

export async function getProjectWithEntities(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      entities: {
        include: {
          fromConnections: true,
          toConnections: true,
          reconciliationStatus: true
        },
        orderBy: [
          { layer: 'asc' },
          { createdAt: 'asc' }
        ]
      },
      connections: {
        include: {
          fromEntity: true,
          toEntity: true
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  return project
}

export async function getProjectStats(projectId: string) {
  const [
    totalEntities,
    entitiesByLayer,
    totalConnections,
    unreconciledEntities,
    openConflicts
  ] = await Promise.all([
    // Total entities count
    prisma.entity.count({
      where: { projectId }
    }),
    
    // Entities grouped by layer
    prisma.entity.groupBy({
      by: ['layer'],
      where: { projectId },
      _count: { id: true }
    }),
    
    // Total connections count
    prisma.layerConnection.count({
      where: { projectId }
    }),
    
    // Unreconciled entities
    prisma.reconciliationStatus.count({
      where: {
        entity: { projectId },
        state: {
          not: 'SYNCED'
        }
      }
    }),
    
    // Open conflicts
    prisma.conflictResolution.count({
      where: {
        projectId,
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      }
    })
  ])

  const layerCounts = entitiesByLayer.reduce((acc, curr) => {
    acc[curr.layer] = curr._count.id
    return acc
  }, {} as Record<number, number>)

  return {
    totalEntities,
    entitiesByLayer: layerCounts,
    totalConnections,
    unreconciledEntities,
    openConflicts,
    lastUpdated: new Date()
  }
}
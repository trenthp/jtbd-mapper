import { NextRequest, NextResponse } from 'next/server'
import { createProject, getAllProjects } from '@/lib/api/projects'

export async function GET() {
  try {
    const projects = await getAllProjects()
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, framework } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    // Validate framework if provided
    const validFrameworks = ['kalbach', 'patton', 'covert', 'custom']
    if (framework && !validFrameworks.includes(framework)) {
      return NextResponse.json(
        { error: 'Invalid framework. Must be one of: kalbach, patton, covert, custom' },
        { status: 400 }
      )
    }

    const project = await createProject({
      name,
      description,
      framework: framework || 'custom'
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
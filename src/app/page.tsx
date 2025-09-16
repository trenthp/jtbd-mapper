import Link from 'next/link'
import { ProjectsGrid } from '@/components/Projects/ProjectsGrid'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">JTBD Mapper</h1>
              <p className="text-gray-600 mt-2">
                Map and visualize Jobs-to-be-Done across design layers
              </p>
            </div>
            <Link 
              href="/projects/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Project
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Projects</h2>
          <ProjectsGrid />
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Getting Started</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-gray-900">Layer 1: Jobs & Objectives</h4>
              <p className="text-sm text-gray-600 mt-1">
                Start with user jobs, business objectives, and secondary considerations
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-gray-900">Layer 2: Specifications</h4>
              <p className="text-sm text-gray-600 mt-1">
                Define functional specs, content requirements, and system needs
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-medium text-gray-900">Layer 3: Design</h4>
              <p className="text-sm text-gray-600 mt-1">
                Map interactions and information architecture
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

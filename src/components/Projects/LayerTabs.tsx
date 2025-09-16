'use client'

interface LayerTabsProps {
  currentLayer: number
  onLayerChange: (layer: number) => void
  entityCounts: Record<number, number>
  vertical?: boolean
}

export function LayerTabs({ currentLayer, onLayerChange, entityCounts, vertical = false }: LayerTabsProps) {
  const layers = [
    { id: 1, name: 'Jobs & Objectives', color: 'blue' },
    { id: 2, name: 'Specifications', color: 'green' },
    { id: 3, name: 'Interactions', color: 'purple' },
    { id: 4, name: 'Interface Design', color: 'orange' }
  ]

  const getColorClasses = (color: string, isActive: boolean) => {
    const baseClasses = vertical 
      ? 'px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left'
      : 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
    
    if (isActive) {
      switch (color) {
        case 'blue': return `${baseClasses} bg-blue-100 text-blue-700 border-blue-200`
        case 'green': return `${baseClasses} bg-green-100 text-green-700 border-green-200`
        case 'purple': return `${baseClasses} bg-purple-100 text-purple-700 border-purple-200`
        case 'orange': return `${baseClasses} bg-orange-100 text-orange-700 border-orange-200`
      }
    }
    
    return `${baseClasses} text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white`
  }

  return (
    <div className={vertical ? "flex flex-col gap-2 min-w-[160px]" : "flex gap-2"}>
      {layers.map((layer) => (
        <button
          key={layer.id}
          onClick={() => onLayerChange(layer.id)}
          className={`${getColorClasses(layer.color, currentLayer === layer.id)} border shadow-lg ${vertical ? 'flex flex-col items-start gap-1' : 'flex items-center gap-2'}`}
        >
          <div className={vertical ? "flex items-center justify-between w-full" : "flex items-center gap-2"}>
            <span className={vertical ? "text-xs font-medium" : ""}>{vertical ? `L${layer.id}` : layer.name}</span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded-full text-xs">
              {entityCounts[layer.id] || 0}
            </span>
          </div>
          {vertical && (
            <span className="text-xs text-gray-600 truncate w-full">{layer.name}</span>
          )}
        </button>
      ))}
    </div>
  )
}
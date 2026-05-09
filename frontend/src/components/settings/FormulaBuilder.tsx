import { useState } from 'react'
import { X } from 'lucide-react'
import type { Category, FormulaItem } from '@/types'

interface Props {
  areas: string[]
  categories: Category[]
  formula: FormulaItem[]
  onChange: (formula: FormulaItem[]) => void
}

export default function FormulaBuilder({ areas, categories, formula, onChange }: Props) {
  const [dragOverZone, setDragOverZone] = useState<'+' | '-' | null>(null)

  const inFormula = new Set(formula.map((f) => `${f.tipo}:${f.nombre}`))

  const availableAreas = areas.filter((a) => !inFormula.has(`area:${a}`))
  const availableCats = categories.filter((c) => !inFormula.has(`categoria:${c.nombre}`))

  const handleDragStart = (
    e: React.DragEvent,
    item: { tipo: 'area' | 'categoria'; nombre: string; signo?: '+' | '-' },
  ) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(item))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e: React.DragEvent, signo: '+' | '-') => {
    e.preventDefault()
    setDragOverZone(null)
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain')) as {
        tipo: 'area' | 'categoria'
        nombre: string
        signo?: '+' | '-'
      }
      if (data.signo) {
        if (data.signo === signo) return
        onChange(formula.map((f) => f.tipo === data.tipo && f.nombre === data.nombre ? { ...f, signo } : f))
      } else {
        onChange([...formula, { tipo: data.tipo, nombre: data.nombre, signo }])
      }
    } catch {
      // ignore malformed drag data
    }
  }

  const removeItem = (tipo: 'area' | 'categoria', nombre: string) => {
    onChange(formula.filter((f) => !(f.tipo === tipo && f.nombre === nombre)))
  }

  const renderFormulaItem = (item: FormulaItem) => (
    <div
      key={`${item.tipo}:${item.nombre}`}
      draggable
      onDragStart={(e) => handleDragStart(e, item)}
      className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border text-xs cursor-grab active:cursor-grabbing select-none"
    >
      <span className="text-gray-400 text-[10px]">{item.tipo === 'area' ? '▣' : '◈'}</span>
      <span className="font-medium flex-1 truncate">{item.nombre}</span>
      <button
        onClick={() => removeItem(item.tipo, item.nombre)}
        className="text-gray-400 hover:text-red-500 flex-shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )

  const renderZone = (signo: '+' | '-') => {
    const items = formula.filter((f) => f.signo === signo)
    const isOver = dragOverZone === signo
    const isPlus = signo === '+'

    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOverZone(signo) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverZone(null) }}
        onDrop={(e) => handleDrop(e, signo)}
        className={`flex-1 rounded-xl border-2 border-dashed p-2.5 transition-colors min-h-[90px] ${
          isOver
            ? isPlus ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
            : isPlus ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'
        }`}
      >
        <p className={`text-[11px] font-bold mb-1.5 ${isPlus ? 'text-green-700' : 'text-red-600'}`}>
          {isPlus ? '+ Suma' : '− Resta'}
        </p>
        <div className="space-y-1">
          {items.map(renderFormulaItem)}
          {items.length === 0 && (
            <p className="text-[11px] text-gray-400 text-center py-2">Arrastra aquí</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3" style={{ minHeight: 200 }}>
      {/* Panel izquierdo: disponibles */}
      <div className="w-[45%] border rounded-xl p-2.5 overflow-y-auto" style={{ maxHeight: 240 }}>
        <p className="text-[11px] font-semibold text-gray-500 mb-2">Disponibles</p>

        {availableAreas.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Áreas</p>
            <div className="space-y-1">
              {availableAreas.map((a) => (
                <div
                  key={`area:${a}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, { tipo: 'area', nombre: a })}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs cursor-grab active:cursor-grabbing select-none transition-colors"
                >
                  <span className="text-blue-400 text-[10px]">▣</span>
                  <span className="truncate">{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {availableCats.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Categorías</p>
            <div className="space-y-1">
              {availableCats.map((c) => (
                <div
                  key={`categoria:${c.nombre}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, { tipo: 'categoria', nombre: c.nombre })}
                  className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs cursor-grab active:cursor-grabbing select-none transition-colors"
                >
                  <span>{c.emoji}</span>
                  <span className="truncate">{c.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {availableAreas.length === 0 && availableCats.length === 0 && (
          <p className="text-[11px] text-gray-400 text-center py-4">Todo añadido</p>
        )}
      </div>

      {/* Panel derecho: zonas + y - */}
      <div className="flex-1 flex flex-col gap-2">
        {renderZone('+')}
        {renderZone('-')}
      </div>
    </div>
  )
}

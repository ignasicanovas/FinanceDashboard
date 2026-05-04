import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/hooks/useTags'

interface TagsPanelProps {
  accountId: number
}

const DEFAULT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export default function TagsPanel({ accountId }: TagsPanelProps) {
  const { data: tags = [] } = useTags(accountId)
  const createTag = useCreateTag(accountId)
  const updateTag = useUpdateTag(accountId)
  const deleteTag = useDeleteTag(accountId)

  const [newNombre, setNewNombre] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')

  const handleCreate = async () => {
    if (!newNombre.trim()) return
    try {
      await createTag.mutateAsync({ nombre: newNombre.trim(), color: newColor })
      setNewNombre('')
      setNewColor('#6366f1')
      toast.success('Tag creado')
    } catch {
      toast.error('Error al crear el tag')
    }
  }

  const handleDelete = async (nombre: string) => {
    if (!confirm(`¿Eliminar el tag "${nombre}"? Se eliminará de todas las transacciones.`)) return
    try {
      await deleteTag.mutateAsync(nombre)
      toast.success('Tag eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleColorChange = async (nombre: string, color: string) => {
    await updateTag.mutateAsync({ nombre, color })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-4">
          Los tags permiten agrupar transacciones de distintas categorías. Por ejemplo, "viajes" puede incluir vuelos, hoteles y restaurantes.
        </p>
      </div>

      {/* Existing tags */}
      <div className="space-y-2">
        {tags.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No hay tags creados</p>
        ) : (
          tags.map((tag) => (
            <div key={tag.nombre} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 group border">
              <div className="flex gap-1.5 flex-wrap">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorChange(tag.nombre, c)}
                    className={`w-5 h-5 rounded-full transition-transform ${tag.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={tag.color}
                  onChange={(e) => handleColorChange(tag.nombre, e.target.value)}
                  className="w-5 h-5 rounded-full cursor-pointer border border-gray-300"
                />
              </div>
              <span
                className="inline-flex items-center px-2.5 py-1 rounded text-sm font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.nombre}
              </span>
              <div className="flex-1" />
              <button
                onClick={() => handleDelete(tag.nombre)}
                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create new tag */}
      <div className="border-t pt-4 space-y-3">
        <Label className="text-sm font-semibold">Nuevo tag</Label>
        <div className="flex gap-2">
          <Input
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
            placeholder="Ej: viajes, regalo, trabajo..."
            className="text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button variant="outline" onClick={handleCreate} disabled={!newNombre.trim() || createTag.isPending}>
            <Plus className="w-4 h-4 mr-1" />
            Crear
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border border-gray-300"
          />
        </div>
        {newNombre && (
          <div className="text-sm text-gray-500">
            Vista previa:{' '}
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: newColor }}
            >
              {newNombre}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

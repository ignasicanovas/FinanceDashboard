import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useCategories, useAreas, useCreateCategory, useUpdateCategory,
  useDeleteCategory, useCreateArea, useDeleteArea,
} from '@/hooks/useCategories'
import type { Category } from '@/types'

interface CategoriesPanelProps {
  accountId: number
}

const DEFAULT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export default function CategoriesPanel({ accountId }: CategoriesPanelProps) {
  const { data: categories = [] } = useCategories(accountId)
  const { data: areas = [] } = useAreas(accountId)
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newArea, setNewArea] = useState('')
  const [catForm, setCatForm] = useState({ nombre: '', color: '#6366f1', emoji: '🏷️', supercategoria: 'Otros' })

  const createCategory = useCreateCategory(accountId)
  const updateCategory = useUpdateCategory(accountId)
  const deleteCategory = useDeleteCategory(accountId)
  const createArea = useCreateArea(accountId)
  const deleteArea = useDeleteArea(accountId)

  const filteredCats = selectedArea
    ? categories.filter((c) => c.supercategoria === selectedArea)
    : categories

  const openEdit = (cat: Category) => {
    setEditingCat(cat)
    setCatForm({ nombre: cat.nombre, color: cat.color, emoji: cat.emoji, supercategoria: cat.supercategoria })
  }

  const handleSaveCategory = async () => {
    if (editingCat) {
      await updateCategory.mutateAsync({
        nombre: editingCat.nombre,
        data: { color: catForm.color, emoji: catForm.emoji, supercategoria: catForm.supercategoria },
      })
      toast.success('Categoría actualizada')
    } else {
      await createCategory.mutateAsync(catForm)
      toast.success('Categoría creada')
    }
    setEditingCat(null)
    setShowNewCat(false)
  }

  const handleDeleteCat = async (nombre: string) => {
    if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return
    try {
      await deleteCategory.mutateAsync(nombre)
      toast.success('Categoría eliminada')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar'
      toast.error(msg)
    }
  }

  const handleCreateArea = async () => {
    if (!newArea.trim()) return
    await createArea.mutateAsync(newArea.trim())
    setNewArea('')
    toast.success('Área creada')
  }

  const handleDeleteArea = async (nombre: string) => {
    if (!confirm(`¿Eliminar el área "${nombre}"? Las categorías se moverán a "Otros".`)) return
    await deleteArea.mutateAsync(nombre)
    toast.success('Área eliminada')
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Areas column */}
      <div className="lg:w-56 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700">Áreas</h3>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedArea(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              !selectedArea ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
            }`}
          >
            Todas las categorías
          </button>
          {areas.map((area) => (
            <div key={area} className={`flex items-center rounded-lg ${selectedArea === area ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <button
                onClick={() => setSelectedArea(area)}
                className={`flex-1 text-left px-3 py-2 text-sm ${selectedArea === area ? 'text-blue-700 font-medium' : ''}`}
              >
                {area}
              </button>
              {!['No computable', 'Otros'].includes(area) && (
                <button onClick={() => handleDeleteArea(area)} className="px-2 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Input
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            placeholder="Nueva área..."
            className="text-sm h-8"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateArea()}
          />
          <Button size="sm" variant="outline" onClick={handleCreateArea} className="h-8 px-2">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Categories column */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">
            Categorías {selectedArea ? `en "${selectedArea}"` : ''}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCatForm({ nombre: '', color: '#6366f1', emoji: '🏷️', supercategoria: selectedArea || 'Otros' })
              setEditingCat(null)
              setShowNewCat(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva
          </Button>
        </div>

        <div className="space-y-1">
          {filteredCats.map((cat) => (
            <div key={cat.nombre} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 group">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-lg flex-shrink-0">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">{cat.nombre}</span>
              </div>
              <Badge variant="secondary" className="text-xs hidden sm:flex">{cat.supercategoria}</Badge>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(cat)} className="p-1 text-gray-400 hover:text-blue-600">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {!['No computable', 'Otros'].includes(cat.nombre) && (
                  <button onClick={() => handleDeleteCat(cat.nombre)} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category form dialog */}
      <Dialog open={showNewCat || !!editingCat} onOpenChange={(o) => { if (!o) { setShowNewCat(false); setEditingCat(null) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingCat && (
              <div className="flex gap-2">
                <div className="w-20">
                  <Label>Emoji</Label>
                  <Input value={catForm.emoji} onChange={(e) => setCatForm({ ...catForm, emoji: e.target.value })} className="text-center text-xl" />
                </div>
                <div className="flex-1">
                  <Label>Nombre</Label>
                  <Input value={catForm.nombre} onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })} placeholder="Ej: Supermercado" />
                </div>
              </div>
            )}
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCatForm({ ...catForm, color: c })}
                    className={`w-7 h-7 rounded-full transition-transform ${catForm.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={catForm.color}
                  onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                  className="w-7 h-7 rounded-full cursor-pointer border border-gray-300"
                />
              </div>
            </div>
            <div>
              <Label>Área</Label>
              <Select value={catForm.supercategoria} onValueChange={(v) => setCatForm({ ...catForm, supercategoria: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowNewCat(false); setEditingCat(null) }}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSaveCategory}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

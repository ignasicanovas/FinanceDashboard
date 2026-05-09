import { useState, useRef, useMemo } from 'react'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useKpis, useCreateKpi, useUpdateKpi, useDeleteKpi, useReorderKpis } from '@/hooks/useKpis'
import { useAreas, useCategories } from '@/hooks/useCategories'
import type { Kpi } from '@/types'

interface KpiPanelProps {
  accountId: number
}

const EMOJIS = ['📊', '💰', '🏠', '🛒', '📈', '⚖️', '🍽️', '🚗', '✈️', '🎮', '💊', '📚']

const emptyForm = () => ({
  label: '',
  emoji: '📊',
  orden: 99,
  areas: [] as string[],
  categorias: [] as string[],
})

export default function KpiPanel({ accountId }: KpiPanelProps) {
  const { data: kpis = [] } = useKpis(accountId)
  const { data: areas = [] } = useAreas(accountId)
  const { data: categories = [] } = useCategories(accountId)
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(emptyForm())

  const dragId = useRef<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  const createKpi = useCreateKpi(accountId)
  const updateKpi = useUpdateKpi(accountId)
  const deleteKpi = useDeleteKpi(accountId)
  const reorderKpis = useReorderKpis(accountId)

  const areaGroups = useMemo(() =>
    areas
      .filter((a) => a !== 'No computable')
      .map((a) => ({
        area: a,
        cats: categories.filter((c) => c.supercategoria === a),
      }))
      .filter((g) => g.cats.length > 0),
    [areas, categories],
  )

  const openNew = () => {
    setForm({ ...emptyForm(), orden: kpis.length + 1 })
    setEditingKpi(null)
    setShowNew(true)
  }

  const openEdit = (kpi: Kpi) => {
    setEditingKpi(kpi)
    setForm({
      label: kpi.label,
      emoji: kpi.emoji,
      orden: kpi.orden,
      areas: kpi.areas_list,
      categorias: kpi.categorias_list,
      desde_ahorro: kpi.desde_ahorro ?? 0,
    })
    setShowNew(true)
  }

  const handleSave = async () => {
    if (!form.label.trim()) { toast.error('La etiqueta es obligatoria'); return }
    try {
      const payload = {
        label: form.label.trim(),
        emoji: form.emoji,
        orden: form.orden,
        areas: form.areas,
        categorias: form.categorias,
        desde_ahorro: form.desde_ahorro,
      }
      if (editingKpi) {
        await updateKpi.mutateAsync({ kpiId: editingKpi.id, data: payload })
        toast.success('KPI actualizado')
      } else {
        await createKpi.mutateAsync(payload)
        toast.success('KPI creado')
      }
      setShowNew(false)
      setEditingKpi(null)
    } catch {
      toast.error('Error al guardar KPI')
    }
  }

  const handleDelete = async (kpiId: number, label: string) => {
    if (!confirm(`¿Eliminar el KPI "${label}"?`)) return
    await deleteKpi.mutateAsync(kpiId)
    toast.success('KPI eliminado')
  }

  const toggleArea = (area: string) => {
    setForm((f) => {
      const areaSelected = f.areas.includes(area)
      const catNombres = categories.filter((c) => c.supercategoria === area).map((c) => c.nombre)
      if (areaSelected) {
        return { ...f, areas: f.areas.filter((a) => a !== area) }
      } else {
        return {
          ...f,
          areas: [...f.areas, area],
          categorias: f.categorias.filter((c) => !catNombres.includes(c)),
        }
      }
    })
  }

  const toggleCategoria = (nombre: string, supercategoria: string) => {
    setForm((f) => {
      if (f.areas.includes(supercategoria)) {
        const catNombres = categories
          .filter((c) => c.supercategoria === supercategoria && c.nombre !== nombre)
          .map((c) => c.nombre)
        return {
          ...f,
          areas: f.areas.filter((a) => a !== supercategoria),
          categorias: [...f.categorias.filter((c) => {
            const cat = categories.find((x) => x.nombre === c)
            return cat?.supercategoria !== supercategoria
          }), ...catNombres],
        }
      }
      return {
        ...f,
        categorias: f.categorias.includes(nombre)
          ? f.categorias.filter((c) => c !== nombre)
          : [...f.categorias, nombre],
      }
    })
  }

  const handleDragStart = (id: number) => { dragId.current = id }
  const handleDragOver = (e: React.DragEvent, id: number) => { e.preventDefault(); setDragOverId(id) }
  const handleDragEnd = () => { dragId.current = null; setDragOverId(null) }
  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    setDragOverId(null)
    const sourceId = dragId.current
    if (sourceId === null || sourceId === targetId) return
    const ids = kpis.map((k) => k.id)
    const newIds = [...ids]
    newIds.splice(ids.indexOf(sourceId), 1)
    newIds.splice(ids.indexOf(targetId), 0, sourceId)
    try {
      await reorderKpis.mutateAsync(newIds)
    } catch {
      toast.error('Error al reordenar KPIs')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Indicadores de balance (ingresos − gastos) por categorías.</p>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" />
          Nuevo KPI
        </Button>
      </div>

      <div className="space-y-2">
        {kpis.map((kpi) => {
          const tags = [...kpi.areas_list, ...kpi.categorias_list]
          return (
            <div
              key={kpi.id}
              draggable
              onDragStart={() => handleDragStart(kpi.id)}
              onDragOver={(e) => handleDragOver(e, kpi.id)}
              onDrop={(e) => handleDrop(e, kpi.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 bg-white rounded-xl border hover:shadow-sm group transition-all cursor-grab active:cursor-grabbing ${dragOverId === kpi.id ? 'border-blue-400 bg-blue-50' : ''}`}
            >
              <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <span className="text-xl flex-shrink-0">{kpi.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{kpi.label}</p>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {kpi.desde_ahorro === 1 && (
                    <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-300">💡 Ahorro</Badge>
                  )}
                  {tags.length === 0 && !kpi.desde_ahorro
                    ? <Badge variant="secondary" className="text-xs">Todas las categorías</Badge>
                    : tags.slice(0, 4).map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))
                  }
                  {tags.length > 4 && (
                    <Badge variant="outline" className="text-xs text-gray-400">+{tags.length - 4}</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(kpi)} className="p-1.5 text-gray-400 hover:text-blue-600">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(kpi.id, kpi.label)} className="p-1.5 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
        {kpis.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Sin KPIs configurados</p>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={(o) => { if (!o) { setShowNew(false); setEditingKpi(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingKpi ? 'Editar KPI' : 'Nuevo KPI'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Emoji</Label>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setForm({ ...form, emoji: e })}
                    className={`w-8 h-8 rounded text-lg transition-all ${form.emoji === e ? 'bg-blue-100 ring-2 ring-blue-300' : 'hover:bg-gray-100'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Etiqueta</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Ej: Gastos del hogar"
                className="mt-1"
              />
            </div>

            <div>
              <Label>
                Categorías incluidas
                <span className="ml-1 text-xs font-normal text-gray-400">(vacío = todas)</span>
              </Label>
              <div className="mt-2 border rounded-xl overflow-y-auto" style={{ maxHeight: 260 }}>
                {/* Opción especial: gastos de ahorro */}
                <div className={areaGroups.length > 0 ? "border-b" : ""}>
                  <div
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 cursor-pointer select-none"
                    onClick={() => setForm((f) => ({ ...f, desde_ahorro: f.desde_ahorro ? 0 : 1 }))}
                  >
                    <Checkbox
                      checked={form.desde_ahorro === 1}
                      onCheckedChange={() => setForm((f) => ({ ...f, desde_ahorro: f.desde_ahorro ? 0 : 1 }))}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-xs font-semibold text-indigo-700 flex-1">💡 Gastos de ahorro</span>
                    {form.desde_ahorro === 1 && (
                      <span className="text-[10px] text-indigo-400 italic">incluidos</span>
                    )}
                  </div>
                </div>
                {areaGroups.map(({ area, cats }, idx) => {
                  const areaChecked = form.areas.includes(area)
                  return (
                    <div key={area} className={idx > 0 ? 'border-t' : ''}>
                      <div
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer select-none"
                        onClick={() => toggleArea(area)}
                      >
                        <Checkbox
                          checked={areaChecked}
                          onCheckedChange={() => toggleArea(area)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex-1">
                          {area}
                        </span>
                        {areaChecked && (
                          <span className="text-[10px] text-gray-400 italic">todas</span>
                        )}
                      </div>
                      {!areaChecked && cats.length > 0 && (
                        <div className="px-3 py-1.5 space-y-1">
                          {cats.map((cat) => {
                            const catChecked = form.categorias.includes(cat.nombre)
                            return (
                              <div
                                key={cat.nombre}
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => toggleCategoria(cat.nombre, area)}
                              >
                                <Checkbox
                                  checked={catChecked}
                                  onCheckedChange={() => toggleCategoria(cat.nombre, area)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <label className="text-xs cursor-pointer flex items-center gap-1.5 select-none">
                                  <span>{cat.emoji}</span>
                                  <span>{cat.nombre}</span>
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowNew(false); setEditingKpi(null) }}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

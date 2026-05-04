import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useKpis, useCreateKpi, useUpdateKpi, useDeleteKpi, useReorderKpis } from '@/hooks/useKpis'
import { useAreas } from '@/hooks/useCategories'
import type { Kpi } from '@/types'

interface KpiPanelProps {
  accountId: number
}

const EMOJIS = ['📊', '💰', '🏠', '🛒', '📈', '⚖️', '🍽️', '🚗', '✈️', '🎮', '💊', '📚']

const TIPO_LABELS: Record<string, string> = {
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  balance: 'Balance',
  ahorro: 'Ahorro',
  neto: 'Neto',
}

type FormTipo = 'gasto' | 'ingreso' | 'balance' | 'ahorro' | 'neto'

export default function KpiPanel({ accountId }: KpiPanelProps) {
  const { data: kpis = [] } = useKpis(accountId)
  const { data: areas = [] } = useAreas(accountId)
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    label: '',
    emoji: '📊',
    tipo: 'gasto' as FormTipo,
    orden: 99,
    areas: [] as string[],
    compensacion_filtro: undefined as string | undefined,
    kpis_ref: [] as number[],
  })

  // Drag & drop state
  const dragId = useRef<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  const createKpi = useCreateKpi(accountId)
  const updateKpi = useUpdateKpi(accountId)
  const deleteKpi = useDeleteKpi(accountId)
  const reorderKpis = useReorderKpis(accountId)

  const openNew = () => {
    setForm({ label: '', emoji: '📊', tipo: 'gasto', orden: kpis.length + 1, areas: [], compensacion_filtro: undefined, kpis_ref: [] })
    setEditingKpi(null)
    setShowNew(true)
  }

  const openEdit = (kpi: Kpi) => {
    setEditingKpi(kpi)
    setForm({
      label: kpi.label,
      emoji: kpi.emoji,
      tipo: kpi.tipo as FormTipo,
      orden: kpi.orden,
      areas: kpi.areas_list,
      compensacion_filtro: kpi.compensacion_filtro,
      kpis_ref: kpi.kpis_ref_list,
    })
    setShowNew(true)
  }

  const handleSave = async () => {
    try {
      const payload = {
        label: form.label,
        emoji: form.emoji,
        tipo: form.tipo,
        orden: form.orden,
        areas: form.areas,
        compensacion_filtro: form.compensacion_filtro,
        kpis_ref: form.kpis_ref,
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
    setForm((f) => ({
      ...f,
      areas: f.areas.includes(area) ? f.areas.filter((a) => a !== area) : [...f.areas, area],
    }))
  }

  const toggleKpiRef = (id: number) => {
    setForm((f) => ({
      ...f,
      kpis_ref: f.kpis_ref.includes(id) ? f.kpis_ref.filter((k) => k !== id) : [...f.kpis_ref, id],
    }))
  }

  // Drag & drop handlers
  const handleDragStart = (id: number) => {
    dragId.current = id
  }

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault()
    setDragOverId(id)
  }

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    setDragOverId(null)
    const sourceId = dragId.current
    if (sourceId === null || sourceId === targetId) return
    const ids = kpis.map((k) => k.id)
    const sourceIdx = ids.indexOf(sourceId)
    const targetIdx = ids.indexOf(targetId)
    const newIds = [...ids]
    newIds.splice(sourceIdx, 1)
    newIds.splice(targetIdx, 0, sourceId)
    try {
      await reorderKpis.mutateAsync(newIds)
    } catch {
      toast.error('Error al reordenar KPIs')
    }
  }

  const handleDragEnd = () => {
    dragId.current = null
    setDragOverId(null)
  }

  // KPIs available as references (non-neto, and not the one being edited)
  const refCandidates = kpis.filter(
    (k) => k.tipo !== 'neto' && (!editingKpi || k.id !== editingKpi.id),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Indicadores que se muestran en la parte superior de la cuenta.</p>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" />
          Nuevo KPI
        </Button>
      </div>

      <div className="space-y-2">
        {kpis.map((kpi) => (
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
                <Badge variant="secondary" className="text-xs">
                  {TIPO_LABELS[kpi.tipo] ?? kpi.tipo}
                </Badge>
                {kpi.areas_list.map((a) => (
                  <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                ))}
                {kpi.tipo === 'neto' && kpi.kpis_ref_list.length > 0 && (
                  <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                    {kpi.kpis_ref_list.length} ref{kpi.kpis_ref_list.length > 1 ? 's' : ''}
                  </Badge>
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
        ))}
        {kpis.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Sin KPIs configurados</p>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={(o) => { if (!o) { setShowNew(false); setEditingKpi(null) } }}>
        <DialogContent className="sm:max-w-sm">
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
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ej: Gastos corrientes" className="mt-1" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as FormTipo, kpis_ref: [] })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasto">Gasto (suma de gastos)</SelectItem>
                  <SelectItem value="ingreso">Ingreso (suma de ingresos)</SelectItem>
                  <SelectItem value="balance">Balance neto</SelectItem>
                  <SelectItem value="ahorro">Gasto de ahorro</SelectItem>
                  <SelectItem value="neto">Neto entre KPIs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.tipo !== 'neto' && (
              <div>
                <Label>Áreas incluidas (vacío = todas)</Label>
                <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                  {areas.map((area) => (
                    <div key={area} className="flex items-center gap-2">
                      <Checkbox
                        id={`area-${area}`}
                        checked={form.areas.includes(area)}
                        onCheckedChange={() => toggleArea(area)}
                      />
                      <Label htmlFor={`area-${area}`} className="text-sm cursor-pointer">{area}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.tipo === 'neto' && (
              <div>
                <Label>KPIs de referencia</Label>
                <p className="text-xs text-gray-500 mb-2">Los gastos y ahorros se restan; los ingresos y balances se suman.</p>
                <div className="mt-1 space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {refCandidates.length === 0 && (
                    <p className="text-xs text-gray-400 py-2 text-center">No hay KPIs disponibles</p>
                  )}
                  {refCandidates.map((k) => (
                    <div key={k.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`kref-${k.id}`}
                        checked={form.kpis_ref.includes(k.id)}
                        onCheckedChange={() => toggleKpiRef(k.id)}
                      />
                      <Label htmlFor={`kref-${k.id}`} className="text-sm cursor-pointer flex items-center gap-1.5">
                        <span>{k.emoji}</span>
                        <span>{k.label}</span>
                        <span className="text-xs text-gray-400">({TIPO_LABELS[k.tipo] ?? k.tipo})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowNew(false); setEditingKpi(null) }}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

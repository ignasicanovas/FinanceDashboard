import { useState } from 'react'
import { CalendarDays, SlidersHorizontal, ChevronDown, ChevronUp, X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import KpiBar from './KpiBar'
import MonthlySummaryChart from './charts/MonthlySummaryChart'
import MonthlyLineChart from './charts/MonthlyLineChart'
import CategoryPieChart from './charts/CategoryPieChart'
import AreaBreakdownChart from './charts/AreaBreakdownChart'
import TopComerciosChart from './charts/TopComerciosChart'
import TransactionDrilldown, { type DrilldownTarget } from './TransactionDrilldown'
import { useCategories, useAreas } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'

interface ChartsViewProps {
  accountId: number
  fechaDesde?: string
  fechaHasta?: string
  selectedAreas?: string[]
  selectedCats?: string[]
  selectedTags?: string[]
  onDateChange: (desde?: string, hasta?: string) => void
  onFilterChange?: (areas: string[], cats: string[], tags: string[]) => void
}

function getPresetRange(preset: string): { desde?: string; hasta?: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = fmt(now)

  if (preset === 'year') return { desde: `${now.getFullYear()}-01-01`, hasta: today }
  if (preset === '1m') return { desde: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, hasta: today }
  if (preset === '6m') { const d = new Date(now); d.setMonth(d.getMonth() - 6); return { desde: fmt(d), hasta: today } }
  if (preset === '12m') { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return { desde: fmt(d), hasta: today } }
  return { desde: undefined, hasta: undefined }
}

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

export default function ChartsView({ accountId, fechaDesde, fechaHasta, selectedAreas = [], selectedCats = [], selectedTags = [], onDateChange, onFilterChange }: ChartsViewProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [drilldown, setDrilldown] = useState<DrilldownTarget | null>(null)

  const { data: categories = [] } = useCategories(accountId)
  const { data: areas = [] } = useAreas(accountId)
  const { data: tags = [] } = useTags(accountId)

  const handlePreset = (preset: string) => {
    const { desde, hasta } = getPresetRange(preset)
    onDateChange(desde, hasta)
  }

  const activePreset = (() => {
    if (!fechaDesde && !fechaHasta) return 'all'
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const firstOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    if (fechaDesde === `${now.getFullYear()}-01-01` && fechaHasta === today) return 'year'
    if (fechaDesde === firstOfMonth && fechaHasta === today) return '1m'
    return 'custom'
  })()

  const presets = [
    { key: 'all', label: 'Todo' },
    { key: 'year', label: 'Este año' },
    { key: '1m', label: 'Este mes' },
    { key: '6m', label: 'Últimos 6 meses' },
    { key: '12m', label: 'Últimos 12 meses' },
  ]

  // Pass as comma-separated to chart components (backend splits them)
  const areaParam = selectedAreas.length > 0 ? selectedAreas.join(',') : undefined
  const catParam = selectedCats.length > 0 ? selectedCats.join(',') : undefined
  const tagParam = selectedTags.length > 0 ? selectedTags.join(',') : undefined
  const hasFilter = selectedAreas.length > 0 || selectedCats.length > 0 || selectedTags.length > 0

  const setSelectedAreas = (areas: string[]) => onFilterChange?.(areas, selectedCats, selectedTags)
  const setSelectedCats = (cats: string[]) => onFilterChange?.(selectedAreas, cats, selectedTags)
  const setSelectedTags = (tags: string[]) => onFilterChange?.(selectedAreas, selectedCats, tags)
  const clearFilters = () => onFilterChange?.([], [], [])

  const resetAll = () => {
    onFilterChange?.([], [], [])
    handlePreset('1m')
  }

  return (
    <div className="space-y-6">
      {/* Date range bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border">
        <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex gap-1 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                activePreset === p.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <input
            type="date"
            value={fechaDesde || ''}
            onChange={(e) => onDateChange(e.target.value || undefined, fechaHasta)}
            className="text-xs border rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-gray-400 text-xs">—</span>
          <input
            type="date"
            value={fechaHasta || ''}
            onChange={(e) => onDateChange(fechaDesde, e.target.value || undefined)}
            className="text-xs border rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={resetAll}
            title="Resetear filtros (mes actual)"
            className="ml-1 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Area / category filter panel */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filtros de área, categoría y tags</span>
          {hasFilter && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
              {selectedAreas.length + selectedCats.length + selectedTags.length}
            </span>
          )}
          {showFilters ? (
            <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
          )}
        </button>

        {showFilters && (
          <div className="border-t px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Areas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Área</p>
                  {selectedAreas.length > 0 && (
                    <button onClick={() => setSelectedAreas([])} className="text-xs text-gray-400 hover:text-gray-600">
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {areas.map((a) => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedAreas.includes(a)}
                        onChange={() => setSelectedAreas(toggle(selectedAreas, a))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={cn(
                        'text-sm transition-colors',
                        selectedAreas.includes(a) ? 'text-blue-700 font-medium' : 'text-gray-600 group-hover:text-gray-900'
                      )}>{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categoría</p>
                  {selectedCats.length > 0 && (
                    <button onClick={() => setSelectedCats([])} className="text-xs text-gray-400 hover:text-gray-600">
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {categories.map((c) => (
                    <label key={c.nombre} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedCats.includes(c.nombre)}
                        onChange={() => setSelectedCats(toggle(selectedCats, c.nombre))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className={cn(
                        'text-sm transition-colors',
                        selectedCats.includes(c.nombre) ? 'text-blue-700 font-medium' : 'text-gray-600 group-hover:text-gray-900'
                      )}>{c.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {tags.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tags</p>
                  {selectedTags.length > 0 && (
                    <button onClick={() => setSelectedTags([])} className="text-xs text-gray-400 hover:text-gray-600">
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {tags.map((t) => (
                    <label key={t.nombre} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(t.nombre)}
                        onChange={() => setSelectedTags(toggle(selectedTags, t.nombre))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                      <span className={cn(
                        'text-sm transition-colors',
                        selectedTags.includes(t.nombre) ? 'text-blue-700 font-medium' : 'text-gray-600 group-hover:text-gray-900'
                      )}>{t.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {hasFilter && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {[
                    selectedAreas.length > 0 && `${selectedAreas.length} área${selectedAreas.length > 1 ? 's' : ''}`,
                    selectedCats.length > 0 && `${selectedCats.length} categoría${selectedCats.length > 1 ? 's' : ''}`,
                    selectedTags.length > 0 && `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''}`,
                  ].filter(Boolean).join(', ')} seleccionado{selectedAreas.length + selectedCats.length + selectedTags.length > 1 ? 's' : ''}
                </span>
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 ml-auto">
                  <X className="w-3 h-3" />
                  Limpiar todo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <KpiBar accountId={accountId} fechaDesde={fechaDesde} fechaHasta={fechaHasta} area={areaParam} categoria={catParam} tag={tagParam} onDrilldown={setDrilldown} />

      <MonthlyLineChart accountId={accountId} fechaDesde={fechaDesde} fechaHasta={fechaHasta} area={areaParam} categoria={catParam} tag={tagParam} onDrilldown={setDrilldown} />

      <MonthlySummaryChart accountId={accountId} fechaDesde={fechaDesde} fechaHasta={fechaHasta} area={areaParam} categoria={catParam} tag={tagParam} onDrilldown={setDrilldown} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryPieChart accountId={accountId} fecha_desde={fechaDesde} fecha_hasta={fechaHasta} area={areaParam} categoria={catParam} tag={tagParam} onDrilldown={setDrilldown} />
        <AreaBreakdownChart accountId={accountId} fechaDesde={fechaDesde} fechaHasta={fechaHasta} area={areaParam} categoria={catParam} tag={tagParam} onDrilldown={setDrilldown} />
      </div>

      <TopComerciosChart accountId={accountId} fechaDesde={fechaDesde} fechaHasta={fechaHasta} area={areaParam} categoria={catParam} tag={tagParam} onDrilldown={setDrilldown} />

      <TransactionDrilldown target={drilldown} onClose={() => setDrilldown(null)} />
    </div>
  )
}

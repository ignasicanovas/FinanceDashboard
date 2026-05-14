import { useState, useRef } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { useCategories, useAreas } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import { cn } from '@/lib/utils'
import type { TransactionFilters } from '@/types'

interface FilterSidebarProps {
  accountId: number
  filters: TransactionFilters
  onChange: (filters: TransactionFilters) => void
}

const NOMINA_KW_KEY = 'nomina_keyword'

export default function FilterSidebar({ accountId, filters, onChange }: FilterSidebarProps) {
  const [open, setOpen] = useState(true)
  const { data: categories = [] } = useCategories(accountId)
  const { data: areas = [] } = useAreas(accountId)
  const { data: tags = [] } = useTags(accountId)

  // Keyword persisted in localStorage; checkbox active when paycheck_keyword is set in filters
  const [nominaKw, setNominaKw] = useState<string>(
    () => filters.paycheck_keyword || localStorage.getItem(NOMINA_KW_KEY) || ''
  )
  const nominaActive = !!filters.paycheck_keyword
  const nominaDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = (patch: Partial<TransactionFilters>) =>
    onChange({ ...filters, ...patch, page: 1 })

  const selectedAreas = (filters.area || '').split(',').filter(Boolean)
  const selectedCats = (filters.categoria || '').split(',').filter(Boolean)
  const selectedTags = (filters.tag || '').split(',').filter(Boolean)

  const toggleArea = (area: string) => {
    const next = selectedAreas.includes(area)
      ? selectedAreas.filter((a) => a !== area)
      : [...selectedAreas, area]
    update({ area: next.join(',') || undefined })
  }
  const toggleCat = (cat: string) => {
    const next = selectedCats.includes(cat)
      ? selectedCats.filter((c) => c !== cat)
      : [...selectedCats, cat]
    update({ categoria: next.join(',') || undefined })
  }
  const toggleTag = (t: string) => {
    const next = selectedTags.includes(t)
      ? selectedTags.filter((x) => x !== t)
      : [...selectedTags, t]
    update({ tag: next.join(',') || undefined })
  }

  const reset = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const firstOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    onChange({
      fecha_desde: firstOfMonth,
      fecha_hasta: today,
      page: 1,
      per_page: filters.per_page,
    })
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden flex items-center gap-2 text-sm text-blue-600 font-medium"
        onClick={() => setOpen((o) => !o)}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filtros
      </button>

      <aside
        className={cn(
          'bg-white rounded-xl border p-4 space-y-5 w-full lg:w-56 xl:w-64 flex-shrink-0',
          !open && 'hidden lg:block'
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">Filtros</h3>
          <button onClick={reset} className="text-xs text-blue-600 hover:underline">
            Limpiar
          </button>
        </div>

        {/* Date range */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-500 uppercase tracking-wide">Período</Label>
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'all', label: 'Todo' },
              { key: 'year', label: 'Este año' },
              { key: '1m', label: 'Este mes' },
              { key: '6m', label: '6 meses' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  const now = new Date()
                  const pad = (n: number) => String(n).padStart(2, '0')
                  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
                  const today = fmt(now)
                  if (p.key === 'all') update({ fecha_desde: undefined, fecha_hasta: undefined })
                  else if (p.key === 'year') update({ fecha_desde: `${now.getFullYear()}-01-01`, fecha_hasta: today })
                  else if (p.key === '1m') update({ fecha_desde: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, fecha_hasta: today })
                  else if (p.key === '6m') { const d = new Date(now); d.setMonth(d.getMonth() - 6); update({ fecha_desde: fmt(d), fecha_hasta: today }) }
                }}
                className="px-2 py-0.5 text-xs rounded border bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Input
              type="date"
              value={filters.fecha_desde || ''}
              onChange={(e) => update({ fecha_desde: e.target.value || undefined })}
              className="text-sm"
            />
            <Input
              type="date"
              value={filters.fecha_hasta || ''}
              onChange={(e) => update({ fecha_hasta: e.target.value || undefined })}
              className="text-sm"
            />
          </div>
        </div>

        <Separator />

        {/* Gastos de ahorro */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-500 uppercase tracking-wide">Gastos de ahorro</Label>
          <div className="flex rounded-lg border overflow-hidden text-xs">
            {([
              { label: 'Todos', value: undefined },
              { label: 'Solo', value: 1 },
              { label: 'Sin', value: 0 },
            ] as { label: string; value: number | undefined }[]).map(({ label, value }) => (
              <button
                key={label}
                onClick={() => update({ desde_ahorro: value })}
                className={`flex-1 px-2 py-1 transition-colors ${filters.desde_ahorro === value ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Desde la última nómina */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="nomina_filter"
              checked={nominaActive}
              onCheckedChange={(checked) => {
                if (checked && nominaKw) {
                  update({ paycheck_keyword: nominaKw, fecha_desde: undefined, fecha_hasta: undefined })
                } else {
                  update({ paycheck_keyword: undefined })
                }
              }}
            />
            <Label htmlFor="nomina_filter" className="text-sm cursor-pointer">Desde la última nómina</Label>
          </div>
          <Input
            placeholder="Palabra clave (ej: NOMINA)"
            value={nominaKw}
            onChange={(e) => {
              const kw = e.target.value
              setNominaKw(kw)
              localStorage.setItem(NOMINA_KW_KEY, kw)
              if (nominaActive) {
                if (nominaDebounce.current) clearTimeout(nominaDebounce.current)
                nominaDebounce.current = setTimeout(() => {
                  update({ paycheck_keyword: kw || undefined })
                }, 400)
              }
            }}
            className="text-sm"
          />
        </div>

        <Separator />

        {/* Areas */}
        {areas.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Área</Label>
              {selectedAreas.length > 0 && (
                <button onClick={() => update({ area: undefined })} className="text-xs text-gray-400 hover:text-gray-600">Limpiar</button>
              )}
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {areas.map((area) => (
                <label key={area} className="flex items-center gap-2 cursor-pointer group px-1 py-0.5 rounded hover:bg-gray-50">
                  <Checkbox
                    checked={selectedAreas.includes(area)}
                    onCheckedChange={() => toggleArea(area)}
                  />
                  <span className={cn('text-sm transition-colors', selectedAreas.includes(area) ? 'text-blue-700 font-medium' : 'text-gray-600 group-hover:text-gray-900')}>
                    {area}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Categoría</Label>
                {selectedCats.length > 0 && (
                  <button onClick={() => update({ categoria: undefined })} className="text-xs text-gray-400 hover:text-gray-600">Limpiar</button>
                )}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {categories.map((cat) => (
                  <label key={cat.nombre} className="flex items-center gap-2 cursor-pointer group px-1 py-0.5 rounded hover:bg-gray-50">
                    <Checkbox
                      checked={selectedCats.includes(cat.nombre)}
                      onCheckedChange={() => toggleCat(cat.nombre)}
                    />
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className={cn('text-sm truncate transition-colors', selectedCats.includes(cat.nombre) ? 'text-blue-700 font-medium' : 'text-gray-600 group-hover:text-gray-900')}>
                      {cat.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Tags</Label>
                {selectedTags.length > 0 && (
                  <button onClick={() => update({ tag: undefined })} className="text-xs text-gray-400 hover:text-gray-600">Limpiar</button>
                )}
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {tags.map((t) => (
                  <label key={t.nombre} className="flex items-center gap-2 cursor-pointer group px-1 py-0.5 rounded hover:bg-gray-50">
                    <Checkbox
                      checked={selectedTags.includes(t.nombre)}
                      onCheckedChange={() => toggleTag(t.nombre)}
                    />
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <span className={cn('text-sm truncate transition-colors', selectedTags.includes(t.nombre) ? 'text-blue-700 font-medium' : 'text-gray-600 group-hover:text-gray-900')}>
                      {t.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

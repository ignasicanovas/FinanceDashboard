import { useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useByCategory, useByArea } from '@/hooks/useStats'
import type { CategoryBreakdown, AreaBreakdown } from '@/types'
import { formatCurrency } from '@/lib/utils'
import type { DrilldownTarget } from '../TransactionDrilldown'

interface Props {
  accountId: number
  fecha_desde?: string
  fecha_hasta?: string
  area?: string
  categoria?: string
  tag?: string
  onDrilldown?: (target: DrilldownTarget) => void
}

export default function CategoryPieChart({ accountId, fecha_desde, fecha_hasta, area, categoria, tag, onDrilldown }: Props) {
  const [mode, setMode] = useState<'categoria' | 'area'>('categoria')
  const range = { fecha_desde, fecha_hasta, area, categoria, tag }

  const { data: catData = [], isLoading: loadingCat } = useByCategory(accountId, range)
  const { data: areaData = [], isLoading: loadingArea } = useByArea(accountId, range)

  const isLoading = mode === 'categoria' ? loadingCat : loadingArea

  const expenses = mode === 'categoria'
    ? catData
        .filter((d) => d.neto < 0)
        .map((d: CategoryBreakdown, i) => ({
          name: d.categoria,
          value: Math.abs(d.neto),
          fill: d.color || `hsl(${i * 37}, 65%, 55%)`,
        }))
    : areaData
        .filter((d) => d.neto < 0)
        .map((d: AreaBreakdown, i) => ({
          name: d.area,
          value: Math.abs(d.neto),
          fill: `hsl(${i * 37}, 65%, 55%)`,
        }))

  if (isLoading) return <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Gastos por {mode === 'categoria' ? 'categoría' : 'área'}
        </h3>
        <div className="flex rounded-lg border overflow-hidden text-xs">
          <button
            onClick={() => setMode('categoria')}
            className={`px-2.5 py-1 transition-colors ${mode === 'categoria' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            Categoría
          </button>
          <button
            onClick={() => setMode('area')}
            className={`px-2.5 py-1 transition-colors ${mode === 'area' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            Área
          </button>
        </div>
      </div>

      {!expenses.length ? (
        <p className="text-sm text-gray-400 text-center py-8">Sin gastos en el período</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={expenses.slice(0, 12)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                style={onDrilldown ? { cursor: 'pointer' } : undefined}
                label={({ percent }: { percent?: number }) =>
                  (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
                }
                onClick={(data) => {
                  if (!onDrilldown) return
                  const name = data.name as string
                  const filters = mode === 'categoria'
                    ? { fecha_desde, fecha_hasta, area, tag, categoria: name }
                    : { fecha_desde, fecha_hasta, categoria, tag, area: name }
                  onDrilldown({ title: name, accountId, filters })
                }}
              >
                {expenses.slice(0, 12).map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-end mt-2">
            <span className="text-xs text-gray-400">Total: <span className="font-semibold text-gray-600">{formatCurrency(expenses.reduce((s, d) => s + d.value, 0))}</span></span>
          </div>
        </>
      )}
    </div>
  )
}

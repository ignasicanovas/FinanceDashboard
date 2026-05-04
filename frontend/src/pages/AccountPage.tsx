import { useParams, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { BarChart2, List } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import ChartsView from '@/components/account/ChartsView'
import TransactionsView from '@/components/account/TransactionsView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAccount } from '@/hooks/useAccounts'
import type { TransactionFilters } from '@/types'

export default function AccountPage() {
  const { id } = useParams<{ id: string }>()
  const accountId = Number(id)
  const { data: account } = useAccount(accountId)
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = searchParams.get('tab') || 'charts'
  const setTab = (t: string) => setSearchParams((prev) => { prev.set('tab', t); return prev })

  // Date range from URL params — no defaults, shows all historical data
  const filters: TransactionFilters = {
    fecha_desde: searchParams.get('desde') || undefined,
    fecha_hasta: searchParams.get('hasta') || undefined,
    categoria: searchParams.get('cat') || undefined,
    area: searchParams.get('area') || undefined,
    tag: searchParams.get('tag') || undefined,
    desde_ahorro: searchParams.get('ahorro') === '1' ? 1 : undefined,
    paycheck_keyword: searchParams.get('nomina_kw') || undefined,
    search: searchParams.get('q') || undefined,
    page: Number(searchParams.get('page')) || 1,
    per_page: 50,
  }

  const setFilters = (f: TransactionFilters) => {
    setSearchParams((prev) => {
      if (f.fecha_desde) prev.set('desde', f.fecha_desde); else prev.delete('desde')
      if (f.fecha_hasta) prev.set('hasta', f.fecha_hasta); else prev.delete('hasta')
      if (f.categoria) prev.set('cat', f.categoria); else prev.delete('cat')
      if (f.area) prev.set('area', f.area); else prev.delete('area')
      if (f.tag) prev.set('tag', f.tag); else prev.delete('tag')
      if (f.desde_ahorro) prev.set('ahorro', '1'); else prev.delete('ahorro')
      if (f.paycheck_keyword) prev.set('nomina_kw', f.paycheck_keyword); else prev.delete('nomina_kw')
      if (f.search) prev.set('q', f.search); else prev.delete('q')
      if (f.page && f.page > 1) prev.set('page', String(f.page)); else prev.delete('page')
      return prev
    })
  }

  const onDateChange = (desde?: string, hasta?: string) => {
    setSearchParams((prev) => {
      if (desde) prev.set('desde', desde); else prev.delete('desde')
      if (hasta) prev.set('hasta', hasta); else prev.delete('hasta')
      prev.delete('page')
      return prev
    })
  }

  // Default to current year when no date filter is set
  useEffect(() => {
    if (!searchParams.get('desde') && !searchParams.get('hasta')) {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      setSearchParams((prev) => {
        prev.set('desde', `${now.getFullYear()}-01-01`)
        prev.set('hasta', today)
        return prev
      }, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const title = account ? `${account.emoji} ${account.nombre}` : 'Cuenta'

  return (
    <AppShell title={title}>
      <div className="max-w-6xl mx-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Gráficos e indicadores
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Transacciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="charts">
            <ChartsView
              accountId={accountId}
              fechaDesde={filters.fecha_desde}
              fechaHasta={filters.fecha_hasta}
              selectedAreas={(filters.area || '').split(',').filter(Boolean)}
              selectedCats={(filters.categoria || '').split(',').filter(Boolean)}
              selectedTags={(filters.tag || '').split(',').filter(Boolean)}
              onDateChange={onDateChange}
              onFilterChange={(areas, cats, tags) => {
                setSearchParams((prev) => {
                  const area = areas.join(',')
                  const cat = cats.join(',')
                  const tag = tags.join(',')
                  if (area) prev.set('area', area); else prev.delete('area')
                  if (cat) prev.set('cat', cat); else prev.delete('cat')
                  if (tag) prev.set('tag', tag); else prev.delete('tag')
                  prev.delete('page')
                  return prev
                })
              }}
            />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsView
              accountId={accountId}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}

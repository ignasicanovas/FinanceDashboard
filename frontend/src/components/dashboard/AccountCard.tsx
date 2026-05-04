import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp, AlertCircle, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAccountStats } from '@/hooks/useAccounts'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '@/types'

interface AccountCardProps {
  account: Account
  onUpload: (account: Account) => void
}

export default function AccountCard({ account, onUpload }: AccountCardProps) {
  const { data: stats } = useAccountStats(account.id)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Link to={`/account/${account.id}`} className="flex items-center gap-2 group">
            <span className="text-2xl">{account.emoji}</span>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {account.nombre}
              </h3>
              {account.banco && (
                <p className="text-xs text-gray-500">{account.banco}</p>
              )}
            </div>
          </Link>
          {stats?.total_sin_cat ? (
            <Badge variant="secondary" className="text-orange-600 bg-orange-50 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {stats.total_sin_cat} sin cat.
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {stats?.ok ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>Ingresos {stats.mes_label}</span>
              </div>
              <span className="font-medium text-green-600">
                +{formatCurrency(stats.mes_ingresos)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span>Gastos {stats.mes_label}</span>
              </div>
              <span className="font-medium text-red-500">
                -{formatCurrency(stats.mes_gastos)}
              </span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-700">Saldo total</span>
                <span className={stats.balance >= 0 ? 'text-green-700' : 'text-red-600'}>
                  {formatCurrency(stats.balance)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic py-4 text-center">Sin transacciones</p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          onClick={() => onUpload(account)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Cargar extracto
        </Button>
      </CardContent>
    </Card>
  )
}

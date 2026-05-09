import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Settings, LogOut, Menu, X,
  ArrowLeftRight, PiggyBank, BarChart3, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useAccounts } from '@/hooks/useAccounts'

interface AppShellProps {
  children: React.ReactNode
  title?: string
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { href: '/presupuesto', label: 'Presupuesto', icon: PiggyBank },
  { href: '/informes', label: 'Informes', icon: BarChart3 },
]

export default function AppShell({ children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const { data: accounts = [] } = useAccounts()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'oklch(11% 0.01 250)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-56 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--nf-surface-1)', borderRight: '1px solid var(--nf-rule)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--nf-rule)' }}>
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--nf-accent)' }}>
              NanisFinance
            </span>
          </Link>
          <button className="lg:hidden p-1 rounded" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" style={{ color: 'var(--nf-ink-3)' }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  active ? 'font-semibold' : 'hover:bg-[var(--nf-surface-2)]'
                )}
                style={active
                  ? { background: 'var(--nf-accent)', color: 'var(--nf-accent-ink)' }
                  : { color: 'var(--nf-ink-2)' }
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}

          {/* Accounts section */}
          {accounts.length > 0 && (
            <div className="pt-5">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--nf-ink-3)' }}>
                Cuentas
              </p>
              {accounts.map((acc) => {
                const active = location.pathname === `/account/${acc.id}`
                return (
                  <Link
                    key={acc.id}
                    to={`/account/${acc.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all',
                      active ? 'font-semibold' : 'hover:bg-[var(--nf-surface-2)]'
                    )}
                    style={active
                      ? { background: 'var(--nf-accent)', color: 'var(--nf-accent-ink)' }
                      : { color: 'var(--nf-ink-2)' }
                    }
                  >
                    <span className="text-base leading-none">{acc.emoji}</span>
                    <span className="flex-1 truncate">{acc.nombre}</span>
                    <ChevronRight className="w-3 h-3 opacity-40 flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </nav>

        {/* Bottom: settings + user */}
        <div className="p-3 space-y-0.5 flex-shrink-0" style={{ borderTop: '1px solid var(--nf-rule)' }}>
          {(() => {
            const active = location.pathname === '/settings'
            return (
              <Link
                to="/settings"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  active ? 'font-semibold' : 'hover:bg-[var(--nf-surface-2)]'
                )}
                style={active
                  ? { background: 'var(--nf-accent)', color: 'var(--nf-accent-ink)' }
                  : { color: 'var(--nf-ink-2)' }
                }
              >
                <Settings className="w-4 h-4 flex-shrink-0" />
                Configuración
              </Link>
            )
          })()}

          <div className="flex items-center gap-2.5 px-3 py-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--nf-accent)', color: 'var(--nf-accent-ink)' }}
            >
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--nf-ink)' }}>
                {user?.full_name || 'Usuario'}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'var(--nf-ink-3)' }}>{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--nf-surface-2)]"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" style={{ color: 'var(--nf-ink-3)' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-14 flex items-center px-6 gap-4 flex-shrink-0"
          style={{ background: 'var(--nf-surface-1)', borderBottom: '1px solid var(--nf-rule)' }}
        >
          <button className="lg:hidden p-1 rounded" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" style={{ color: 'var(--nf-ink-2)' }} />
          </button>
          {title && (
            <h1 className="text-sm font-semibold" style={{ color: 'var(--nf-ink)' }}>{title}</h1>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

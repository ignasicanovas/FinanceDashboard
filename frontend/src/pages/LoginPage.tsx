import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const { access_token } = await authApi.login(data.email, data.password)
      setToken(access_token)
      const user = await authApi.me()
      setUser(user)
      navigate('/dashboard')
    } catch {
      toast.error('Email o contraseña incorrectos')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'oklch(11% 0.01 250)' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--nf-paper)', border: '1px solid var(--nf-rule)' }}
      >
        <div className="text-center mb-6">
          <p className="text-xl font-bold tracking-tight mb-1" style={{ color: 'var(--nf-accent)' }}>NanisFinance</p>
          <p className="text-sm" style={{ color: 'var(--nf-ink-3)' }}>Accede a tu panel de finanzas</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" style={{ color: 'var(--nf-ink-2)', fontSize: '0.75rem' }}>Email</Label>
            <Input id="email" type="email" {...register('email')} placeholder="tu@email.com" />
            {errors.email && <p className="text-xs" style={{ color: 'var(--nf-neg)' }}>{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" style={{ color: 'var(--nf-ink-2)', fontSize: '0.75rem' }}>Contraseña</Label>
            <Input id="password" type="password" {...register('password')} placeholder="••••••••" />
            {errors.password && <p className="text-xs" style={{ color: 'var(--nf-neg)' }}>{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all mt-2 disabled:opacity-60"
            style={{ background: 'var(--nf-accent)', color: 'var(--nf-accent-ink)' }}
          >
            {isSubmitting ? 'Accediendo...' : 'Entrar'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs" style={{ color: 'var(--nf-ink-3)' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-semibold" style={{ color: 'var(--nf-accent)' }}>
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}

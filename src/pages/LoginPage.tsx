import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Store } from 'lucide-react'
import { toast } from 'sonner'
import { loginWithPassword } from '@/features/auth/api'
import { useAuth } from '@/features/auth/AuthContext'
import { normalizeLoginPhone } from '@/shared/authCookie'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  phone: z
    .string()
    .min(1, 'Укажите телефон')
    .refine((v) => normalizeLoginPhone(v).length === 10, 'Нужен номер из 10 цифр'),
  password: z.string().min(1, 'Укажите пароль'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { isAuthenticated, isFranchiseManager, isLoading, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/orders'
  const [submitting, setSubmitting] = useState(false)

  const externalLogin = import.meta.env.VITE_EXTERNAL_LOGIN_URL as string | undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', password: '' },
  })

  if (!isLoading && isAuthenticated && isFranchiseManager) {
    return <Navigate to={from} replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      await loginWithPassword(values.phone, values.password)
      const user = await refresh()
      if (!user?.permissions?.pages) {
        toast.error('Не удалось войти. Проверьте телефон и пароль.')
        return
      }
      toast.success('Вход выполнен')
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FRANCHISING_MANAGER') {
        toast.error('Нет доступа менеджера ПВ (роль franchising / branchId).')
      } else {
        toast.error('Ошибка входа. Проверьте телефон и пароль.')
      }
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md border-primary/15 shadow-lg shadow-primary/10">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4" />
            </span>
            <div className="leading-tight">
              <div>Подзамену</div>
              <div className="text-xs font-medium text-muted-foreground">Franchising · ПВ</div>
            </div>
          </div>
          <CardTitle className="text-xl">Вход менеджера ПВ</CardTitle>
          <CardDescription>
            Отдельный вход франшизы: `POST /franchising/auth/login`, HttpOnly cookie
            `franchising_auth` (через Vite-прокси `/api`).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="username"
                placeholder="9123456789"
                {...form.register('phone')}
              />
              {form.formState.errors.phone ? (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Вход…' : 'Войти'}
            </Button>
          </form>

          {externalLogin ? (
            <p className="text-center text-sm text-muted-foreground">
              Или{' '}
              <a className="underline underline-offset-4" href={externalLogin}>
                войдите на главной
              </a>
              , затем вернитесь сюда.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Не использует `/login_user` и cookie `user` сайта/CRM. Прокси снимает Domain у
              `franchising_auth`, чтобы cookie жила на localhost.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

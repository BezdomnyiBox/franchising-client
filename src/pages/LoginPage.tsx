import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Store } from 'lucide-react'
import { toast } from 'sonner'
import { loginWithPassword } from '@/features/auth/api'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  username: z.string().min(1, 'Укажите логин'),
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
    defaultValues: { username: '', password: '' },
  })

  if (!isLoading && isAuthenticated && isFranchiseManager) {
    return <Navigate to={from} replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      await loginWithPassword(values.username, values.password)
      const user = await refresh()
      if (!user?.permissions?.pages) {
        toast.error('Не удалось войти. Проверьте логин/пароль или путь VITE_LOGIN_PATH.')
        return
      }
      toast.success('Вход выполнен')
      navigate(from, { replace: true })
    } catch {
      toast.error('Ошибка входа. Если форма на другом URL — задайте VITE_LOGIN_PATH или войдите через CRM.')
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
            Cookie-сессия CRM через Vite-прокси (`/api`). Логин тот же, что для CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="username">Логин</Label>
              <Input id="username" autoComplete="username" {...form.register('username')} />
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
              Если endpoint логина другой — укажите `VITE_LOGIN_PATH` в `.env`. Для cookie с
              `*.public.lan` прокси переписывает Domain на localhost.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

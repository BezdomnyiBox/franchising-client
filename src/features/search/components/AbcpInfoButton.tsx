// @ts-nocheck
import { useEffect, useState } from 'react'
import { BookOpen, Loader2 } from 'lucide-react'
import { fetchAbcpProductInfo } from '../lib/supplierGoodsApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

const CROSS_TYPE_LABEL = {
  0: 'ОЕМ',
  1: 'Аналог',
  2: 'Замена',
  3: 'Компонент',
}

export function AbcpInfoButton({ brand, article }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState(null)
  const [tab, setTab] = useState('about')

  useEffect(() => {
    if (!brand || !article) return

    let cancelled = false
    setLoading(true)
    setError('')
    setInfo(null)

    fetchAbcpProductInfo({ brand, article })
      .then((data) => {
        if (cancelled) return
        setInfo(data)
        if (data?.description || data?.properties?.length) setTab('about')
        else if (data?.crosses?.length) setTab('crosses')
        else setTab('about')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Не удалось загрузить данные ABCP')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [brand, article])

  const crossesCount = info?.crosses?.length ?? 0

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />}
        ABCP / кроссы
        {crossesCount > 0 ? (
          <Badge variant="secondary" className="h-5 min-w-5 justify-center rounded-full px-1.5">
            {crossesCount}
          </Badge>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-base">
              ABCP · {brand} / <span className="font-mono text-sm">{article}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 border-b px-4 py-2">
            {[
              { id: 'about', label: 'Описание' },
              { id: 'crosses', label: `Кроссы${crossesCount ? ` (${crossesCount})` : ''}` },
            ].map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={tab === item.id ? 'default' : 'outline'}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Загрузка из ABCP…
              </div>
            ) : null}

            {!loading && error ? (
              <p className="py-6 text-center text-sm text-destructive">{error}</p>
            ) : null}

            {!loading && !error && info ? (
              tab === 'about' ? (
                <div className="space-y-4">
                  {info.description ? (
                    <p className="text-sm leading-relaxed">{info.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Описание не найдено</p>
                  )}

                  {info.properties?.length ? (
                    <>
                      <Separator />
                      <dl className="grid grid-cols-[minmax(0,40%)_1fr] gap-x-3 gap-y-2 text-sm">
                        {info.properties.map((row, idx) => (
                          <div key={`${row.name}-${idx}`} className="contents">
                            <dt className="text-muted-foreground">{row.name}</dt>
                            <dd className="font-medium">{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </>
                  ) : null}

                  {info.images?.length ? (
                    <>
                      <Separator />
                      <div className="flex flex-wrap gap-2">
                        {info.images.slice(0, 8).map((src) => (
                          <a
                            key={src}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block size-20 overflow-hidden rounded-md border bg-muted/30"
                          >
                            <img src={src} alt="" className="size-full object-contain" />
                          </a>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {info.source ? (
                    <p className="text-xs text-muted-foreground">
                      Источник: {info.source === 'cache' ? 'кэш' : info.source === 'abcp' ? 'ABCP' : '—'}
                      {info.updatedAt ? ` · ${info.updatedAt}` : ''}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  {!info.crosses?.length ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Кроссы не найдены</p>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {info.crosses.map((cross, idx) => (
                        <li
                          key={`${cross.brand}-${cross.article}-${idx}`}
                          className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-medium">
                              {cross.brand}{' '}
                              <span className="font-mono text-xs text-muted-foreground">
                                {cross.article}
                              </span>
                            </div>
                            {cross.description ? (
                              <div className="text-xs text-muted-foreground">{cross.description}</div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {cross.reliable ? (
                              <Badge variant="secondary" className="bg-emerald-600/10 text-emerald-700">
                                надёжный
                              </Badge>
                            ) : null}
                            {cross.crossType != null && CROSS_TYPE_LABEL[cross.crossType] ? (
                              <Badge variant="outline">{CROSS_TYPE_LABEL[cross.crossType]}</Badge>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

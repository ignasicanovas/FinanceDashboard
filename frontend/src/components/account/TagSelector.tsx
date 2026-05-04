import { useState } from 'react'
import { Tag as TagIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTags, useUpdateTransactionTags } from '@/hooks/useTags'

interface TagSelectorProps {
  accountId: number
  txnId: string
  value: string[]
}

export default function TagSelector({ accountId, txnId, value }: TagSelectorProps) {
  const [open, setOpen] = useState(false)
  const { data: allTags = [] } = useTags(accountId)
  const updateTags = useUpdateTransactionTags(accountId)

  const toggle = (nombre: string) => {
    const next = value.includes(nombre)
      ? value.filter((t) => t !== nombre)
      : [...value, nombre]
    updateTags.mutate({ txnId, tags: next })
  }

  if (allTags.length === 0) return null

  return (
    <div className="relative">
      <div className="flex items-center gap-1 flex-wrap">
        {value.map((t) => {
          const tag = allTags.find((a) => a.nombre === t)
          return (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: tag?.color || '#6366f1' }}
            >
              {t}
              <button
                onClick={(e) => { e.stopPropagation(); toggle(t) }}
                className="opacity-70 hover:opacity-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )
        })}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-gray-400 hover:text-gray-600"
          onClick={() => setOpen((o) => !o)}
        >
          <TagIcon className="w-3 h-3" />
        </Button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg p-1.5 min-w-[140px]">
            {allTags.map((tag) => (
              <button
                key={tag.nombre}
                onClick={() => toggle(tag.nombre)}
                className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-50 transition-colors"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 truncate">{tag.nombre}</span>
                {value.includes(tag.nombre) && (
                  <span className="text-blue-600 font-bold text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

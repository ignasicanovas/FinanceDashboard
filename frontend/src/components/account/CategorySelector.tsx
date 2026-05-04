import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCategories } from '@/hooks/useCategories'

interface CategorySelectorProps {
  accountId: number
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function CategorySelector({ accountId, value, onChange, placeholder, disabled }: CategorySelectorProps) {
  const { data: categories = [] } = useCategories(accountId)

  // Group by supercategoria
  const grouped = categories.reduce<Record<string, typeof categories>>((acc, cat) => {
    const area = cat.supercategoria || 'Otros'
    if (!acc[area]) acc[area] = []
    acc[area].push(cat)
    return acc
  }, {})

  const NONE = '__none__'

  return (
    <Select
      value={value || NONE}
      onValueChange={(v) => onChange(v === NONE ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger className={`h-8 text-xs min-w-[140px] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <SelectValue placeholder={placeholder || 'Sin categoría'} />
      </SelectTrigger>
      <SelectContent position="item-aligned" className="max-h-72">
        <SelectItem value={NONE}>Sin categoría</SelectItem>
        {Object.entries(grouped).map(([area, cats]) => (
          <SelectGroup key={area}>
            <SelectLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {area}
            </SelectLabel>
            {cats.map((cat) => (
              <SelectItem key={cat.nombre} value={cat.nombre}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color || '#9ca3af' }}
                  />
                  {cat.nombre}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

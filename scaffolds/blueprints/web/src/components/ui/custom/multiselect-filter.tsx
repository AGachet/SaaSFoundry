import { Badge } from '@/components/ui/shadcn/badge'
import { Button } from '@/components/ui/shadcn/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover'
import { Skeleton } from '@/components/ui/shadcn/skeleton'
import { SearchIcon } from 'lucide-react'
import { useState } from 'react'

export type MultiSelectFilterItem = {
  id: string | number
  label: string
}

type MultiSelectFilterProps = {
  selected: (string | number)[]
  onChange: (selected: (string | number)[]) => void
  items: MultiSelectFilterItem[]
  icon?: React.ReactNode
  dataTestid?: string
  placeholder: string
  selectedLabel: string
  badgeBg?: string
  badgeText?: string
  loading?: boolean
  emptyText?: string
  className?: string
  search: string
  onSearchChange: (value: string) => void
}

export function MultiSelectFilter({
  selected,
  onChange,
  items,
  icon,
  placeholder,
  dataTestid,
  selectedLabel,
  badgeBg = '',
  badgeText = '',
  loading = false,
  emptyText = 'Aucun résultat',
  className = '',
  search,
  onSearchChange
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (id: string | number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const handleReset = () => {
    onChange([])
    onSearchChange('')
  }

  // Filtrage côté UI optionnel (ici on affiche tout, filtrage API recommandé)
  const displayItems = items

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid={dataTestid}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-[300px] justify-start border-0 shadow-none transition-colors ${open || selected.length > 0 ? 'bg-white ring-1 ring-slate-200' : 'bg-muted-foreground/5 hover:bg-white hover:ring-1 hover:ring-slate-200 focus:bg-muted-foreground/5 focus:ring-0'} ${className}`}
        >
          {icon && <span className="mr-2">{icon}</span>}
          {selected.length > 0 ? (
            <div className="flex flex-1 items-center justify-between gap-1">
              <span className="truncate">{selectedLabel}</span>
              <Badge variant="outline" className={`${badgeBg} border-none`}>
                <span className={badgeText}>{selected.length}</span>
              </Badge>
            </div>
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <div className="p-2">
          <div className="relative mb-2">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder={placeholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded border bg-white py-1 pl-7 pr-7 text-sm focus:border-gray-200 focus:outline-none focus:ring-0"
              style={{ boxShadow: 'none' }}
            />
            {selected.length > 0 && (
              <button
                type="button"
                aria-label="Reset selection"
                onClick={handleReset}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {loading ? (
            <div className="flex flex-col gap-2 p-2 opacity-25">
              <Skeleton className="skeleton-shimmer-orange h-6 w-full rounded" />
              <Skeleton className="skeleton-shimmer-orange h-6 w-3/4 rounded" />
              <Skeleton className="skeleton-shimmer-orange h-6 w-2/3 rounded" />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex h-[70px] items-center justify-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto rounded-sm bg-white ring-1 ring-black/5">
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`flex cursor-pointer items-center justify-between px-4 py-2 text-sm capitalize transition-colors ${selected.includes(item.id) ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'} last:mb-0`}
                >
                  <span>{item.label}</span>
                  {selected.includes(item.id) && <span className="ml-2 text-primary">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

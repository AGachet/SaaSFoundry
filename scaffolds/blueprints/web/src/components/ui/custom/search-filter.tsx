import { Input } from '@/components/ui/shadcn/input'
import { SearchIcon } from 'lucide-react'

type SearchFilterProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}

export function SearchFilter({ value, onChange, placeholder, className = '' }: SearchFilterProps) {
  return (
    <div data-testid="search-filter" className={`relative ${className}`}>
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className={`border-0 pl-9 shadow-none transition-colors placeholder:text-muted-foreground ${
          value ? 'bg-white ring-1 ring-slate-200' : 'bg-muted-foreground/5'
        } focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-slate-200`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
          onClick={() => onChange('')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

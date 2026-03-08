import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select'

type StatusFilterProps = {
  value: boolean | undefined
  onChange: (value: boolean | undefined) => void
  placeholder: string
  className?: string
}

export function StatusFilter({ value, onChange, placeholder, className = '' }: StatusFilterProps) {
  return (
    <div data-testid="status-filter" className={`relative ${className}`}>
      <div className="absolute left-5 top-1/2 -translate-y-1/2">
        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${value === true ? 'bg-emerald-500/20' : value === false ? 'bg-muted' : 'bg-blue-500/20'}`}>
          <span className={`h-2 w-2 rounded-full ${value === true ? 'bg-emerald-500' : value === false ? 'bg-muted-foreground/50' : 'bg-blue-500'}`}></span>
        </div>
      </div>
      <Select
        value={value === undefined ? 'all' : value.toString()}
        onValueChange={(newValue) => {
          if (newValue === 'all') onChange(undefined)
          else onChange(newValue === 'true')
        }}
      >
        <SelectTrigger
          className={`border-0 pl-10 shadow-none transition-colors ${
            value !== undefined
              ? 'bg-card ring-1 ring-border focus:bg-card focus:ring-1 focus:ring-border'
              : 'bg-muted-foreground/5 hover:bg-card hover:ring-1 hover:ring-border focus:bg-muted-foreground/5 focus:ring-0'
          }`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="true">Actif</SelectItem>
          <SelectItem value="false">Inactif</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

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
        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${value === true ? 'bg-green-100' : value === false ? 'bg-gray-200' : 'bg-blue-100'}`}>
          <span className={`h-2 w-2 rounded-full ${value === true ? 'bg-green-500' : value === false ? 'bg-gray-400' : 'bg-blue-500'}`}></span>
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
              ? 'bg-white ring-1 ring-slate-200 focus:bg-white focus:ring-1 focus:ring-slate-200'
              : 'bg-muted-foreground/5 hover:bg-white hover:ring-1 hover:ring-slate-200 focus:bg-muted-foreground/5 focus:ring-0'
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

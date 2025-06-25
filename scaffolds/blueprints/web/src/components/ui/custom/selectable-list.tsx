/**
 * Ressources
 */

/**
 * Types
 */
export interface SelectableListItem {
  id: string | number
  title: string
  subtitle?: string
  description?: string
}

interface SelectableListProps {
  items: SelectableListItem[]
  selectedIds: (string | number)[]
  onSelectionChange: (selectedIds: (string | number)[]) => void
  ariaLabel: string
  className?: string
  itemClassName?: string
  multiSelect?: boolean
}

/**
 * Composant SelectableList réutilisable avec sémantique HTML appropriée
 */
export function SelectableList({ items, selectedIds, onSelectionChange, ariaLabel, className = '', itemClassName = '', multiSelect = true }: SelectableListProps) {
  const handleItemClick = (itemId: string | number) => {
    if (multiSelect) {
      const newSelectedIds = selectedIds.includes(itemId) ? selectedIds.filter((id) => id !== itemId) : [...selectedIds, itemId]
      onSelectionChange(newSelectedIds)
    } else {
      onSelectionChange([itemId])
    }
  }

  return (
    <ul className={`p-2 ${className}`} role="listbox" aria-label={ariaLabel} aria-multiselectable={multiSelect}>
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id)
        return (
          <li
            key={item.id}
            role="option"
            aria-selected={isSelected}
            className={`flex cursor-pointer list-none items-center justify-between px-4 py-2 text-sm capitalize transition-colors last:mb-0 ${
              isSelected ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'
            } ${itemClassName}`}
            onClick={() => handleItemClick(item.id)}
          >
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium capitalize">{item.title}</span>
                {item.subtitle && <span className="text-xs text-muted-foreground">{item.subtitle}</span>}
              </div>
              {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
            </div>
            {isSelected && <span className="ml-2 text-primary">✓</span>}
          </li>
        )
      })}
    </ul>
  )
}

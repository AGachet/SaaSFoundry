type AvatarProps = {
  initials?: string
  icon?: React.ReactNode
  bgColor: string
  textColor: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ initials, icon, bgColor, textColor, size = 'md' }: AvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  return (
    <span className={`relative flex ${sizeClasses[size]} shrink-0 overflow-hidden rounded-lg`}>
      <span className={`flex h-full w-full items-center justify-center rounded-lg ${bgColor} ${textColor}`}>{initials || icon}</span>
    </span>
  )
}

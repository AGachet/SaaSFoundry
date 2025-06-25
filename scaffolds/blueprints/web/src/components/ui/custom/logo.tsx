import { cn } from '@/utils/ui'

interface LogoProps {
  isLong: boolean
  className?: string
  onClick?: () => void
}

export function Logo({ isLong, className, onClick }: LogoProps) {
  return (
    <div className={cn('flex w-full justify-center', className)} onClick={onClick}>
      <img src={isLong ? '/img/logo-long.svg' : '/img/logo-short.svg'} alt="Logo" />
    </div>
  )
}

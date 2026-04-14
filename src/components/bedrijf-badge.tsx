import { cn } from '@/lib/utils'
import type { BedrijfTag } from '@/lib/types'

export function BedrijfBadge({ tag }: { tag: BedrijfTag }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        tag === 'river_digital'
          ? 'bg-[#C9D9FF] text-[#2F57AA]'
          : 'bg-[#A9DDE4] text-[#176C79]'
      )}
    >
      {tag === 'river_digital' ? 'River Digital' : 'River Software'}
    </span>
  )
}

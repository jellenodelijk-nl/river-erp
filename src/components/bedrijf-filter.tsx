'use client'

import { cn } from '@/lib/utils'
import type { BedrijfTag } from '@/lib/types'

interface BedrijfFilterProps {
  value: BedrijfTag | 'alle'
  onChange: (value: BedrijfTag | 'alle') => void
}

export function BedrijfFilter({ value, onChange }: BedrijfFilterProps) {
  const options = [
    { value: 'alle' as const, label: 'Alle', color: '#6B7280' },
    { value: 'river_digital' as const, label: 'River Digital', color: '#3A6FD8' },
    { value: 'river_software' as const, label: 'River Software', color: '#1F8A9B' },
  ]

  return (
    <div className="flex items-center bg-white border border-[#E5E7EB] rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            value === opt.value
              ? 'text-white'
              : 'text-[#6B7280] hover:text-[#0B0D0E]'
          )}
          style={
            value === opt.value
              ? { backgroundColor: opt.color }
              : undefined
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

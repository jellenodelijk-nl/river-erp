'use client'

export function RiverWave({ className = '', color = '#3A6FD8' }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 1440 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d="M0 60C240 20 480 100 720 60C960 20 1200 100 1440 60V120H0V60Z"
        fill={color}
        fillOpacity="0.08"
      />
      <path
        d="M0 80C240 40 480 120 720 80C960 40 1200 120 1440 80V120H0V80Z"
        fill={color}
        fillOpacity="0.05"
      />
    </svg>
  )
}

export function RiverWaveTop({ className = '', color = '#3A6FD8' }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 1440 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d="M0 30C360 0 720 60 1080 30C1260 15 1380 40 1440 30V0H0V30Z"
        fill={color}
        fillOpacity="0.06"
      />
    </svg>
  )
}

export function SidebarWave() {
  return (
    <svg
      viewBox="0 0 260 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute bottom-0 left-0 w-full opacity-30"
      preserveAspectRatio="none"
    >
      <path
        d="M0 40C65 20 130 60 195 40C227 30 247 50 260 40V80H0V40Z"
        fill="url(#sidebarGrad)"
      />
      <defs>
        <linearGradient id="sidebarGrad" x1="0" y1="0" x2="260" y2="80">
          <stop offset="0%" stopColor="#3A6FD8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#1F8A9B" stopOpacity="0.15" />
        </linearGradient>
      </defs>
    </svg>
  )
}

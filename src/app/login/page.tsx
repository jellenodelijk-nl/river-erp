'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Loader2, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Step = 'credentials' | 'totp-setup' | 'totp-verify'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [step, setStep] = useState<Step>('credentials')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Ongeldige inloggegevens')
        setLoading(false)
        return
      }

      // Check if user has TOTP enabled
      const { data: user } = await supabase
        .from('users')
        .select('totp_enabled, totp_secret')
        .eq('id', data.user.id)
        .single()

      if (!user) {
        setError('Gebruiker niet gevonden in het systeem')
        setLoading(false)
        return
      }

      if (user.totp_enabled) {
        setStep('totp-verify')
      } else {
        // Need to set up TOTP
        const res = await fetch('/api/auth/totp-setup', { method: 'POST' })
        const result = await res.json()
        if (result.qrDataUrl) {
          setQrDataUrl(result.qrDataUrl)
          setStep('totp-setup')
        }
      }
    } catch {
      setError('Er ging iets mis. Probeer opnieuw.')
    }
    setLoading(false)
  }

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/totp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode }),
      })
      const result = await res.json()

      if (result.success) {
        router.push('/')
        router.refresh()
      } else {
        setError('Ongeldige verificatiecode')
      }
    } catch {
      setError('Verificatie mislukt')
    }
    setLoading(false)
  }

  async function handleTotpSetup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/totp-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode }),
      })
      const result = await res.json()

      if (result.success) {
        router.push('/')
        router.refresh()
      } else {
        setError('Ongeldige code. Probeer opnieuw.')
      }
    } catch {
      setError('Activatie mislukt')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-gradient-to-br from-[#F0F4FF] via-[#F4F6F7] to-[#F0FAFB]">
      {/* River wave background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg viewBox="0 0 1440 900" fill="none" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d="M-100 300C200 200 500 400 800 300C1100 200 1300 350 1540 280" stroke="url(#loginGrad1)" strokeWidth="120" strokeLinecap="round" opacity="0.04" />
          <path d="M-100 500C200 400 500 600 800 500C1100 400 1300 550 1540 480" stroke="url(#loginGrad2)" strokeWidth="80" strokeLinecap="round" opacity="0.03" />
          <path d="M-100 700C200 600 500 800 800 700C1100 600 1300 750 1540 680" stroke="url(#loginGrad1)" strokeWidth="100" strokeLinecap="round" opacity="0.025" />
          <circle cx="200" cy="150" r="200" fill="#3A6FD8" opacity="0.02" />
          <circle cx="1200" cy="700" r="250" fill="#1F8A9B" opacity="0.02" />
          <defs>
            <linearGradient id="loginGrad1" x1="0" y1="0" x2="1440" y2="0">
              <stop offset="0%" stopColor="#3A6FD8" />
              <stop offset="100%" stopColor="#1F8A9B" />
            </linearGradient>
            <linearGradient id="loginGrad2" x1="0" y1="0" x2="1440" y2="0">
              <stop offset="0%" stopColor="#1F8A9B" />
              <stop offset="100%" stopColor="#3A6FD8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-3">
            <Image src="/logos/river-icon.png" alt="River" width={48} height={48} className="w-12 h-12 rounded-xl" priority />
            <span className="text-3xl font-semibold text-[#0B0D0E] tracking-tight">River</span>
          </div>
          <p className="text-sm text-[#9CA3AF] font-medium tracking-wide">Intern management systeem</p>
        </div>

        <Card className="border border-white/60 shadow-xl shadow-[#3A6FD8]/5 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-center">
              {step === 'credentials' && 'Inloggen'}
              {step === 'totp-setup' && '2FA instellen'}
              {step === 'totp-verify' && 'Verificatie'}
            </h2>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {step === 'credentials' && (
                <motion.form
                  key="credentials"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mailadres</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jouw@email.nl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Wachtwoord</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 p-2 rounded-md">{error}</p>
                  )}
                  <Button type="submit" className="w-full bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] hover:from-[#2F57AA] hover:to-[#254A99] shadow-lg shadow-[#3A6FD8]/20 transition-all duration-200" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                    Inloggen
                  </Button>
                </motion.form>
              )}

              {step === 'totp-setup' && (
                <motion.form
                  key="totp-setup"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleTotpSetup}
                  className="space-y-4"
                >
                  <p className="text-sm text-[#6B7280] text-center">
                    Scan de QR-code met je authenticator app (bijv. Google Authenticator)
                  </p>
                  {qrDataUrl && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} alt="TOTP QR Code" className="w-48 h-48" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="totp">Verificatiecode</Label>
                    <Input
                      id="totp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      required
                      autoFocus
                      className="text-center text-lg tracking-widest"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 p-2 rounded-md">{error}</p>
                  )}
                  <Button type="submit" className="w-full bg-[#3A6FD8] hover:bg-[#2F57AA]" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Activeren &amp; Inloggen
                  </Button>
                </motion.form>
              )}

              {step === 'totp-verify' && (
                <motion.form
                  key="totp-verify"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleTotpVerify}
                  className="space-y-4"
                >
                  <p className="text-sm text-[#6B7280] text-center">
                    Voer de 6-cijferige code in van je authenticator app
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="totp">Verificatiecode</Label>
                    <Input
                      id="totp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      required
                      autoFocus
                      className="text-center text-lg tracking-widest"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 p-2 rounded-md">{error}</p>
                  )}
                  <Button type="submit" className="w-full bg-[#3A6FD8] hover:bg-[#2F57AA]" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Verifiëren
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

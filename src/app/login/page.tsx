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
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F7] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-6 items-center mb-3">
            <Image src="/logos/river-digital.png" alt="River Digital" width={140} height={46} className="h-10 w-auto" priority />
            <div className="w-px h-8 bg-[#E5E7EB]" />
            <Image src="/logos/river-software.png" alt="River Software" width={140} height={46} className="h-10 w-auto" priority />
          </div>
          <p className="text-sm text-[#6B7280]">Intern management systeem</p>
        </div>

        <Card className="border border-[#E5E7EB] shadow-sm">
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
                  <Button type="submit" className="w-full bg-[#3A6FD8] hover:bg-[#2F57AA]" disabled={loading}>
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

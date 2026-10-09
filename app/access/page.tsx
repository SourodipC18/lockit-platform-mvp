'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, LockKeyhole, ShieldCheck, TimerReset } from 'lucide-react'

type Booking = { id: string; location: string; lockerSize: string; hours: number; name: string; status: string; accessCode: string; confirmedAt?: string; overtimeFeeCents?: number; pricePerHour?: number }

export default function AccessPage() {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const [id, setId] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('id'))
  }, [])

  useEffect(() => {
    if (!id) return
    let active = true
    const load = async () => {
      try {
        const response = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('not-found')
        const nextBooking = await response.json()
        if (active) setBooking(nextBooking)
        return nextBooking
      } catch {
        if (active) setError('This access link is not valid.')
        return null
      }
    }
    const startFromScan = async () => {
      const current = await load()
      const action = new URLSearchParams(window.location.search).get('action')
      // The unlock QR opens this page; the customer must explicitly press Unlock locker.
      void action
      
    }
    void startFromScan()
    const poll = window.setInterval(load, 5000)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { active = false; window.clearInterval(poll); window.clearInterval(tick) }
  }, [id])

  const timing = useMemo(() => {
    if (!booking?.confirmedAt) return { elapsed: 0, remaining: booking?.hours ? booking.hours * 3600 : 0, overtime: 0 }
    const elapsed = Math.max(0, Math.floor((now - new Date(booking.confirmedAt).getTime()) / 1000))
    const duration = booking.hours * 3600
    return { elapsed, remaining: Math.max(0, duration - elapsed), overtime: Math.max(0, elapsed - duration) }
  }, [booking, now])
  const format = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const overtimeCents = Math.ceil(timing.overtime / 3600) * 200
  const bookedAmount = (booking?.pricePerHour ?? 2) * (booking?.hours ?? 0)
  useEffect(() => {
    if (!booking || (booking.status !== 'confirmed' && booking.status !== 'closed')) return
    const timer = window.setTimeout(() => { window.location.href = '/' }, 2600)
    return () => window.clearTimeout(timer)
  }, [booking])

  const unlockLocker = async () => {
    if (!id || isConfirming || booking?.status !== 'confirmed') return
    setIsConfirming(true)
    const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unlock', id }) })
    if (response.ok) setBooking(await response.json())
    setIsConfirming(false)
  }

  const cancelBooking = async () => {
    if (!id || isConfirming) return
    setIsConfirming(true)
    const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close', id }) })
    if (response.ok) setBooking(await response.json())
    setIsConfirming(false)
  }

  const confirmBooking = async () => {
    if (!id || isConfirming || booking?.status === 'confirmed') return
    setIsConfirming(true)
    const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', id }) })
    if (response.ok) {
      const refreshed = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (refreshed.ok) setBooking(await refreshed.json())
    }
    setIsConfirming(false)
  }

  return <main className={`flex min-h-screen items-center justify-center bg-[#f4f4ed] p-6 text-[#181818] ${booking?.status === 'confirmed' ? 'lockit-status-confirmed' : booking?.status === 'closed' ? 'lockit-status-cancelled' : ''}`}><div className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl md:p-10"><div className="flex items-center justify-between gap-4"><a href="/" className="flex items-center gap-2 text-lg font-black tracking-[-0.08em]"><span className="flex size-7 items-center justify-center rounded-full bg-[#dfff00]"><LockKeyhole className="size-4" /></span>LOCKIT</a><a href="/#manage-bookings" className="rounded-full border border-black/10 px-4 py-2 text-xs font-bold transition-colors hover:bg-[#dfff00]">Manage bookings</a></div>{error ? <p className="mt-16 text-center text-[#73736a]">{error}</p> : !booking ? <p className="mt-16 text-center text-[#73736a]">Loading your locker access...</p> : <><div className="mt-12 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#77776d]">Live locker access</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">{booking.location}</h1></div><div className="flex size-14 items-center justify-center rounded-full bg-[#dfff00]"><ShieldCheck className="size-7" /></div></div><div className="mt-7 rounded-3xl bg-[#181818] p-6 text-white"><div className="grid gap-3 border-b border-white/10 pb-5 text-sm"><div className="flex justify-between gap-4"><span className="text-white/50">Customer</span><strong>{booking.name}</strong></div><div className="flex justify-between gap-4"><span className="text-white/50">Reserved</span><strong>{booking.hours} hours</strong></div><div className="flex justify-between gap-4"><span className="text-white/50">Booked amount</span><strong>€{bookedAmount.toFixed(2)}</strong></div><div className="flex justify-between gap-4"><span className="text-white/50">Access code</span><strong>{booking.accessCode}</strong></div></div>{booking.status === 'confirmed' && <div className="lockit-access-status lockit-confirmed-banner mb-6 rounded-2xl p-4 text-center text-sm font-black" role="status">✓ Booking confirmed</div>}{booking.status === 'closed' && <div className="lockit-access-status lockit-cancelled-banner mb-6 rounded-2xl p-4 text-center text-sm font-black" role="status">× Booking cancelled</div>}{booking.status !== 'confirmed' && booking.status !== 'closed' && <button type="button" onClick={confirmBooking} disabled={isConfirming} className="mt-6 w-full rounded-full bg-[#dfff00] px-5 py-4 text-sm font-black text-[#181818] disabled:opacity-60">{isConfirming ? 'Confirming locker…' : 'Confirm booking and start locker'}</button>}{booking.status === 'confirmed' && <button type="button" onClick={unlockLocker} disabled={isConfirming} className="lockit-unlock-button mt-6 w-full rounded-full bg-[#dfff00] px-5 py-4 text-sm font-black text-[#181818] disabled:opacity-60">{isConfirming ? 'Unlocking locker…' : 'Unlock locker and settle bill'}</button>}{booking.status !== 'closed' && <button type="button" onClick={cancelBooking} disabled={isConfirming} className="lockit-cancel-button mt-3 w-full rounded-full border-2 border-[#b54b4b]/30 px-5 py-3 text-sm font-black text-[#8b3030] transition-colors hover:border-[#b54b4b] hover:bg-[#fff0f0] disabled:opacity-60">{isConfirming ? 'Updating booking…' : 'Cancel booking'}</button>}<div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#dfff00]"><Clock3 className="size-4" /> {booking.status === 'confirmed' ? 'Booking confirmed' : 'Waiting for approval'}</div>{booking.status === 'confirmed' ? <><p className="mt-5 text-sm text-white/60">Time remaining</p><p className="mt-1 text-5xl font-black tabular-nums tracking-[-0.06em]">{timing.overtime ? `+${format(timing.overtime)}` : format(timing.remaining)}</p>{timing.overtime ? <p className="mt-3 rounded-xl bg-[#ffb4a8] px-4 py-3 text-sm font-bold text-[#181818]">Overtime fee: €{(overtimeCents / 100).toFixed(2)}</p> : <p className="mt-3 text-sm text-white/60">Timer started when this booking was approved.</p>}</> : <p className="mt-5 text-white/60">This link is ready. The timer will start automatically once the booking is approved in the other browser.</p>}</div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f4f4ed] p-4"><p className="text-xs text-[#77776d]">Locker</p><p className="mt-1 font-black">{booking.lockerSize}</p></div><div className="rounded-2xl bg-[#f4f4ed] p-4"><p className="text-xs text-[#77776d]">Access code</p><p className="mt-1 font-black tracking-[0.2em]">{booking.accessCode}</p></div></div><div className="mt-6 flex items-center gap-2 text-sm text-[#73736a]"><Check className="size-4 text-[#6f8500]" /> Keep this page open to monitor your booking.</div></>}</div></main>
}

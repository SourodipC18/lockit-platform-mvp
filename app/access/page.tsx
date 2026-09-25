'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, LockKeyhole, ShieldCheck, TimerReset } from 'lucide-react'

type Booking = { id: string; location: string; lockerSize: string; hours: number; status: string; accessCode: string; confirmedAt?: string; overtimeFeeCents?: number }

export default function AccessPage() {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const response = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (response.ok) setBooking(await response.json())
      else setError('This access link is not valid.')
    }
    void load()
    const poll = window.setInterval(load, 5000)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { window.clearInterval(poll); window.clearInterval(tick) }
  }, [id])

  const timing = useMemo(() => {
    if (!booking?.confirmedAt) return { elapsed: 0, remaining: booking?.hours ? booking.hours * 3600 : 0, overtime: 0 }
    const elapsed = Math.max(0, Math.floor((now - new Date(booking.confirmedAt).getTime()) / 1000))
    const duration = booking.hours * 3600
    return { elapsed, remaining: Math.max(0, duration - elapsed), overtime: Math.max(0, elapsed - duration) }
  }, [booking, now])
  const format = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const overtimeCents = Math.ceil(timing.overtime / 3600) * 200

  return <main className="flex min-h-screen items-center justify-center bg-[#f4f4ed] p-6 text-[#181818]"><div className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl md:p-10"><div className="flex items-center justify-between gap-4"><a href="/" className="flex items-center gap-2 text-lg font-black tracking-[-0.08em]"><span className="flex size-7 items-center justify-center rounded-full bg-[#dfff00]"><LockKeyhole className="size-4" /></span>LOCKIT</a><a href="/#manage-bookings" className="rounded-full border border-black/10 px-4 py-2 text-xs font-bold transition-colors hover:bg-[#dfff00]">Manage bookings</a></div>{error ? <p className="mt-16 text-center text-[#73736a]">{error}</p> : !booking ? <p className="mt-16 text-center text-[#73736a]">Loading your locker access...</p> : <><div className="mt-12 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#77776d]">Live locker access</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">{booking.location}</h1></div><div className="flex size-14 items-center justify-center rounded-full bg-[#dfff00]"><ShieldCheck className="size-7" /></div></div><div className="mt-7 rounded-3xl bg-[#181818] p-6 text-white"><div className="flex items-center gap-2 text-sm font-bold text-[#dfff00]"><Clock3 className="size-4" /> {booking.status === 'confirmed' ? 'Booking confirmed' : 'Waiting for approval'}</div>{booking.status === 'confirmed' ? <><p className="mt-5 text-sm text-white/60">Time remaining</p><p className="mt-1 text-5xl font-black tabular-nums tracking-[-0.06em]">{timing.overtime ? `+${format(timing.overtime)}` : format(timing.remaining)}</p>{timing.overtime ? <p className="mt-3 rounded-xl bg-[#ffb4a8] px-4 py-3 text-sm font-bold text-[#181818]">Overtime fee: €{(overtimeCents / 100).toFixed(2)}</p> : <p className="mt-3 text-sm text-white/60">Timer started when this booking was approved.</p>}</> : <p className="mt-5 text-white/60">This link is ready. The timer will start automatically once the booking is approved in the other browser.</p>}</div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f4f4ed] p-4"><p className="text-xs text-[#77776d]">Locker</p><p className="mt-1 font-black">{booking.lockerSize}</p></div><div className="rounded-2xl bg-[#f4f4ed] p-4"><p className="text-xs text-[#77776d]">Access code</p><p className="mt-1 font-black tracking-[0.2em]">{booking.accessCode}</p></div></div><div className="mt-6 flex items-center gap-2 text-sm text-[#73736a]"><Check className="size-4 text-[#6f8500]" /> Keep this page open to monitor your booking.</div></>}</div></main>
}

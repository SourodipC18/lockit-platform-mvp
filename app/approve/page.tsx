'use client'

import { useEffect, useState } from 'react'
import { Check, LockKeyhole, ShieldCheck } from 'lucide-react'

export default function ApprovePage() {
  const [booking, setBooking] = useState<any>(null)
  const [done, setDone] = useState(false)
  const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null
  useEffect(() => { if (id) fetch(`/api/bookings?id=${id}`).then(r => r.ok ? r.json() : null).then(setBooking) }, [id])
  const approve = async () => { if (!id) return; const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', id }) }); if (response.ok) { setBooking(await response.json()); setDone(true) } }
  return <main className="flex min-h-screen items-center justify-center bg-[#f4f4ed] p-6 text-[#181818]"><div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl"><div className="flex items-center gap-2 text-lg font-black tracking-[-0.08em]"><span className="flex size-7 items-center justify-center rounded-full bg-[#dfff00]"><LockKeyhole className="size-4" /></span>LOCKIT</div>{booking ? <><div className="mt-12 flex size-16 items-center justify-center rounded-full bg-[#dfff00]"><ShieldCheck className="size-8" /></div><p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#77776d]">Test QR approval</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">{done || booking.status === 'confirmed' ? 'Booking approved.' : 'Approve this booking.'}</h1><p className="mt-4 text-[#73736a]">{booking.location} · {booking.lockerSize} locker · {booking.hours} hours</p>{done || booking.status === 'confirmed' ? <div className="mt-8 rounded-2xl bg-[#dfff00] p-5 font-bold"><Check className="mr-2 inline" /> Confirmed. The customer can now open their locker.</div> : <button onClick={approve} className="mt-8 w-full rounded-full bg-[#181818] px-6 py-4 font-bold text-white">Approve and confirm</button>}</> : <p className="mt-12 text-[#73736a]">Scan a valid LOCKIT test QR code to continue.</p>}</div></main>
}

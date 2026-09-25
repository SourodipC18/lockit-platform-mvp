import { Pool } from 'pg'
import { NextResponse } from 'next/server'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function POST(request: Request) {
  const body = await request.json()
  const { action = 'create', id, location, lockerSize, hours, name, email } = body

  if (action === 'approve') {
    if (!id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    const result = await pool.query(
      'UPDATE lockit_bookings SET status = $1, confirmed_at = COALESCE(confirmed_at, NOW()) WHERE id = $2 RETURNING id, status, confirmed_at AS "confirmedAt", access_code AS "accessCode"',
      ['confirmed', id],
    )
    if (!result.rows[0]) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  }

  if (!location || !lockerSize || !hours || !name || !email) {
    return NextResponse.json({ error: 'Please complete all booking details' }, { status: 400 })
  }

  const bookingId = `LK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const accessCode = Math.floor(100000 + Math.random() * 900000).toString()
  const result = await pool.query(
    'INSERT INTO lockit_bookings (id, location, locker_size, hours, customer_name, customer_email, access_code) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, location, locker_size AS "lockerSize", hours, customer_name AS "name", customer_email AS "email", status, confirmed_at AS "confirmedAt", overtime_fee_cents AS "overtimeFeeCents", access_code AS "accessCode", created_at AS "createdAt", (current_database()) AS "database"',
    [bookingId, location, lockerSize, Number(hours), name.trim(), email.trim().toLowerCase(), accessCode],
  )
  return NextResponse.json(result.rows[0], { status: 201 })
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
  const result = await pool.query(
    'SELECT id, location, locker_size AS "lockerSize", hours, customer_name AS "name", customer_email AS "email", status, confirmed_at AS "confirmedAt", overtime_fee_cents AS "overtimeFeeCents", access_code AS "accessCode", created_at AS "createdAt" FROM lockit_bookings WHERE id = $1',
    [id],
  )
  if (!result.rows[0]) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  return NextResponse.json(result.rows[0])
}

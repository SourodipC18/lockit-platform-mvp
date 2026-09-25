import { Pool } from 'pg'
import { NextResponse } from 'next/server'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function POST(request: Request) {
  const body = await request.json()
  const { action = 'create', id, location, lockerSize, hours, name, email } = body

  if (action === 'approve' || action === 'start') {
    if (!id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    const result = await pool.query(
      'UPDATE lockit_bookings SET status = $1, confirmed_at = COALESCE(confirmed_at, NOW()) WHERE id = $2 RETURNING id, status, confirmed_at AS "confirmedAt", access_code AS "accessCode"',
      ['confirmed', id],
    )
    if (!result.rows[0]) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  }

  if (action === 'sync-overtime') {
    if (!id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    const result = await pool.query(
      `UPDATE lockit_bookings
       SET overtime_fee_cents = GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - confirmed_at)) / 3600)::int) * 200
       WHERE id = $1 AND status = 'confirmed' AND confirmed_at IS NOT NULL
       RETURNING id, overtime_fee_cents AS "overtimeFeeCents"`,
      [id],
    )
    if (!result.rows[0]) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  }

  if (!location || !lockerSize || !hours) {
    return NextResponse.json({ error: 'Please complete all booking details' }, { status: 400 })
  }

  const bookingId = `LK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const accessCode = Math.floor(100000 + Math.random() * 900000).toString()
  const result = await pool.query(
    `INSERT INTO lockit_bookings (id, location, locker_size, hours, customer_name, customer_email, access_code) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, location, locker_size AS "lockerSize", hours, customer_name AS "name", customer_email AS "email", status, confirmed_at AS "confirmedAt", overtime_fee_cents AS "overtimeFeeCents", access_code AS "accessCode", created_at AS "createdAt", CASE WHEN location IN ('City Centre', 'Nantes Station', 'Graslin') THEN 2 ELSE 1.5 END AS "pricePerHour"`,
    [bookingId, location, lockerSize, Number(hours), name?.trim() || 'Guest', email?.trim().toLowerCase() || '', accessCode],
  )
  return NextResponse.json(result.rows[0], { status: 201 })
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) {
    const result = await pool.query(
      `SELECT id, location, locker_size AS "lockerSize", hours, customer_name AS "name", status, confirmed_at AS "confirmedAt", overtime_fee_cents AS "overtimeFeeCents", access_code AS "accessCode", created_at AS "createdAt", CASE WHEN location IN ('City Centre', 'Nantes Station', 'Graslin') THEN 2 ELSE 1.5 END AS "pricePerHour" FROM lockit_bookings ORDER BY created_at DESC LIMIT 20`,
    )
    return NextResponse.json(result.rows)
  }
  const result = await pool.query(
    'SELECT id, location, locker_size AS "lockerSize", hours, customer_name AS "name", customer_email AS "email", status, confirmed_at AS "confirmedAt", overtime_fee_cents AS "overtimeFeeCents", access_code AS "accessCode", created_at AS "createdAt", CASE WHEN location IN (\'City Centre\', \'Nantes Station\', \'Graslin\') THEN 2 ELSE 1.5 END AS "pricePerHour" FROM lockit_bookings WHERE id = $1',
    [id],
  )
  if (!result.rows[0]) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  return NextResponse.json(result.rows[0])
}

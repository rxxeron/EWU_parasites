import { NextResponse } from 'next/server';
import { classifyTicket } from '../../lib/classifier';

export async function POST(req) {
  try {
    const data = await req.json();
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { ticket_id, message, channel, locale } = data;

    if (!ticket_id || typeof ticket_id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid required field: ticket_id' }, { status: 400 });
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid required field: message' }, { status: 400 });
    }

    if (channel && !['app', 'sms', 'call_center', 'merchant_portal'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid value for channel. Must be one of: app, sms, call_center, merchant_portal' }, { status: 400 });
    }

    if (locale && !['bn', 'en', 'mixed'].includes(locale)) {
      return NextResponse.json({ error: 'Invalid value for locale. Must be one of: bn, en, mixed' }, { status: 400 });
    }

    const res = await classifyTicket({ ticket_id, message, channel, locale });
    return NextResponse.json(res);
  } catch (err) {
    console.error('Error handling sort-ticket request:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

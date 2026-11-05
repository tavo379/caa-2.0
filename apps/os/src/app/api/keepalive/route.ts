import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Pings Supabase daily so the free-tier project doesn't pause after 7 days of inactivity.
// The endpoint only runs a trivial read, so auth is enforced only when CRON_SECRET is set.
// (Previously a missing CRON_SECRET made every cron call return 401 and Supabase was never hit.)
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET
    if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('clients').select('id').limit(1)

    if (error) {
        console.error('[keepalive] Supabase ping failed:', error.message)
        return Response.json({ ok: false, error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true, pingedAt: new Date().toISOString() })
}

import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Pings Supabase daily so the free-tier project doesn't pause after 7 days of inactivity.
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('clients').select('id').limit(1)

    if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true, pingedAt: new Date().toISOString() })
}

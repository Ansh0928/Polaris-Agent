import { sql } from '@/lib/db'
import { ShoppingCart, CheckCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-[#d2954220] text-[#d29542]',
  approved:  'bg-[#3fb95020] text-[#3fb950]',
  received:  'bg-[#58a6ff20] text-[#58a6ff]',
  cancelled: 'bg-[#f8514920] text-[#f85149]',
}

export default async function OrdersPage() {
  const rows = await sql`
    SELECT
      po.id,
      po.approve_token,
      po.qty,
      po.supplier,
      po.price_per_unit_aud,
      po.agent_reason,
      po.status,
      po.created_at,
      po.expires_at,
      p.name AS product_name,
      p.unit AS unit
    FROM purchase_orders po
    JOIN products p ON po.product_id = p.id
    ORDER BY po.created_at DESC
    LIMIT 100
  `

  const draft = rows.filter((r) => r.status === 'draft')
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  return (
    <div className="space-y-5 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-white">Purchase Orders</h1>
          <p className="text-[12px] text-[#484f58] mt-0.5">Draft orders created by the agent — approve to execute</p>
        </div>
        <div className="flex items-center gap-2">
          {draft.length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-[#d2954230] text-[#d29542]">
              {draft.length} pending
            </span>
          )}
          <span className="text-[12px] text-[#484f58]">{rows.length} total</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-5 py-12 text-center">
          <ShoppingCart size={28} className="mx-auto mb-3 text-[#484f58]" strokeWidth={1.5} />
          <p className="text-[#484f58] text-[13px]">No purchase orders yet.</p>
          <p className="text-[#484f58] text-[12px] mt-1">Run the agent to generate reorder recommendations.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const ts = new Date(row.created_at as string).toLocaleString('en-AU', {
              timeZone: 'Australia/Sydney',
              dateStyle: 'short',
              timeStyle: 'short',
            })
            const totalCost = row.price_per_unit_aud != null
              ? `$${(Number(row.price_per_unit_aud) * Number(row.qty)).toFixed(2)}`
              : null
            const approveUrl = `${appUrl}/api/orders/approve?token=${row.approve_token}`
            const isDraft = row.status === 'draft'
            const expired = isDraft && new Date(row.expires_at as string) < new Date()

            return (
              <div
                key={row.id as string}
                className="bg-[#0d1117] border border-[#21262d] rounded-lg px-5 py-4 hover:border-[#30363d] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-white">{row.product_name as string}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[row.status as string] ?? 'bg-[#21262d] text-[#8b949e]'}`}>
                        {row.status as string}
                      </span>
                      {expired && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f8514920] text-[#f85149]">
                          expired
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[12px] text-[#8b949e]">
                        {Number(row.qty)} {row.unit as string}
                      </span>
                      <span className="text-[#21262d]">·</span>
                      <span className="text-[12px] text-[#8b949e]">{row.supplier as string}</span>
                      {totalCost && (
                        <>
                          <span className="text-[#21262d]">·</span>
                          <span className="text-[12px] font-semibold text-[#c9d1d9]">{totalCost}</span>
                        </>
                      )}
                    </div>
                    {row.agent_reason && (
                      <p className="text-[11px] text-[#484f58] mt-1.5 leading-snug">{row.agent_reason as string}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[11px] text-[#484f58] whitespace-nowrap">{ts}</span>
                    {isDraft && !expired && (
                      <a
                        href={approveUrl}
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md bg-[#10b981] text-white hover:bg-[#059669] transition-colors"
                      >
                        <CheckCircle size={11} strokeWidth={2.5} />
                        Approve
                      </a>
                    )}
                    {isDraft && expired && (
                      <span className="flex items-center gap-1 text-[11px] text-[#484f58]">
                        <Clock size={11} strokeWidth={2} />
                        Expired
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

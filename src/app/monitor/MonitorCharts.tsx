'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface RunData {
  ran_at: string
  status: string
  tool_calls: number
  items_flagged: number
  tool_breakdown: Record<string, number>
}

const TOOL_COLORS = ['#1f6feb', '#3fb950', '#d29922', '#f85149', '#58a6ff', '#a371f7']

export function MonitorCharts({ runs, allTools }: { runs: RunData[]; allTools: string[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[#0d1117] border border-[#21262d] rounded-lg h-[280px] animate-pulse" />
        ))}
        <div className="col-span-2 bg-[#0d1117] border border-[#21262d] rounded-lg h-[300px] animate-pulse" />
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-5 py-12 text-center text-[#484f58] text-[13px]">
        No run data yet — trigger a run to populate charts.
      </div>
    )
  }

  const tooltipStyle = {
    backgroundColor: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 6,
    color: '#c9d1d9',
    fontSize: 12,
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Tool calls per run */}
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#21262d]">
          <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Tool Calls per Run</span>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={runs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="ran_at" tick={{ fontSize: 10, fill: '#484f58' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#484f58' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#161b22' }} />
              <Bar dataKey="tool_calls" radius={[3, 3, 0, 0]} name="Tool Calls" fill="#1f6feb" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Items flagged per run */}
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#21262d]">
          <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Items Flagged per Run</span>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={runs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="ran_at" tick={{ fontSize: 10, fill: '#484f58' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#484f58' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="items_flagged" stroke="#d29922" strokeWidth={2} dot={{ fill: '#d29922', r: 3 }} name="Items Flagged" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tool execution breakdown stacked bar */}
      {allTools.length > 0 && (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden col-span-2">
          <div className="px-5 py-3.5 border-b border-[#21262d]">
            <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Tool Execution Breakdown</span>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={runs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="ran_at" tick={{ fontSize: 10, fill: '#484f58' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#484f58' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#161b22' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />
                {allTools.map((tool, i) => (
                  <Bar key={tool} dataKey={(d: RunData) => d.tool_breakdown[tool] ?? 0} stackId="tools" fill={TOOL_COLORS[i % TOOL_COLORS.length]} name={tool} radius={i === allTools.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

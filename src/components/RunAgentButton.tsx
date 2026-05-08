'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Loader2, CheckCircle, XCircle, X, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface StreamEvent {
  type: 'tool_start' | 'tool_done' | 'reasoning' | 'loop_done' | 'done' | 'error' | 'email_sent'
  tool?: string
  args?: Record<string, unknown>
  output?: string
  duration_ms?: number
  text?: string
  iteration?: number
}

interface ToolCall {
  tool: string
  status: 'running' | 'done' | 'error'
  duration_ms?: number
}

export function RunAgentButton() {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [synthesizing, setSynthesizing] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [emailToast, setEmailToast] = useState<string | null>(null)
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [toolCalls])

  function reset() {
    setOpen(false)
    setRunning(false)
    setSynthesizing(false)
    setFinished(false)
    setError(null)
    setToolCalls([])
    setRunId(null)
    setEmailToast(null)
  }

  async function handleRun() {
    setOpen(true)
    setRunning(true)
    setSynthesizing(false)
    setFinished(false)
    setError(null)
    setToolCalls([])
    setRunId(null)

    try {
      const res = await fetch('/api/agent/run?stream=true', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_AGENT_SECRET}`,
        },
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => 'Unknown error')
        throw new Error(text)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt: StreamEvent = JSON.parse(line.slice(6))

            if (evt.type === 'tool_start' && evt.tool) {
              setToolCalls((prev) => [...prev, { tool: evt.tool!, status: 'running' }])
            } else if (evt.type === 'tool_done' && evt.tool) {
              setToolCalls((prev) =>
                prev.map((tc, i) =>
                  i === prev.length - 1 && tc.tool === evt.tool
                    ? { ...tc, status: evt.output?.startsWith('Error') ? 'error' : 'done', duration_ms: evt.duration_ms }
                    : tc
                )
              )
            } else if (evt.type === 'loop_done') {
              setRunning(false)
              setSynthesizing(true)
            } else if (evt.type === 'email_sent') {
              const to = evt.output || 'your inbox'
              setEmailToast(to)
              setTimeout(() => setEmailToast(null), 5000)
            } else if (evt.type === 'done') {
              setRunId(evt.output ?? null)
              setSynthesizing(false)
              setFinished(true)
              setRunning(false)
              router.refresh()
            } else if (evt.type === 'error') {
              setError(evt.output ?? 'Unknown error')
              setRunning(false)
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setRunning(false)
    }
  }

  return (
    <>
      {emailToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 px-4 py-2.5 bg-[#1a2a1a] border border-[#3fb950] rounded-lg shadow-xl text-[13px] text-[#3fb950] animate-fade-in">
          <CheckCircle size={14} className="shrink-0" />
          <span>Report emailed to <span className="font-mono text-white">{emailToast}</span></span>
        </div>
      )}
      <button
        onClick={handleRun}
        disabled={running}
        className="flex items-center gap-2 px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-50 text-white text-[13px] font-medium rounded-md transition-colors"
      >
        {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        {running ? 'Running...' : 'Run Polaris Now'}
      </button>

      {/* Drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
          <div className="pointer-events-auto w-[380px] bg-[#0d1117] border border-[#21262d] rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#21262d] shrink-0">
              <Zap size={13} className="text-[#58a6ff]" />
              <span className="text-[13px] font-semibold text-white flex-1">Agent Run</span>
              {(finished || error) && (
                <button onClick={reset} className="text-[#484f58] hover:text-white transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Tool calls list */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 min-h-[120px]">
              {toolCalls.length === 0 && running && (
                <div className="flex items-center gap-2 text-[12px] text-[#484f58] py-2">
                  <Loader2 size={12} className="animate-spin" />
                  Starting agent loop...
                </div>
              )}
              {synthesizing && (
                <div className="flex items-center gap-2 text-[12px] text-[#58a6ff] py-2">
                  <Loader2 size={12} className="animate-spin" />
                  Synthesising report...
                </div>
              )}
              {toolCalls.map((tc, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[12px]">
                  {tc.status === 'running' ? (
                    <Loader2 size={11} className="animate-spin text-[#58a6ff] shrink-0" />
                  ) : tc.status === 'error' ? (
                    <XCircle size={11} className="text-[#f85149] shrink-0" />
                  ) : (
                    <CheckCircle size={11} className="text-[#3fb950] shrink-0" />
                  )}
                  <span className={`font-mono ${tc.status === 'running' ? 'text-[#c9d1d9]' : tc.status === 'error' ? 'text-[#f85149]' : 'text-[#8b949e]'}`}>
                    {tc.tool}
                  </span>
                  {tc.duration_ms != null && (
                    <span className="text-[#484f58] ml-auto">{tc.duration_ms}ms</span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            {(finished || error) && (
              <div className={`px-4 py-3 border-t border-[#21262d] flex items-center gap-2 text-[12px] shrink-0 ${error ? 'bg-[#290d0d]' : 'bg-[#0f2a0f]'}`}>
                {error ? (
                  <>
                    <XCircle size={13} className="text-[#f85149]" />
                    <span className="text-[#f85149] flex-1 truncate">{error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={13} className="text-[#3fb950]" />
                    <span className="text-[#3fb950] flex-1">Run complete — {toolCalls.length} tool calls</span>
                    {runId && (
                      <a href={`/runs/${runId}`} className="text-[#58a6ff] hover:underline shrink-0">
                        View trace →
                      </a>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

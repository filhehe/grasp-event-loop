import { useEffect, useRef, type KeyboardEvent } from 'react'
import { tokenize } from '../highlight.ts'
import { BlockHelp } from './BlockHelp.tsx'
import { useVisualizer } from '../store.ts'

const LINE = 22
const PAD = 14

const TONE = {
  plain: 'tok-plain',
  keyword: 'tok-keyword',
  function: 'tok-function',
  string: 'tok-string',
  number: 'tok-number',
  comment: 'tok-comment',
  punct: 'tok-punct',
} as const

export function Editor() {
  const code = useVisualizer((state) => state.code)
  const setCode = useVisualizer((state) => state.setCode)
  const line = useVisualizer((state) => {
    if (state.errorLine) return state.errorLine
    if (state.index >= 0) return state.steps[state.index]?.line ?? null
    return null
  })
  const invalid = useVisualizer((state) => state.errorLine != null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lines = code.split('\n')
  const tokens = tokenize(code)

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || !line) return
    const top = PAD + (line - 1) * LINE
    const visible = top >= scroller.scrollTop && top + LINE <= scroller.scrollTop + scroller.clientHeight
    if (!visible) scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 3)
  }, [line])

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const area = event.currentTarget
    const start = area.selectionStart
    const end = area.selectionEnd
    const next = `${code.slice(0, start)}  ${code.slice(end)}`
    setCode(next)
    requestAnimationFrame(() => {
      area.selectionStart = start + 2
      area.selectionEnd = start + 2
    })
  }

  return (
    <section className="panel flex min-h-72 flex-col" aria-label="Редактор кода">
      <h2 className="panel-title">
        editor
        <BlockHelp
          label="editor"
          text="Код, который выполняет визуализатор. На каждом шаге подсвечивается текущая строка, поэтому видно, какая инструкция сейчас работает."
          href="https://developer.mozilla.org/ru/docs/Web/JavaScript/Guide"
        />
      </h2>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full min-w-full">
          <div className="editor-gutter sticky left-0 z-10 shrink-0" aria-hidden="true">
            {lines.map((_, index) => {
              const number = index + 1
              const active = number === line
              return (
                <span key={number} className={active ? (invalid ? 'text-[#fb7185]' : 'text-[#e9eef8]') : undefined}>
                  {number}
                </span>
              )
            })}
          </div>
          <div className="relative min-h-full min-w-0 flex-1">
            {line ? (
              <div
                className={`pointer-events-none absolute right-0 left-0 ${invalid ? 'bg-[#fb7185]/10' : 'bg-white/[0.045]'}`}
                style={{ top: PAD + (line - 1) * LINE, height: LINE }}
              />
            ) : null}
            <pre className="editor-text pointer-events-none min-h-full" aria-hidden="true">
              {tokens.map((token, index) => (
                <span key={index} className={TONE[token.tone]}>
                  {token.text}
                </span>
              ))}
            </pre>
            <textarea
              className="editor-text absolute inset-0 min-h-full w-full resize-none overflow-hidden bg-transparent text-transparent caret-[#e8fff3] outline-none"
              value={code}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Код"
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

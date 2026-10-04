import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { tokenize } from '../highlight.ts'
import { BlockHelp } from './BlockHelp.tsx'
import { useVisualizer, type HoverMark } from '../store.ts'

const LINE = 22
const PAD = 22
const TEXT_PAD = 16

const TONE = {
  plain: 'tok-plain',
  keyword: 'tok-keyword',
  function: 'tok-function',
  string: 'tok-string',
  number: 'tok-number',
  comment: 'tok-comment',
  punct: 'tok-punct',
} as const

function columns(text: string) {
  let count = 0
  for (const char of text) count += char === '\t' ? 2 : 1
  return count
}

function hoverMarks(code: string, hover: HoverMark) {
  if (hover.start == null || hover.end == null || hover.end <= hover.start) {
    return [{ line: hover.line, left: 0, width: null as number | null }]
  }
  const lines = code.split('\n')
  const marks: { line: number; left: number; width: number | null }[] = []
  let offset = 0
  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index]
    const lineStart = offset
    const lineEnd = offset + text.length
    if (hover.end > lineStart && hover.start < lineEnd) {
      const from = Math.max(hover.start, lineStart) - lineStart
      const to = Math.min(hover.end, lineEnd) - lineStart
      marks.push({ line: index + 1, left: columns(text.slice(0, from)), width: Math.max(1, columns(text.slice(from, to))) })
    }
    offset = lineEnd + 1
  }
  return marks.length ? marks : [{ line: hover.line, left: 0, width: null }]
}

export function Editor() {
  const code = useVisualizer((state) => state.code)
  const setCode = useVisualizer((state) => state.setCode)
  const hover = useVisualizer((state) => state.hover)
  const line = useVisualizer((state) => {
    if (state.errorLine) return state.errorLine
    if (state.index >= 0) return state.steps[state.index]?.line ?? null
    return null
  })
  const invalid = useVisualizer((state) => state.errorLine != null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [charWidth, setCharWidth] = useState(7.8)
  const lines = code.split('\n')
  const tokens = tokenize(code)
  const marks = hover ? hoverMarks(code, hover) : []
  const hoverLines = new Set(marks.map((mark) => mark.line))

  useLayoutEffect(() => {
    const node = measureRef.current
    if (!node) return
    const apply = () => {
      const width = node.getBoundingClientRect().width / 10
      if (width > 0) setCharWidth((current) => (Math.abs(current - width) < 0.05 ? current : width))
    }
    apply()
    const ready = document.fonts?.ready
    if (!ready) return
    let cancel = false
    ready.then(() => {
      if (!cancel) apply()
    })
    return () => {
      cancel = true
    }
  }, [code])

  useEffect(() => {
    const scroller = scrollRef.current
    const target = hover ? (marks[0]?.line ?? hover.line) : line
    if (!scroller || !target) return
    const top = PAD + (target - 1) * LINE
    const visible = top >= scroller.scrollTop && top + LINE <= scroller.scrollTop + scroller.clientHeight
    if (!visible) scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 3)
  }, [line, hover, code])

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
    <section className="panel flex h-full min-h-0 flex-col" aria-label="Редактор кода">
      <h2 className="zone-label">
        editor
        <BlockHelp
          label="editor"
          text="Код, который выполняет визуализатор. На каждом шаге подсвечивается текущая строка, поэтому видно, какая инструкция сейчас работает."
          href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"
        />
      </h2>
      <div ref={scrollRef} className="editor-scroll min-h-0 flex-1">
        <div className="editor-sheet">
          <div className="editor-gutter sticky left-0 z-10 shrink-0" aria-hidden="true">
            {lines.map((_, index) => {
              const number = index + 1
              const active = number === line
              const hovered = hoverLines.has(number)
              const gutter = active ? (invalid ? 'is-error' : 'is-current') : hovered ? 'is-hover' : undefined
              return (
                <span key={number} className={gutter}>
                  {number}
                </span>
              )
            })}
          </div>
          <div className="editor-code">
            {line ? (
              <div
                className={`editor-line pointer-events-none absolute right-0 left-0 ${invalid ? 'is-error' : ''}`}
                style={{ top: PAD + (line - 1) * LINE, height: LINE }}
              />
            ) : null}
            {marks.map((mark) => (
              <div
                key={mark.line}
                className="editor-hover pointer-events-none absolute"
                style={{
                  top: PAD + (mark.line - 1) * LINE,
                  height: LINE,
                  left: mark.width == null ? 0 : TEXT_PAD + mark.left * charWidth,
                  width: mark.width == null ? '100%' : mark.width * charWidth,
                }}
              />
            ))}
            <span ref={measureRef} className="editor-measure" aria-hidden="true">
              0000000000
            </span>
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

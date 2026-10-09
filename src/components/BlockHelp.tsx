import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MARGIN = 8

function placeTip(button: HTMLButtonElement, tip: HTMLElement) {
  const bounds = button.getBoundingClientRect()
  const width = Math.min(280, window.innerWidth - MARGIN * 2)
  tip.style.width = `${width}px`
  const height = tip.offsetHeight
  let left = bounds.right - width
  if (left < MARGIN) left = Math.min(Math.max(MARGIN, bounds.left), window.innerWidth - width - MARGIN)
  let top = bounds.bottom + MARGIN
  if (top + height > window.innerHeight - MARGIN) {
    const above = bounds.top - MARGIN - height
    top = above >= MARGIN ? above : Math.max(MARGIN, window.innerHeight - height - MARGIN)
  }
  tip.style.left = `${left}px`
  tip.style.top = `${top}px`
}

export function BlockHelp({ label, text, href }: { label: string; text: string; href: string }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const id = useId()

  useLayoutEffect(() => {
    if (!open) return
    const button = buttonRef.current
    const tip = tipRef.current
    if (!button || !tip) return
    const place = () => placeTip(button, tip)
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, text])

  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (buttonRef.current?.contains(target) || tipRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="block-help"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`What is ${label}`}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      {open
        ? createPortal(
            <div ref={tipRef} id={id} role="region" aria-label={label} className="block-help-tip">
              <p className="block-help-title">{label}</p>
              <p>{text}</p>
              <a className="block-help-link" href={href} target="_blank" rel="noreferrer">
                Open on MDN
              </a>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

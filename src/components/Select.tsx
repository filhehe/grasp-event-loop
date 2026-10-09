import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type SelectOption = { value: string; label: string; done?: boolean }

function placeMenu(button: HTMLButtonElement, menu: HTMLElement) {
  const bounds = button.getBoundingClientRect()
  const maxWidth = Math.min(360, window.innerWidth - 16)
  menu.style.minWidth = `${Math.min(bounds.width, maxWidth)}px`
  menu.style.maxWidth = `${maxWidth}px`
  const width = Math.min(Math.max(bounds.width, menu.scrollWidth), maxWidth)
  menu.style.width = `${width}px`
  let left = bounds.left
  if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width)
  const height = menu.offsetHeight
  let top = bounds.bottom + 6
  if (top + height > window.innerHeight - 8) {
    const above = bounds.top - 6 - height
    top = above >= 8 ? above : 8
  }
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`
}

export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.findIndex((option) => option.value === value)
  const current = options[selected] ?? options[0]

  useLayoutEffect(() => {
    if (!open) return
    const button = buttonRef.current
    const menu = menuRef.current
    if (!button || !menu) return
    const place = () => placeMenu(button, menu)
    place()
    const chosen = menu.querySelector<HTMLElement>('[aria-selected="true"]')
    chosen?.scrollIntoView({ block: 'nearest' })
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, options])

  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setActive((index) => {
          const count = options.length
          if (count === 0) return 0
          return (index + step + count) % count
        })
        return
      }
      if (event.key === 'Home') {
        event.preventDefault()
        setActive(0)
        return
      }
      if (event.key === 'End') {
        event.preventDefault()
        setActive(Math.max(0, options.length - 1))
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const option = options[active]
        if (option) onChange(option.value)
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, active, options, onChange])

  useEffect(() => {
    if (!open) return
    const node = menuRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function toggle() {
    setOpen((next) => {
      if (!next) setActive(selected >= 0 ? selected : 0)
      return !next
    })
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`ui-select ${open ? 'is-open' : ''} ${className ?? ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={toggle}
        onKeyDown={(event) => {
          if (open) return
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setActive(selected >= 0 ? selected : 0)
            setOpen(true)
          }
        }}
      >
        <span className="ui-select-value">{current?.label ?? ''}</span>
        <svg className="ui-select-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6.5 8 10.5 12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              className="ui-select-menu"
              role="listbox"
              aria-label={ariaLabel}
              onMouseDown={(event) => event.preventDefault()}
            >
              {options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  data-index={index}
                  id={`${listId}-${index}`}
                  className={`ui-select-option ${option.value === value ? 'is-selected' : ''} ${index === active ? 'is-active' : ''}`}
                  aria-selected={option.value === value}
                  aria-label={option.done ? `${option.label}, completed` : undefined}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                    buttonRef.current?.focus()
                  }}
                >
                  <span className="ui-select-option-label">{option.label}</span>
                  {option.done ? (
                    <svg className="ui-select-check" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

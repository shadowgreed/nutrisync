'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Accessibility hook for modal dialogs. Attach the returned ref to the dialog
 * container. While mounted it:
 *  - traps Tab focus inside the container,
 *  - moves focus to the first focusable element on open,
 *  - restores focus to the element that opened the dialog on close,
 *  - calls `onClose` when Escape is pressed.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
) {
  const ref = useRef<T>(null)
  // Keep the latest onClose without re-running the effect each render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const node = ref.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        el => el.offsetParent !== null || el === document.activeElement,
      )

    // Move focus into the dialog.
    const first = focusables()[0]
    if (first) first.focus()
    else node?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const els = focusables()
      if (els.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = els[0]
      const lastEl = els[els.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Restore focus to whatever opened the dialog.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [])

  return ref
}

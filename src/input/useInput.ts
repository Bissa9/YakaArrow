import { useEffect, useRef } from 'react'

export type InputState = {
  space: boolean
  shift: boolean
  left: boolean
  right: boolean
  rise: boolean
  dive: boolean
  mx: number
  my: number
}

const empty = (): InputState => ({
  space: false,
  shift: false,
  left: false,
  right: false,
  rise: false,
  dive: false,
  mx: 0,
  my: 0,
})

function applyKey(state: InputState, code: string, down: boolean) {
  switch (code) {
    case 'Space':
      state.space = down
      break
    case 'ShiftLeft':
    case 'ShiftRight':
      state.shift = down
      break
    case 'KeyA':
    case 'ArrowLeft':
      state.left = down
      break
    case 'KeyD':
    case 'ArrowRight':
      state.right = down
      break
    case 'KeyW':
    case 'ArrowUp':
      state.rise = down
      break
    case 'KeyS':
    case 'ArrowDown':
      state.dive = down
      break
    default:
      break
  }
}

export function useInput() {
  const ref = useRef<InputState>(empty())

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      applyKey(ref.current, event.code, event.type === 'keydown')
      if (event.code === 'Space') event.preventDefault()
    }

    const onMouseMove = (event: MouseEvent) => {
      const dragging = event.buttons === 1
      const locked = document.pointerLockElement !== null
      if (!locked && !dragging) return
      ref.current.mx += event.movementX
      ref.current.my += event.movementY
    }

    let lastX = 0
    let lastY = 0
    const onTouchStart = (event: TouchEvent) => {
      const t = event.touches[0]
      if (!t) return
      lastX = t.clientX
      lastY = t.clientY
    }
    const onTouchMove = (event: TouchEvent) => {
      const t = event.touches[0]
      if (!t) return
      ref.current.mx += t.clientX - lastX
      ref.current.my += t.clientY - lastY
      lastX = t.clientX
      lastY = t.clientY
      event.preventDefault()
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('blur', () => {
      ref.current = empty()
    })

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return ref
}

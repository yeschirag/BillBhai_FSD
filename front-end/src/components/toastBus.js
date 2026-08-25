/* Minimal toast bus: import { toast } anywhere, render <ToastHost /> once. */

let listeners = []
let nextId = 0

function push(type, message) {
  const entry = { id: (nextId += 1), type, message }
  listeners.forEach((listener) => listener(entry))
}

export const toast = {
  success: (message) => push('success', message),
  error: (message) => push('error', message),
  info: (message) => push('info', message),
}

export function subscribeToToasts(listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((item) => item !== listener)
  }
}

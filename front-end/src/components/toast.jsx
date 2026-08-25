import { useEffect, useState } from 'react'
import { subscribeToToasts } from './toastBus.js'

export function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const timers = new Map()

    const unsubscribe = subscribeToToasts((entry) => {
      setToasts((prev) => [...prev.slice(-3), entry])
      timers.set(
        entry.id,
        setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== entry.id))
        }, 3800),
      )
    })

    return () => {
      unsubscribe()
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="toast-host">
      {toasts.map((item) => (
        <div key={item.id} className={`toast ${item.type}`} role="status">
          {item.message}
        </div>
      ))}
    </div>
  )
}

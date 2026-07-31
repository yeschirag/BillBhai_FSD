import { useEffect, useState } from 'react'
import {
  getWorkspaceSyncKeys,
  loadWorkspaceState,
  persistWorkspaceState,
} from '../services/workspaceService.js'

const INITIAL_STATE = {
  businesses: [],
  dataByBusiness: {},
  notifications: [],
  cashierData: { catalog: [], promos: {}, settings: { deliveryCharge: 0 } },
  customers: {},
  activeBusinessId: '',
  activeBusiness: null,
  activeData: {
    orders: [],
    inventory: [],
    deliveries: [],
    returns: [],
    users: [],
  },
  currentUser: null,
  sessionNotifications: [],
}

export function useWorkspaceData() {
  const [state, setState] = useState(INITIAL_STATE)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = async () => {
    setError('')
    setIsLoading(true)

    try {
      const nextState = await loadWorkspaceState()
      setState(nextState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    const trackedKeys = new Set(getWorkspaceSyncKeys())

    const handleStorage = (event) => {
      if (!event.key || trackedKeys.has(event.key)) {
        refresh()
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const mutateWorkspace = async (updater) => {
    try {
      const snapshot = await loadWorkspaceState()
      const draft = typeof structuredClone === 'function'
        ? structuredClone(snapshot)
        : JSON.parse(JSON.stringify(snapshot))

      const result = await updater(draft)
      persistWorkspaceState(draft)

      const nextState = await loadWorkspaceState()
      setState(nextState)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update workspace state.')
      return null
    }
  }

  return {
    ...state,
    isLoading,
    error,
    refresh,
    mutateWorkspace,
  }
}

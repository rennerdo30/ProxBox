import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { api } from '../services/api'

export function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setData(null)
    setError('')
    api
      .get<T>(url, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setData(response.data)
      })
      .catch((reason) => {
        if (!controller.signal.aborted && !axios.isCancel(reason))
          setError('Could not load this information. Please retry.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [url, revision])
  return { data, error, loading, reload }
}

import { useEffect } from 'react'
import { applyTheme, getColorScheme, subscribeTheme } from '../utils/theme'

export function useTheme() {
  useEffect(() => {
    applyTheme(getColorScheme())
    return subscribeTheme(applyTheme)
  }, [])
}

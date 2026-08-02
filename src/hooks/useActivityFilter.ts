import { createContext, useContext } from 'react'

interface ActivityFilterCtx {
  selectedActivityId: string | null
  setSelectedActivityId: (id: string | null) => void
}

export const ActivityFilterContext = createContext<ActivityFilterCtx>({
  selectedActivityId: null,
  setSelectedActivityId: () => {},
})

export function useActivityFilter() {
  return useContext(ActivityFilterContext)
}

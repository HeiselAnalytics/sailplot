import { useEffect, useRef } from 'react'
import {
  loadLastProject,
  loadLayoutPreference,
  saveLayoutPreference,
  saveProject,
} from '../services/database'
import { useEditorStore } from '../stores/editorStore'
import { useSailPlotConfig } from '../providers/SailPlotConfigProvider'

export function usePersistence() {
  const { storageNamespace } = useSailPlotConfig()
  const scenario = useEditorStore((state) => state.scenario)
  const layoutPreference = useEditorStore((state) => state.layoutPreference)
  const hydrated = useEditorStore((state) => state.hydrated)
  const setScenario = useEditorStore((state) => state.setScenario)
  const setHydrated = useEditorStore((state) => state.setHydrated)
  const setStatus = useEditorStore((state) => state.setStatus)
  const setDocumentStatus = useEditorStore((state) => state.setDocumentStatus)
  const setLayoutPreference = useEditorStore((state) => state.setLayoutPreference)
  const initialScenarioId = useRef(scenario.metadata.id)

  useEffect(() => {
    Promise.all([loadLastProject(storageNamespace), loadLayoutPreference(storageNamespace)])
      .then(([stored, preference]) => {
        if (
          stored &&
          useEditorStore.getState().scenario.metadata.id === initialScenarioId.current
        ) {
          setScenario(stored, 'Restored local work')
          setDocumentStatus('browser')
        }
        setLayoutPreference(preference)
      })
      .catch(() => setStatus('Local storage is unavailable; work remains in this tab.'))
      .finally(() => setHydrated(true))
  }, [
    setDocumentStatus,
    setHydrated,
    setLayoutPreference,
    setScenario,
    setStatus,
    storageNamespace,
  ])

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => {
      saveProject(scenario, storageNamespace)
        .then(() => {
          const state = useEditorStore.getState()
          if (state.scenario === scenario && state.documentStatus !== 'downloaded') {
            setDocumentStatus('browser')
          }
          setStatus('Saved locally')
        })
        .catch(() => {
          if (useEditorStore.getState().scenario === scenario) setDocumentStatus('unsaved')
          setStatus('Could not autosave locally')
        })
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [hydrated, scenario, setDocumentStatus, setStatus, storageNamespace])

  useEffect(() => {
    if (!hydrated) return
    void saveLayoutPreference(layoutPreference, storageNamespace)
  }, [hydrated, layoutPreference, storageNamespace])
}

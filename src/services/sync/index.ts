/**
 * Sync Service Index
 *
 * Re-exports all sync-related functionality.
 */

// Event service
export {
  createSyncEvent,
  getUnprocessedEvents,
  markEventProcessed,
  markEventsProcessed,
  getEventById,
  getRecentEvents,
  countUnprocessedEvents,
  type SyncEventType,
  type EventPayload,
} from './events'

// Context builder
export {
  buildGenerationContext,
  getModuleContext,
  type GenerationContext,
} from './context'

// Module executor
export {
  executeModuleSync,
  retryFailedModules,
  ALL_MODULES,
  type ModuleName,
  type ModuleExecutionOptions,
  type ExecutionProgress,
  type ProgressCallback,
} from './executor'

// Main orchestrator
export {
  triggerSyncAll,
  getSyncStatus,
  getSyncJob,
  listSyncJobs,
  retrySyncJob,
  type SyncOptions,
  type SyncResult,
} from './orchestrator'

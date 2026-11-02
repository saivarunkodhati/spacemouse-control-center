export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
  /** Timestamp of the last tracked change, used to merge rapid edits (e.g. slider drags) into one step. */
  lastChangeAt: number
}

export type HistoryAction<T> =
  | { type: 'set'; value: T; at: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; value: T }

const LIMIT = 100
const COALESCE_MS = 600

export function createHistory<T>(value: T): HistoryState<T> {
  return { past: [], present: value, future: [], lastChangeAt: 0 }
}

export function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
  switch (action.type) {
    case 'set': {
      if (JSON.stringify(action.value) === JSON.stringify(state.present)) return state
      const coalesce = state.past.length > 0 && action.at - state.lastChangeAt < COALESCE_MS
      return {
        past: coalesce ? state.past : [...state.past, state.present].slice(-LIMIT),
        present: action.value,
        future: [],
        lastChangeAt: action.at,
      }
    }
    case 'undo': {
      if (state.past.length === 0) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
        lastChangeAt: 0,
      }
    }
    case 'redo': {
      if (state.future.length === 0) return state
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
        lastChangeAt: 0,
      }
    }
    case 'reset':
      return createHistory(action.value)
  }
}

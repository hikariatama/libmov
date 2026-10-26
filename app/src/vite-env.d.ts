/// <reference types="vite/client" />

import type { LibmovApi } from '../shared/ipc'

declare global {
  interface Window {
    libmov: LibmovApi
  }
}

export {}

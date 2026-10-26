export const isMac = typeof window !== 'undefined' && window.libmov?.platform === 'darwin'

const mod = isMac ? '⌘' : 'Ctrl'

export const shortcuts = {
  back: ['esc'],
  later: [mod, 'L'],
  move: ['↑', '↓'],
  open: ['↵'],
  search: [mod, 'K'],
  watched: [mod, 'D'],
} as const

export function isModKey(event: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return isMac ? event.metaKey : event.ctrlKey
}

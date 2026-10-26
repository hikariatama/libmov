import { useElementSize } from './use-element-size'

const minColumnWidth = 148
export const columnGap = 20
const captionHeight = 44
const rowGap = 24

export interface GridLayout {
  columnWidth: number
  columns: number
  rowHeight: number
}

export function useGridLayout() {
  const { ref, size } = useElementSize<HTMLDivElement>()
  const width = size.width
  const columns = width > 0 ? Math.max(2, Math.floor((width + columnGap) / (minColumnWidth + columnGap))) : 6
  const columnWidth = width > 0 ? (width - columnGap * (columns - 1)) / columns : minColumnWidth
  const layout: GridLayout = {
    columnWidth,
    columns,
    rowHeight: columnWidth * 1.5 + captionHeight + rowGap,
  }

  return { layout, ref, ready: width > 0 }
}

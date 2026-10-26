import { useEffect, useState } from 'react'

type ElementSize = {
  height: number
  width: number
}

export function useElementSize<T extends HTMLElement>(): {
  ref: (node: T | null) => void
  size: ElementSize
} {
  const [node, setNode] = useState<T | null>(null)
  const [size, setSize] = useState<ElementSize>({ height: 0, width: 0 })

  useEffect(() => {
    if (!node) {
      return
    }

    const updateSize = () => {
      const nextSize = {
        height: node.clientHeight,
        width: node.clientWidth,
      }

      setSize((currentSize) =>
        currentSize.height === nextSize.height && currentSize.width === nextSize.width
          ? currentSize
          : nextSize,
      )
    }

    updateSize()

    const observer = new ResizeObserver(() => {
      updateSize()
    })

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [node])

  return {
    ref: setNode,
    size,
  }
}

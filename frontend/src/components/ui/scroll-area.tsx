import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { cn } from '@/lib/utils'

function setRef<T>(ref: React.ForwardedRef<T>, value: T) {
  if (typeof ref === 'function') ref(value)
  else if (ref && 'current' in ref) (ref as any).current = value
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, forwardedRef) => {
  const localRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const root = localRef.current
    const vp = root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null
    if (!root || !vp) return
    let timer: number | null = null
    const onScroll = () => {
      root.setAttribute('data-scrolling', 'true')
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        root.removeAttribute('data-scrolling')
      }, 120)
    }
    vp.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (timer) window.clearTimeout(timer)
      vp.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <ScrollAreaPrimitive.Root
      ref={(el) => { localRef.current = el as any; setRef(forwardedRef, el as any) }}
      className={cn('relative overflow-hidden group/sa', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar forceMount />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
})
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none',
      // Visible only on hover or while scrolling
      'opacity-0 pointer-events-none group-hover/sa:opacity-100 group-hover/sa:pointer-events-auto data-[scrolling=true]:opacity-100 data-[scrolling=true]:pointer-events-auto',
      'transition-opacity duration-50',
      orientation === 'vertical'
        ? 'h-full w-2.5 border-l border-l-transparent p-[1px]'
        : 'h-2.5 border-t border-t-transparent p-[1px]',
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-muted-foreground/30" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar } 
"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  ChevronsLeft,
  ChevronsRight,
  Menu,
  type LucideIcon,
} from "lucide-react"
import * as React from "react"

const SIDEBAR_ID = "sidebar"
const SIDEBAR_TRIGGER_ID = "sidebar-trigger"

interface SidebarContextValue {
  isOpen: boolean
  isMobile: boolean
  onToggle: () => void
  onOpen: () => void
  onClose: () => void
}

const SidebarContext = React.createContext({} as SidebarContextValue)

export function useSidebar() {
  return React.useContext(SidebarContext)
}

interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = React.useState(!isMobile)

  const onToggle = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const onOpen = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const onClose = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const contextValue = React.useMemo(
    () => ({ isOpen, isMobile, onToggle, onOpen, onClose }),
    [isOpen, isMobile, onToggle, onOpen, onClose]
  )

  if (isMobile) {
    return (
      <SidebarContext.Provider value={contextValue}>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          {children}
        </Sheet>
      </SidebarContext.Provider>
    )
  }

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  )
}

function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { isMobile, onToggle } = useSidebar()

  if (isMobile) {
    return (
      <SheetContent
        side="left"
        id={SIDEBAR_ID}
        aria-labelledby={SIDEBAR_TRIGGER_ID}
        className="w-full max-w-xs"
      >
        <SidebarBody />
      </SheetContent>
    )
  }

  return (
    <Button
      id={SIDEBAR_TRIGGER_ID}
      aria-label="Toggle sidebar"
      aria-controls={SIDEBAR_ID}
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      onClick={onToggle}
      {...props}
    >
      {props.children}
    </Button>
  )
}

function SidebarDesktop({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const { isOpen } = useSidebar()
  return (
    <aside
      id={SIDEBAR_ID}
      className={cn(
        "z-10 hidden shrink-0 transition-[width] md:block",
        isOpen ? "w-64" : "w-16",
        className
      )}
      {...props}
    />
  )
}

function SidebarBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isOpen } = useSidebar()
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden border-r bg-background py-3",
        className
      )}
      style={{
        paddingInline: isOpen
          ? "calc(0.75rem + var(--safe-area-inset-left))"
          : undefined,
      }}
      {...props}
    />
  )
}

function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-1", className)} {...props} />
}

function SidebarHeaderTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const { isOpen } = useSidebar()
  return (
    <h2
      className={cn(
        "whitespace-nowrap text-lg font-semibold tracking-tight transition-opacity",
        !isOpen && "opacity-0",
        className
      )}
      {...props}
    />
  )
}

function SidebarNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex flex-1 flex-col justify-center", className)}
      {...props}
    />
  )
}

function SidebarNavGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-1", className)} {...props} />
}

function SidebarGroupLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const { isOpen } = useSidebar()
  return (
    <h2
      className={cn(
        "whitespace-nowrap px-3 py-2 text-sm font-medium text-muted-foreground/70 transition-opacity",
        !isOpen && "w-0 opacity-0",
        className
      )}
      {...props}
    />
  )
}

interface SidebarNavLinkProps {
  href: string
  icon: LucideIcon
  children: React.ReactNode
  isActive?: boolean
}

function SidebarNavLink({
  href,
  icon: Icon,
  isActive,
  children,
}: SidebarNavLinkProps) {
  const { isOpen } = useSidebar()
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={cn(
        "h-auto justify-start gap-3 px-3 py-2",
        !isOpen && "w-min"
      )}
      asChild
    >
      <a href={href}>
        <Icon className="size-4 shrink-0" />
        <span
          className={cn(
            "whitespace-nowrap transition-opacity",
            !isOpen && "w-0 opacity-0"
          )}
        >
          {children}
        </span>
      </a>
    </Button>
  )
}

function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isOpen, isMobile, onToggle } = useSidebar()

  if (isMobile) return null

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-end px-1",
        className
      )}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onToggle}
      >
        {isOpen ? (
          <ChevronsLeft className="size-4" />
        ) : (
          <ChevronsRight className="size-4" />
        )}
      </Button>
    </div>
  )
}

function SidebarMobileTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { isMobile, isOpen, onToggle } = useSidebar()

  if (!isMobile) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      onClick={onToggle}
      {...props}
    >
      <Menu />
    </Button>
  )
}

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex-1 peer-data-[variant=icon]:pl-16 peer-data-[variant=inset]:ml-64",
        className
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

export {
  SIDEBAR_ID,
  SIDEBAR_TRIGGER_ID,
  SidebarTrigger,
  SidebarMobileTrigger,
  SidebarDesktop,
  SidebarBody,
  SidebarHeader,
  SidebarHeaderTitle,
  SidebarNav,
  SidebarNavGroup,
  SidebarGroupLabel,
  SidebarNavLink,
  SidebarFooter,
  SidebarInset,
}

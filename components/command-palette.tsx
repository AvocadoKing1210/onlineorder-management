"use client"

import * as React from "react"
import {
  Search,
  ClipboardList,
  QrCode,
  SquareMenu,
  ListOrdered,
  Tags,
  Bell,
  Star,
  BarChart3,
  Boxes,
  Settings,
} from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground bg-background/60 hover:bg-accent hover:text-accent-foreground ring-sidebar-ring group flex h-8 w-full items-center gap-2 rounded-md border px-2 text-left text-xs outline-hidden transition-colors"
      >
        <Search className="size-4" />
        <span className="truncate">Search…</span>
        <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Type a command or search…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Operations">
              <CommandItem onSelect={() => setOpen(false)}>
                <ClipboardList />
                <span>Orders</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <QrCode />
                <span>QR Codes</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Content">
              <CommandItem onSelect={() => setOpen(false)}>
                <SquareMenu />
                <span>Menu</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <ListOrdered />
                <span>Menu Items</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <Tags />
                <span>Promotions</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <Bell />
                <span>Notifications</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Insights">
              <CommandItem onSelect={() => setOpen(false)}>
                <Star />
                <span>Reviews</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <BarChart3 />
                <span>Analytics</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <Boxes />
                <span>Inventory</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem onSelect={() => setOpen(false)}>
                <Settings />
                <span>Settings</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}



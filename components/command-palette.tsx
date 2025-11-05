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
import { useTranslation } from "@/components/i18n-text"
import { getNavigationData } from "@/data/navigation-i18n"
import { useLocale } from "@/lib/locale-context"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const { t } = useTranslation()
  const { locale } = useLocale()
  const navigationData = getNavigationData(locale)

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
        <span className="truncate">{t("common.search")}</span>
        <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder={t("commandPalette.placeholder")} />
          <CommandList>
            <CommandEmpty>{t("common.noResults")}</CommandEmpty>
            {navigationData.map((section) => {
              if ("section" in section && section.section && section.items) {
                return (
                  <React.Fragment key={section.section}>
                    <CommandGroup heading={section.section}>
                      {section.items.map((item) => {
                        if (item.items) {
                          return item.items.map((subItem) => (
                            <CommandItem key={subItem.url} onSelect={() => setOpen(false)}>
                              {subItem.icon && <subItem.icon className="size-4" />}
                              <span>{subItem.title}</span>
                            </CommandItem>
                          ))
                        }
                        return (
                          <CommandItem key={item.url} onSelect={() => setOpen(false)}>
                            {item.icon && <item.icon className="size-4" />}
                            <span>{item.title}</span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                    <CommandSeparator />
                  </React.Fragment>
                )
              }
              if ("title" in section && !("section" in section)) {
                return (
                  <CommandGroup key={section.title} heading={t("navigation.dashboard")}>
                    <CommandItem onSelect={() => setOpen(false)}>
                      {section.icon && <section.icon className="size-4" />}
                      <span>{section.title}</span>
                    </CommandItem>
                  </CommandGroup>
                )
              }
              return null
            })}
            <CommandGroup heading={t("settings.title")}>
              <CommandItem onSelect={() => setOpen(false)}>
                <Settings className="size-4" />
                <span>{t("settings.title")}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}



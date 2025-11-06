"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useTranslation } from "@/components/i18n-text"

export function SiteHeader() {
  const { t } = useTranslation()
  const pathname = usePathname()

  // Map routes to i18n keys for page titles
  const getPageTitle = (path: string): string => {
    // Route map: order matters - more specific routes first
    const routeMap: [string, string][] = [
      // Specific menu routes (most specific first)
      ["/menu/categories", "menu.categories.title"],
      ["/menu/items", "menu.items.title"],
      ["/menu/modifiers", "navigation.modifiers"],
      ["/menu", "menu.overview"],
      // Other routes
      ["/dashboard", "navigation.dashboard"],
      ["/orders", "navigation.orders"],
      ["/qr-codes", "navigation.qrCodes"],
      ["/promotions", "navigation.promotions"],
      ["/notifications", "navigation.notifications"],
      ["/reviews", "navigation.reviews"],
      ["/analytics", "navigation.analytics"],
      ["/inventory", "navigation.inventory"],
    ]

    // Check for exact match first
    for (const [route, key] of routeMap) {
      if (path === route) {
        return t(key)
      }
    }

    // Check for nested routes (e.g., /menu/modifiers/groups)
    // Sort by length descending to match most specific route first
    const sortedRoutes = [...routeMap].sort((a, b) => b[0].length - a[0].length)
    for (const [route, key] of sortedRoutes) {
      if (path.startsWith(route + "/")) {
        return t(key)
      }
    }

    // Default fallback
    return t("navigation.dashboard")
  }

  const pageTitle = getPageTitle(pathname)

  return (
    <header className="sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background transition-[width,height] duration-200 ease-out will-change-[width,height] group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{pageTitle}</h1>
      </div>
    </header>
  )
}

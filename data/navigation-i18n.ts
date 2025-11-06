import {
  IconCategory,
  IconChartBar,
  IconDashboard,
  IconList,
  IconNotification,
  IconTag,
  IconQrcode,
  IconStar,
  IconBox,
  IconSettings,
  IconCircleDot,
  type Icon,
} from "@tabler/icons-react"
import { SquareMenu, Settings2, ClipboardList } from "lucide-react"
import type { NavItem, NavSection } from "./navigation"
import type { Locale } from "@/lib/i18n"
import { t } from "@/lib/i18n"

export function getNavigationData(locale: Locale): (NavItem | NavSection)[] {
  const translations = t(locale)
  
  return [
    {
      title: translations("navigation.dashboard"),
      url: "/dashboard",
      icon: IconDashboard,
      tooltip: translations("navigation.dashboardTooltip"),
    },
    {
      section: translations("navigation.operations"),
      items: [
        {
          title: translations("navigation.orders"),
          url: "/orders",
          icon: ClipboardList,
          tooltip: translations("navigation.ordersTooltip"),
        },
        {
          title: translations("navigation.qrCodes"),
          url: "/qr-codes",
          icon: IconQrcode,
          tooltip: translations("navigation.qrCodesTooltip"),
        },
      ],
    },
    {
      section: translations("navigation.content"),
      items: [
        {
          title: translations("navigation.menu"),
          url: "/menu",
          icon: SquareMenu,
          tooltip: translations("navigation.menuTooltip"),
          items: [
            {
              title: translations("navigation.categories"),
              url: "/menu/categories",
              icon: IconCategory,
              tooltip: translations("navigation.categoriesTooltip"),
            },
            {
              title: translations("navigation.items"),
              url: "/menu/items",
              icon: IconList,
              tooltip: translations("navigation.itemsTooltip"),
            },
            {
              title: translations("navigation.modifiers"),
              url: "/menu/modifiers",
              icon: IconCircleDot,
              tooltip: translations("navigation.modifiersTooltip"),
            },
          ],
        },
        {
          title: translations("navigation.promotions"),
          url: "/promotions",
          icon: IconTag,
          tooltip: translations("navigation.promotionsTooltip"),
        },
        {
          title: translations("navigation.notifications"),
          url: "/notifications",
          icon: IconNotification,
          tooltip: translations("navigation.notificationsTooltip"),
        },
      ],
    },
    {
      section: translations("navigation.insights"),
      items: [
        {
          title: translations("navigation.reviews"),
          url: "/reviews",
          icon: IconStar,
          tooltip: translations("navigation.reviewsTooltip"),
        },
        {
          title: translations("navigation.analytics"),
          url: "/analytics",
          icon: IconChartBar,
          tooltip: translations("navigation.analyticsTooltip"),
        },
        {
          title: translations("navigation.inventory"),
          url: "/inventory",
          icon: IconBox,
          tooltip: translations("navigation.inventoryTooltip"),
        },
      ],
    },
  ]
}


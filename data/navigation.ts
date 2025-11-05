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
  type Icon,
} from "@tabler/icons-react"
import { SquareMenu, Settings2, ClipboardList } from "lucide-react"

export type NavItem = {
  title: string
  url: string
  icon?: Icon | React.ComponentType<{ className?: string }>
  tooltip?: string
  items?: {
    title: string
    url: string
    icon?: Icon | React.ComponentType<{ className?: string }>
    tooltip?: string
  }[]
}

export type NavSection = {
  section?: string
  title?: string
  url?: string
  icon?: Icon | React.ComponentType<{ className?: string }>
  items?: NavItem[]
}

export const navigationData: (NavItem | NavSection)[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
    tooltip: "View dashboard overview and key metrics",
  },
  {
    section: "Operations",
    items: [
      {
        title: "Orders",
        url: "/orders",
        icon: ClipboardList,
        tooltip: "Manage and track customer orders",
      },
      {
        title: "QR Codes",
        url: "/qr-codes",
        icon: IconQrcode,
        tooltip: "Generate and manage QR codes for dine-in",
      },
    ],
  },
  {
    section: "Content",
    items: [
      {
        title: "Menu",
        url: "/menu",
        icon: SquareMenu,
        tooltip: "Manage menu categories, items, and modifiers",
        items: [
          {
            title: "Categories",
            url: "/menu/categories",
            icon: IconCategory,
            tooltip: "Organize menu items by categories",
          },
          {
            title: "Items",
            url: "/menu/items",
            icon: IconList,
            tooltip: "Manage menu items and pricing",
          },
          {
            title: "Modifiers",
            url: "/menu/modifiers",
            icon: Settings2,
            tooltip: "Configure item modifiers and options",
          },
        ],
      },
      {
        title: "Promotions",
        url: "/promotions",
        icon: IconTag,
        tooltip: "Create and manage promotional offers",
      },
      {
        title: "Notifications",
        url: "/notifications",
        icon: IconNotification,
        tooltip: "Manage announcements and notifications",
      },
    ],
  },
  {
    section: "Insights",
    items: [
      {
        title: "Reviews",
        url: "/reviews",
        icon: IconStar,
        tooltip: "View and moderate customer reviews",
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: IconChartBar,
        tooltip: "View business analytics and reports",
      },
      {
        title: "Inventory",
        url: "/inventory",
        icon: IconBox,
        tooltip: "Track inventory and stock notes",
      },
    ],
  },
]


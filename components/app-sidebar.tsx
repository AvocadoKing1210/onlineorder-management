"use client"

import * as React from "react"
import { IconSearch } from "@tabler/icons-react"
import { Building2 } from "lucide-react"
import { navigationData } from "@/data/navigation"
import { useEffect, useState } from "react"
import { getAppUserProfile, type AppUserProfile } from "@/lib/auth"
import { CommandPalette } from "@/components/command-palette"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = useState<AppUserProfile | null>(null)
  useEffect(() => {
    let mounted = true
    getAppUserProfile().then((u) => {
      if (!mounted) return
      setUser(u)
    })
    return () => {
      mounted = false
    }
  }, [])
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <Building2 className="!size-5 group-data-[collapsible=icon]:!size-6" />
                <span className="text-base font-semibold">Enterprise.inc</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
          <CommandPalette />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationData} />
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser
            user={{
              name: user.name,
              email: user.email,
              avatar: user.avatar || "/avatars/shadcn.jpg",
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}


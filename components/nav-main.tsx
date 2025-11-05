"use client"

import * as React from "react"
import { IconChevronRight, type Icon } from "@tabler/icons-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"

import type { NavItem, NavSection } from "@/data/navigation"

function SubButtonWithTooltip({ 
  button, 
  title 
}: { 
  button: React.ReactElement
  title: string 
}) {
  const { state, isMobile } = useSidebar()
  
  if (state === "collapsed" && !isMobile) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" align="center">
          {title}
        </TooltipContent>
      </Tooltip>
    )
  }
  
  return button
}

export function NavMain({
  items,
}: {
  items: (NavItem | NavSection)[]
}) {
  return (
    <>
      {items.map((item, index) => {
        // Handle standalone items (like Dashboard)
        if ("title" in item && !("section" in item)) {
          return (
            <React.Fragment key={item.title || index}>
    <SidebarGroup>
                <SidebarGroupContent>
        <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip={item.tooltip || item.title}>
                        <a href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              {index < items.length - 1 && <SidebarSeparator />}
            </React.Fragment>
          )
        }

        // Handle sections
        if ("section" in item && item.section && item.items) {
          return (
            <React.Fragment key={item.section}>
              <SidebarGroup>
                <SidebarGroupLabel>{item.section}</SidebarGroupLabel>
                <SidebarGroupContent>
        <SidebarMenu>
                    {item.items.map((navItem) => {
                    if (navItem.items) {
                      return (
                        <Collapsible
                          key={navItem.title}
                          asChild
                          defaultOpen={navItem.title === "Menu"}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton tooltip={navItem.tooltip || navItem.title}>
                                {navItem.icon && <navItem.icon />}
                                <span>{navItem.title}</span>
                                <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {navItem.items.map((subItem) => {
                                  const SubButton = (
                                    <SidebarMenuSubButton asChild>
                                      <a href={subItem.url}>
                                        {subItem.icon && <subItem.icon />}
                                        <span>{subItem.title}</span>
                                      </a>
                                    </SidebarMenuSubButton>
                                  )
                                  return (
                                    <SidebarMenuSubItem key={subItem.title}>
                                      <SubButtonWithTooltip button={SubButton} title={subItem.tooltip || subItem.title} />
                                    </SidebarMenuSubItem>
                                  )
                                })}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      )
                    }
                    return (
                      <SidebarMenuItem key={navItem.title}>
                        <SidebarMenuButton asChild tooltip={navItem.tooltip || navItem.title}>
                          <a href={navItem.url}>
                            {navItem.icon && <navItem.icon />}
                            <span>{navItem.title}</span>
                          </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
                    )
                  })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
              {index < items.length - 1 && <SidebarSeparator />}
            </React.Fragment>
          )
        }

        return null
      })}
    </>
  )
}

"use client"

import { GalleryVerticalEndIcon, LayoutDashboardIcon, Settings2Icon } from "lucide-react"
import type * as React from "react"
import { NavMain } from "@/components/molecules/nav-main"
import { NavUser } from "@/components/molecules/nav-user"
import { TeamSwitcher } from "@/components/molecules/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"

const data = {
  teams: [
    {
      name: "MunichMinds",
      logo: <GalleryVerticalEndIcon />,
      plan: "Team",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      isActive: true,
      items: [],
    },
    {
      title: "Games",
      url: "#",
      icon: <GalleryVerticalEndIcon />,
      items: [
        {
          title: "All Games",
          url: "/dashboard",
        },
        {
          title: "Create Game",
          url: "/dashboard/sessions/create",
        },
      ],
    },
    {
      title: "Configuration",
      url: "#",
      icon: <Settings2Icon />,
      items: [
        {
          title: "Scenarios",
          url: "/dashboard?focus=scenarios",
        },
        {
          title: "General",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession()

  const user = {
    name: session?.user?.name ?? "User",
    email: session?.user?.email ?? "",
    avatar: session?.user?.image ?? "",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

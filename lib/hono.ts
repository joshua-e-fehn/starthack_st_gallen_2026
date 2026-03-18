import { hc } from "hono/client"

import type { AppType } from "@/app/api/[[...route]]/route"

export const honoClient = hc<AppType>("/", {
  init: {
    credentials: "include", // Send auth cookies with every request
  },
})

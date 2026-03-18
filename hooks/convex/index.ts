// Convex-specific hooks (useQuery/useMutation from convex/react)
// These use Convex's real-time subscriptions, NOT React Query.
//
// Example pattern:
//   import { useQuery } from "convex/react"
//   import { api } from "@/convex/_generated/api"
//   export function useCurrentUser() {
//     return useQuery(api.auth.currentUser)
//   }
//
// Add Convex hooks here:
// export { useCurrentUser } from "./user"

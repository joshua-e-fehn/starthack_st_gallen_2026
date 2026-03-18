// Client-side API fetch wrappers
// Each module exports functions that call Hono API endpoints.
//
// Example pattern:
//   export async function getHealth() {
//     const res = await fetch("/api/health")
//     if (!res.ok) throw new Error("Failed to fetch health")
//     return res.json() as Promise<{ status: string; timestamp: string }>
//   }
//
// Add domain-specific API modules here:
// export * from "./example"

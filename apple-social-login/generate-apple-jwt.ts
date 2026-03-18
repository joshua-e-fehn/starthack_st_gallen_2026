import fs from "node:fs"
import path from "node:path"
import jwt from "jsonwebtoken"

// --- Configuration ---
// The 10-character Key ID from the portal (matches the .p8 filename)
const KEY_ID = "7LHAKH7S85"

// You can run this script with env vars:
// APPLE_TEAM_ID="YOUR_TEAM_ID" APPLE_CLIENT_ID="YOUR_CLIENT_ID" bun run generate-apple-jwt.ts
const TEAM_ID = process.env.APPLE_TEAM_ID || "<YOUR_TEAM_ID>" // Your 10-character Team ID
const CLIENT_ID = process.env.APPLE_CLIENT_ID || "<YOUR_CLIENT_ID>" // Your App ID or Services ID

// Determine the path to the private key file
const keyPath = path.join(process.cwd(), "apple-social-login", `AuthKey_${KEY_ID}.p8`)

let privateKey: string
try {
  privateKey = fs.readFileSync(keyPath, "utf8")
} catch (_error) {
  console.error(`❌ Error reading private key at ${keyPath}`)
  console.error("Make sure the AuthKey_7LHAKH7S85.p8 file is in the root directory.")
  process.exit(1)
}

if (TEAM_ID === "<YOUR_TEAM_ID>" || CLIENT_ID === "<YOUR_CLIENT_ID>") {
  console.warn("⚠️  WARNING: APPLE_TEAM_ID or APPLE_CLIENT_ID not set.")
  console.warn("The generated JWT will contain placeholder values.\n")
}

/**
 * Generates an Apple Client Secret JWT for Account and Organizational Data Sharing
 * https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
 */
function generateAppleClientSecret() {
  const now = Math.floor(Date.now() / 1000)
  // Expiration time cannot be more than 15,777,000 seconds (approx 6 months)
  // We'll set it to 15,770,000 to be safe and just under the limit
  const exp = now + 15770000

  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: exp,
    aud: "https://appleid.apple.com",
    sub: CLIENT_ID,
  }

  const signOptions: jwt.SignOptions = {
    algorithm: "ES256",
    keyid: KEY_ID,
  }

  try {
    const token = jwt.sign(payload, privateKey, signOptions)
    console.log("✅ Successfully generated Apple Client Secret JWT:\n")
    console.log(token)
    console.log("\n🕒 Token Expires at:", new Date(exp * 1000).toLocaleString())
    return token
  } catch (error) {
    console.error("❌ Failed to generate JWT:", error)
    process.exit(1)
  }
}

generateAppleClientSecret()

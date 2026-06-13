import { auth, isAuthConfigured } from "@/auth";

// Resolves the storage owner for the current request: the signed-in user's
// email when OAuth is configured and active, otherwise "demo" so the product
// works without credentials.
export async function getOwner(): Promise<string> {
  if (!isAuthConfigured()) return "demo";
  try {
    const session = await auth();
    return session?.user?.email ?? "demo";
  } catch {
    return "demo";
  }
}

/**
 * Admin authentication utilities
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Get admin emails from environment variable (evaluated at runtime)
 */
function getAdminEmails(): string[] {
  const emails = process.env.ADMIN_EMAILS || "";
  return emails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Check if current user is admin
 * Returns user if admin, null otherwise
 */
export async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  // Debug logging
  const adminEmails = getAdminEmails();
  console.log("[Admin] Checking access:", {
    userEmail: user?.email,
    adminEmails,
    authError: error?.message,
  });

  if (!user?.email) {
    console.log("[Admin] No user email found");
    return null;
  }

  const isAdmin = adminEmails.includes(user.email.toLowerCase());
  console.log("[Admin] Is admin:", isAdmin);

  return isAdmin ? user : null;
}

/**
 * Require admin authentication
 * Redirects to dashboard if not admin (user is already logged in via middleware)
 */
export async function requireAdmin() {
  const admin = await getAdminUser();

  if (!admin) {
    // ログイン済みだが管理者ではない場合はダッシュボードへ
    redirect("/dashboard");
  }

  return admin;
}

/**
 * Check if admin is configured
 */
export function isAdminConfigured() {
  return getAdminEmails().length > 0;
}

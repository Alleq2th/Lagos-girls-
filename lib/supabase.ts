import { createClient } from "@supabase/supabase-js";

// Prefer env (Vercel). Fall back to project keys so login still works if env missing.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xbqayhlpsvpjfehdbznz.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicWF5aGxwc3ZwamZlaGRiem56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTU1ODYsImV4cCI6MjEwNzU5MTU4Nn0.zjYGcVkXSLq7NmknIwonyMxStzkfPzK-cC_xkC4y-qo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

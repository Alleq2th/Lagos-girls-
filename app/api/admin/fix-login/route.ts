import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * Fixes fake-account login:
 * - Sets email to username@lagosgirls.app
 * - Sets password to FakePass123!
 * - Marks email confirmed
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in Vercel env (Settings → Environment Variables).
 * Get it: Supabase → Project Settings → API → service_role (secret).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
    const userId = body.userId as string | undefined;
    const adminSecret = body.adminSecret as string | undefined;

    if (adminSecret !== "lagos2025") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!username) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://xbqayhlpsvpjfehdbznz.supabase.co";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY not set on Vercel. Add it under Project → Settings → Environment Variables, then redeploy.",
          need_service_role: true,
        },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const targetEmail = `${username}@lagosgirls.app`;
    const password = "FakePass123!";

    // Prefer exact profile id when provided
    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email: targetEmail,
        password,
        email_confirm: true,
        user_metadata: { username },
      });
      if (!error) {
        return NextResponse.json({
          ok: true,
          email: targetEmail,
          password,
          message: `Login ready: ${username} / ${password}`,
        });
      }
      // fall through to search if id update failed
    }

    // Search auth users for matching username / email prefix
    let page = 1;
    const perPage = 100;
    let foundId: string | null = userId || null;

    while (!foundId && page <= 20) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data?.users || [];
      const hit = users.find((u) => {
        const meta = (u.user_metadata || {}) as { username?: string };
        const em = (u.email || "").toLowerCase();
        return (
          meta.username === username ||
          em.startsWith(`${username}@`) ||
          em === targetEmail
        );
      });
      if (hit) foundId = hit.id;
      if (users.length < perPage) break;
      page += 1;
    }

    if (!foundId) {
      // Create brand-new auth user (profile may already exist with this id mismatch — last resort)
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email: targetEmail,
          password,
          email_confirm: true,
          user_metadata: { username },
        });
      if (createErr) {
        return NextResponse.json(
          { error: createErr.message },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        email: targetEmail,
        password,
        warning:
          "Created new auth user. If posts still belong to old id, login works but profile link may need admin check.",
        userId: created.user?.id,
        message: `Login ready: ${username} / ${password}`,
      });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(foundId, {
      email: targetEmail,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    return NextRespo
... 

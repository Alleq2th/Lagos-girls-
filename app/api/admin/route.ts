import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://xbqayhlpsvpjfehdbznz.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { error: "SUPABASE_SERVICE_ROLE_KEY missing on Vercel" as const };
  return {
    admin: createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.adminSecret !== "lagos2025") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");
    const got = adminClient();
    if ("error" in got && got.error) {
      return NextResponse.json({ error: got.error }, { status: 500 });
    }
    const admin = got.admin!;

    // ——— FIX LOGIN ———
    if (action === "fix-login") {
      const username = String(body.username || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20);
      const userId = body.userId as string | undefined;
      if (!username) {
        return NextResponse.json({ error: "username required" }, { status: 400 });
      }
      const targetEmail = `${username}@lagosgirls.app`;
      const password = "FakePass123!";

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
            message: `Login ready: ${username} / ${password}`,
          });
        }
      }

      let page = 1;
      let foundId: string | null = userId || null;
      while (!foundId && page <= 20) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage: 100,
        });
        if (error) throw error;
        const users = data?.users || [];
        const hit = users.find((u) => {
          const meta = (u.user_metadata || {}) as { username?: string };
          const em = (u.email || "").toLowerCase();
          return (
            meta.username === username ||
            em.startsWith(username + "@") ||
            em === targetEmail
          );
        });
        if (hit) foundId = hit.id;
        if (users.length < 100) break;
        page += 1;
      }

      if (!foundId) {
        const { error: createErr } = await admin.auth.admin.createUser({
          email: targetEmail,
          password,
          email_confirm: true,
          user_metadata: { username },
        });
        if (createErr) {
          return NextResponse.json({ error: createErr.message }, { status: 400 });
        }
        return NextResponse.json({
          ok: true,
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
      return NextResponse.json({
        ok: true,
        message: `Login ready: ${username} / ${password}`,
      });
    }

    // ——— DELETE ACCOUNT ———
    if (action === "delete-account") {
      const userId = String(body.userId || "");
      if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
      }

      const { data: posts } = await admin
        .from("posts")
        .select("id")
        .eq("user_id", userId);
      const postIds = (posts || []).map((p: { id: string }) => p.id);

      if (postIds.length) {
        await admin.from("likes").delete().in("post_id", postIds);
        await admin.from("comments").delete().in("post_id", postIds);
      }
      await admin.from("likes").delete().eq("user_id", userId);
      await admin.from("comments").delete().eq("user_id", userId);
      await admin.from("follows").delete().eq("follower_id", userId);
      await admin.from("follows").delete().eq("following_id", userId);
      try {
        await admin.from("messages").delete().eq("sender_id", userId);
        await admin.from("messages").delete().eq("receiver_id", userId);
        await admin.from("conversations").delete().eq("user_a", userId);
        await admin.from("conversations").delete().eq("user_b", userId);
      } catch {
        /* ignore */
      }
      await admin.from("stories").delete().eq("user_id", userId);
      await admin.from("private_media").delete().eq("user_id", userId);
      await admin.from("posts").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);

      const { error: authErr } = await admin.auth.admin.deleteUser(userId);
      if (authErr) {
        return NextResponse.json({
          ok: false,
          error: "Data deleted but auth failed: " + authErr.message,
        });
      }
      return NextResponse.json({
        ok: true,
        message: "Account fully deleted (database + auth)",
      });
    }

    // ——— BAN ———
    if (action === "ban") {
      const userId = String(body.userId || "");
      const banned = Boolean(body.banned);
      if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
      }
      const { error } = await admin
        .from("profiles")
        .update({ is_banned: banned } as any)
        .eq("id", userId);
      if (error) {
        await admin.auth.admin.updateUserById(userId, {
          ban_duration: banned ? "876000h" : "none",
        } as any);
      }
      return NextResponse.json({
        ok: true,
        message: banned ? "Account banned" : "Account unbanned",
      });
    }

    // ——— EDIT STATS ———
    if (action === "clear_likes" && body.postId) {
      await admin.from("likes").delete().eq("post_id", body.postId);
      return NextResponse.json({ ok: true, message: "Likes cleared" });
    }
    if (action === "clear_comments" && body.postId) {
      await admin.from("comments").delete().eq("post_id", body.postId);
      return NextResponse.json({ ok: true, message: "Comments cleared" });
    }
    if (action === "set_followers" && body.userId) {
      const target = Math.max(0, Number(body.count) || 0);
      await admin
        .from("profiles")
        .update({ followers_count: target } as any)
        .eq("id", body.userId);
      return NextResponse.json({
        ok: true,
        message: "followers_count set to " + target,
      });
    }
    if (action === "add_likes" && body.postId) {
      const n = Math.min(200, Math.max(1, Number(body.count) || 1));
      const { data: girls } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "GIRL")
        .limit(n);
      const rows = (girls || []).map((g: { id: string }) => ({
        post_id: body.postId,
        user_id: g.id,
      }));
      if (rows.length) {
        await admin.from("likes").upsert(rows, { onConflict: "post_id,user_id" });
      }
      return NextResponse.json({
        ok: true,
        message: "Added up to " + rows.length + " likes",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "admin action failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

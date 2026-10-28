"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://xbqayhlpsvpjfehdbznz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicWF5aGxwc3ZwamZlaGRiem56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTU1ODYsImV4cCI6MjEwNzU5MTU4Nn0.zjYGcVkXSLq7NmknIwonyMxStzkfPzK-cC_xkC4y-qo"
);

const ADMIN_PASSWORD = "lagos2025";
const PAYMENT_KEY = "lagos_payment_instructions";
const UNLOCKS_KEY = "lagos_pending_unlocks";

const DEFAULT_SERVICES = [
  { name: "Video Call", price: 15000, desc: "15 minutes" },
  { name: "Custom Video", price: 25000, desc: "Personalized" },
  { name: "Private Chat", price: 5000, desc: "1 hour" },
  { name: "Voice Call", price: 10000, desc: "Live voice" },
  { name: "Video Call Extended", price: 20000, desc: "30 minutes" },
];

type Tab = "accounts" | "settings" | "chats" | "unlocks" | "hotleads" | "stats";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("accounts");

  // Create account
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("Lagos");
  const [role, setRole] = useState<"GIRL" | "GUY">("GIRL");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Accounts
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "GIRL" | "GUY">("ALL");

  // Content
  const [accountPosts, setAccountPosts] = useState<any[]>([]);
  const [postLikeCounts, setPostLikeCounts] = useState<Record<string, number>>({});
  const [accountPrivate, setAccountPrivate] = useState<any[]>([]);
  const [accountStories, setAccountStories] = useState<any[]>([]);

  // Posting
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(2000);
  const [postType, setPostType] = useState<"public" | "private" | "story" | "free_anon">("public");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Services
  const [servicesJson, setServicesJson] = useState("");
  const [servicesMsg, setServicesMsg] = useState("");
  const [followerCount, setFollowerCount] = useState(0);
  const [showServices, setShowServices] = useState(false);
  const [servicesList, setServicesList] = useState<{name:string;price:number;desc:string}[]>([]);

  // Settings
  const [paymentText, setPaymentText] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");

  // Chats
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [convMessages, setConvMessages] = useState<any[]>([]);
  const [adminReply, setAdminReply] = useState("");

  // Unlocks (local queue until DB table exists)
  const [pendingUnlocks, setPendingUnlocks] = useState<any[]>([]);
  const [hotLeads, setHotLeads] = useState<any[]>([]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    girls: 0,
    guys: 0,
    premium: 0,
    posts: 0,
    messages: 0,
  });

  const avatarRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadAccounts();
      loadStats();
      loadConversations();
      loadHotLeads();
      loadUnlockRequests();
      (async () => {
        try {
          const { data } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "payment_instructions")
            .maybeSingle();
          if (data?.value) {
            setPaymentText(data.value);
          } else {
            const saved = localStorage.getItem(PAYMENT_KEY);
            setPaymentText(
              saved ||
                "Pay to:\nOPay: 0000000000 (Name)\nMoniepoint: 0000000000 (Name)\nCrypto: USDT TRC20 — your_wallet\n\nAfter payment, message: I have paid for [service]."
            );
          }
        } catch {
          const saved = localStorage.getItem(PAYMENT_KEY);
          setPaymentText(
            saved ||
              "Pay to:\nOPay: 0000000000 (Name)\nMoniepoint: 0000000000 (Name)\n\nAfter payment, message: I have paid for [service]."
          );
        }
        loadUnlockRequests();
      })();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedAccount) {
      loadAccountContent(selectedAccount.id);
      try {
        const raw = selectedAccount.services;
        const list = raw
          ? typeof raw === "string"
            ? JSON.parse(raw)
            : raw
          : DEFAULT_SERVICES;
        const arr = Array.isArray(list) ? list : DEFAULT_SERVICES;
        setServicesList(
          arr.map((x: any) => ({
            name: String(x.name || ""),
            price: Number(x.price) || 0,
            desc: String(x.desc || ""),
          }))
        );
        setServicesJson(JSON.stringify(arr, null, 2));
      } catch {
        setServicesList([...DEFAULT_SERVICES]);
        setServicesJson(JSON.stringify(DEFAULT_SERVICES, null, 2));
      }
      setServicesMsg("");
      (async () => {
        const { count } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", selectedAccount.id);
        const display = (selectedAccount as any).followers_count;
        setFollowerCount(
          typeof display === "number" && display > 0 ? display : count || 0
        );
      })();
    }
  }, [selectedAccount]);

  async function loadAccounts() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAccounts(data);
  }

  async function loadStats() {
    const { data: profiles } = await supabase.from("profiles").select("id, role, is_premium");
    const { count: postCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true });
    const { count: msgCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true });
    const list = profiles || [];
    setStats({
      total: list.length,
      girls: list.filter((p) => p.role === "GIRL").length,
      guys: list.filter((p) => p.role !== "GIRL").length,
      premium: list.filter((p) => p.is_premium).length,
      posts: postCount || 0,
      messages: msgCount || 0,
    });
  }

  async function loadAccountContent(userId: string) {
    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const list = posts || [];
    setAccountPosts(list);
    if (list.length) {
      const ids = list.map((p: any) => p.id);
      const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .in("post_id", ids);
      const counts: Record<string, number> = {};
      ids.forEach((id: string) => (counts[id] = 0));
      (likes || []).forEach((l: any) => {
        counts[l.post_id] = (counts[l.post_id] || 0) + 1;
      });
      list.forEach((p: any) => {
        counts[p.id] = (counts[p.id] || 0) + (Number(p.likes_boost) || 0);
      });
      setPostLikeCounts(counts);
    } else {
      setPostLikeCounts({});
    }
    const { data: priv } = await supabase
      .from("private_media")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setAccountPrivate(priv || []);
    const { data: stories } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setAccountStories(stories || []);
  }

  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select(
        `*,
        guy:profiles!conversations_guy_id_fkey(id, username, display_name, avatar_url),
        girl:profiles!conversations_girl_id_fkey(id, username, display_name, avatar_url)`
      )
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
    else {
      // fallback without FK names
      const { data: plain } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(50);
      setConversations(plain || []);
    }
  }

  async function openConversation(conv: any) {
    setSelectedConv(conv);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    setConvMessages(data || []);
  }

  async function sendAdminReply() {
    if (!adminReply.trim() || !selectedConv) return;
    const girlId = selectedConv.girl_id;
    await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: girlId,
      content: adminReply.trim(),
    });
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedConv.id);
    setAdminReply("");
    openConversation(selectedConv);
  }

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setMessage("");
    } else {
      setMessage("Wrong password");
    }
  }

  async function createFakeAccount() {
    if (!username) return setMessage("Username is required");
    setLoading(true);
    setMessage("");
    try {
      const cleanUsername = username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20);
      // Fixed email so login works with username + FakePass123!
      const fakeEmail = `${cleanUsername}@lagosgirls.app`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: "FakePass123!",
        options: { data: { username: cleanUsername, role } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      let avatar_url = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const fileName = `avatar-${authData.user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
          avatar_url = urlData.publicUrl;
        }
      }

      const services =
        role === "GIRL" ? JSON.stringify(DEFAULT_SERVICES) : null;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        username: cleanUsername,
        display_name: displayName || cleanUsername,
        bio: bio || "",
        location: location || "Lagos",
        role,
        avatar_url,
        is_premium: false,
        services,
      });
      if (profileError) throw profileError;

      setMessage(
        `Created @${cleanUsername} — login: username + password FakePass123!`
      );
      setUsername("");
      setDisplayName("");
      setBio("");
      setAvatarFile(null);
      loadAccounts();
      loadStats();
    } catch (e: any) {
      setMessage(e.message || "Create failed");
    }
    setLoading(false);
  }

  async function uploadFile(file: File) {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("media").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handlePostAsAccount() {
    if (!selectedAccount || files.length === 0) return setMessage("Pick a file");
    setLoading(true);
    setMessage("");
    try {
      // Public multi-file → one carousel
      if (postType === "public" && files.length > 1) {
        const items: { url: string; type: "image" | "video" }[] = [];
        for (let i = 0; i < files.length; i++) {
          setMessage(`Uploading carousel… ${i + 1}/${files.length}`);
          const file = files[i];
          const url = await uploadFile(file);
          items.push({
            url,
            type: file.type.startsWith("video") ? "video" : "image",
          });
        }
        await supabase.from("posts").insert({
          user_id: selectedAccount.id,
          media_url: JSON.stringify(items),
          media_type: items[0].type,
          caption: caption || "",
        });
        setMessage(`Carousel posted · ${items.length} items`);
      } else if (postType === "private" && files.length > 1) {
        const items: { url: string; type: "image" | "video" }[] = [];
        for (let i = 0; i < files.length; i++) {
          setMessage(`Uploading bundle… ${i + 1}/${files.length}`);
          const file = files[i];
          const url = await uploadFile(file);
          items.push({
            url,
            type: file.type.startsWith("video") ? "video" : "image",
          });
        }
        await supabase.from("private_media").insert({
          user_id: selectedAccount.id,
          media_url: JSON.stringify(items),
          media_type: items[0].type,
          title: title || `Bundle · ${items.length} items`,
          price,
        });
        setMessage(`Private bundle · ${items.length} items · ₦${price}`);
      } else {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (files.length > 3) setMessage(`Uploading… ${i + 1}/${files.length}`);
          const url = await uploadFile(file);
          const media_type = file.type.startsWith("video") ? "video" : "image";
          if (postType === "story") {
            await supabase.from("stories").insert({
              user_id: selectedAccount.id,
              media_url: url,
              media_type,
            });
          } else if (postType === "private") {
            await supabase.from("private_media").insert({
              user_id: selectedAccount.id,
              media_url: url,
              media_type,
              title: title || "Private",
              price,
            });
          } else if (postType === "free_anon") {
            await supabase.from("posts").insert({
              user_id: selectedAccount.id,
              media_url: url,
              media_type,
              caption: `__anon__\n${caption || ""}`.trim(),
            });
          } else {
            await supabase.from("posts").insert({
              user_id: selectedAccount.id,
              media_url: url,
              media_type,
              caption: caption || "",
            });
          }
        }
        setMessage(
          postType === "free_anon"
            ? `${files.length} free anonymous video(s) uploaded`
            : postType === "story"
            ? `${files.length} story item(s) added`
            : "Posted"
        );
      }
      setCaption("");
      setTitle("");
      setFiles([]);
      setPreviews([]);
      loadAccountContent(selectedAccount.id);
    } catch (e: any) {
      setMessage(e.message || "Post failed");
    }
    setLoading(false);
  }

  /** Bulk free videos from Accounts list — no need to open one profile */
  async function handleBulkFreeVideos() {
    if (files.length === 0) return setMessage("Select videos first");
    const host =
      selectedAccount ||
      accounts.find((a) => a.role === "GIRL") ||
      accounts[0];
    if (!host?.id) {
      return setMessage("Create at least one girl account first (storage host only)");
    }
    setLoading(true);
    setMessage("");
    try {
      for (let i = 0; i < files.length; i++) {
        setMessage(`Free video ${i + 1}/${files.length}…`);
        const file = files[i];
        const url = await uploadFile(file);
        const media_type = file.type.startsWith("video") ? "video" : "image";
        await supabase.from("posts").insert({
          user_id: host.id,
          media_url: url,
          media_type,
          caption: `__anon__\n${caption || ""}`.trim(),
        });
      }
      setMessage(`${files.length} free anonymous video(s) live`);
      setFiles([]);
      setPreviews([]);
      setCaption("");
    } catch (e: any) {
      setMessage(e.message || "Upload failed");
    }
    setLoading(false);
  }

  async function deleteContent(table: string, id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from(table).delete().eq("id", id);
    if (selectedAccount) loadAccountContent(selectedAccount.id);
  }

  async function saveServices() {
    if (!selectedAccount) return;
    setServicesMsg("");
    try {
      const cleaned = servicesList
        .filter((s) => s.name.trim())
        .map((s) => ({
          name: s.name.trim(),
          price: Number(s.price) || 0,
          desc: (s.desc || "").trim(),
        }));
      const { error } = await supabase
        .from("profiles")
        .update({ services: JSON.stringify(cleaned) })
        .eq("id", selectedAccount.id);
      if (error) throw error;
      setServicesMsg("Services saved");
      setSelectedAccount({
        ...selectedAccount,
        services: JSON.stringify(cleaned),
      });
      setServicesList(cleaned);
      loadAccounts();
    } catch (e: any) {
      setServicesMsg("Error: " + (e.message || "save failed"));
    }
  }

  async function fixAccountLogin(acc: any) {
    if (!acc?.username) return;
    setLoading(true);
    setMessage("Fixing login…");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fix-login",
          username: acc.username,
          userId: acc.id,
          adminSecret: "lagos2025",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(
          data.error ||
            "Fix failed. Add SUPABASE_SERVICE_ROLE_KEY on Vercel (Supabase → Settings → API → service_role)."
        );
      } else {
        setMessage(
          data.message ||
            `OK — login as ${acc.username} / FakePass123!`
        );
      }
    } catch (e: any) {
      setMessage(e.message || "Fix login failed");
    }
    setLoading(false);
  }

  async function deleteAccountFull(acc: any) {
    if (!acc?.id) return;
    const ok = confirm(
      `DELETE @${acc.username} forever?\n\nRemoves: profile, posts, stories, likes, comments, follows, messages, and Supabase login.`
    );
    if (!ok) return;
    setLoading(true);
    setMessage("Deleting account…");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-account",
          userId: acc.id,
          adminSecret: "lagos2025",
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 207) {
        setMessage(data.error || "Delete failed");
      } else {
        setMessage(data.message || "Account deleted");
        setSelectedAccount(null);
        loadAccounts();
        loadStats();
      }
    } catch (e: any) {
      setMessage(e.message || "Delete failed");
    }
    setLoading(false);
  }

  async function banAccount(acc: any, banned: boolean) {
    if (!acc?.id) return;
    setLoading(true);
    setMessage(banned ? "Banning…" : "Unbanning…");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ban",
          userId: acc.id,
          banned,
          adminSecret: "lagos2025",
        }),
      });
      const data = await res.json();
      if (!res.ok) setMessage(data.error || "Ban failed");
      else {
        setMessage(data.message);
        setSelectedAccount({ ...acc, is_banned: banned });
        loadAccounts();
      }
    } catch (e: any) {
      setMessage(e.message || "Ban failed");
    }
    setLoading(false);
  }

  async function adminEditStats(
    action: string,
    extra: Record<string, any>
  ) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminSecret: "lagos2025",
          ...extra,
        }),
      });
      const data = await res.json();
      setMessage(data.message || data.error || "Done");
      if (selectedAccount) loadAccountContent(selectedAccount.id);
    } catch (e: any) {
      setMessage(e.message || "Failed");
    }
    setLoading(false);
  }

  async function togglePremium(acc: any) {
    const next = !acc.is_premium;
    const { error } = await supabase
      .from("profiles")
      .update({ is_premium: next })
      .eq("id", acc.id);
    if (error) setMessage(error.message);
    else {
      setMessage(next ? "Premium ON" : "Premium OFF");
      if (selectedAccount?.id === acc.id) {
        setSelectedAccount({ ...selectedAccount, is_premium: next });
      }
      loadAccounts();
      loadStats();
    }
  }

  async function toggleRole(acc: any) {
    const next = acc.role === "GIRL" ? "GUY" : "GIRL";
    const update: any = { role: next };
    if (next === "GIRL" && !acc.services) {
      update.services = JSON.stringify(DEFAULT_SERVICES);
    }
    const { error } = await supabase.from("profiles").update(update).eq("id", acc.id);
    if (error) setMessage(error.message);
    else {
      setMessage(`Role → ${next}`);
      if (selectedAccount?.id === acc.id) {
        setSelectedAccount({ ...selectedAccount, ...update });
      }
      loadAccounts();
      loadStats();
    }
  }

  
  function toggleSelectId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function bulkSetFollowers() {
    if (!selectedIds.length) return setMessage("Select accounts first");
    const n = prompt("Set followers for " + selectedIds.length + " accounts:", "1000");
    if (n == null) return;
    const count = Math.max(0, Number(n) || 0);
    setLoading(true);
    for (const id of selectedIds) {
      await adminEditStats("set_followers", { userId: id, count });
      await supabase.from("profiles").update({ followers_count: count } as any).eq("id", id);
    }
    setMessage("Followers set to " + count + " for " + selectedIds.length + " accounts");
    setLoading(false);
    loadAccounts();
  }

  async function bulkApplyServices() {
    if (!selectedIds.length) return setMessage("Select accounts first");
    setLoading(true);
    const payload = JSON.stringify(DEFAULT_SERVICES);
    for (const id of selectedIds) {
      await supabase.from("profiles").update({ services: payload }).eq("id", id);
    }
    setMessage("Default services applied to " + selectedIds.length);
    setLoading(false);
    loadAccounts();
  }

  async function bulkPremium(on: boolean) {
    if (!selectedIds.length) return setMessage("Select accounts first");
    setLoading(true);
    for (const id of selectedIds) {
      await supabase.from("profiles").update({ is_premium: on }).eq("id", id);
    }
    setMessage((on ? "Premium on" : "Premium off") + " for " + selectedIds.length);
    setLoading(false);
    loadAccounts();
  }

  async function bulkAddLikesToPosts() {
    if (!selectedPostIds.length) return setMessage("Select posts first");
    const n = prompt("Add how many likes to " + selectedPostIds.length + " posts?", "100");
    if (n == null) return;
    const count = Math.min(50000, Math.max(1, Number(n) || 1));
    setLoading(true);
    for (const postId of selectedPostIds) {
      await adminEditStats("add_likes", { postId, count });
    }
    setMessage("Added likes to " + selectedPostIds.length + " posts");
    setLoading(false);
    setSelectedPostIds([]);
    if (selectedAccount) loadAccountContent(selectedAccount.id);
  }

  async function applyDefaultServices(acc: any) {
    const { error } = await supabase
      .from("profiles")
      .update({ services: JSON.stringify(DEFAULT_SERVICES) })
      .eq("id", acc.id);
    if (error) setMessage(error.message);
    else {
      setMessage("Default services applied");
      if (selectedAccount?.id === acc.id) {
        setSelectedAccount({
          ...selectedAccount,
          services: JSON.stringify(DEFAULT_SERVICES),
        });
        setServicesJson(JSON.stringify(DEFAULT_SERVICES, null, 2));
      }
      loadAccounts();
    }
  }

  async function applyDefaultServicesAllGirls() {
    if (!confirm("Apply default services to ALL GIRL accounts?")) return;
    setLoading(true);
    const girls = accounts.filter((a) => a.role === "GIRL");
    for (const g of girls) {
      await supabase
        .from("profiles")
        .update({ services: JSON.stringify(DEFAULT_SERVICES) })
        .eq("id", g.id);
    }
    setLoading(false);
    setMessage(`Updated ${girls.length} girls`);
    loadAccounts();
  }

  async function savePaymentInstructions() {
    localStorage.setItem(PAYMENT_KEY, paymentText);
    try {
      const { error } = await supabase.from("app_settings").upsert(
        {
          key: "payment_instructions",
          value: paymentText,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (error) {
        setSettingsMsg("Saved locally. DB: " + error.message + " — run app_settings SQL");
      } else {
        setSettingsMsg("Saved for all users (Supabase).");
      }
    } catch (e: any) {
      setSettingsMsg("Saved locally only. " + (e?.message || ""));
    }
  }

  async function loadHotLeads() {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_id, conversation_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(250);
      const keys = [
        "pay",
        "book",
        "meet",
        "video call",
        "how much",
        "transfer",
        "opay",
        "private",
        "custom",
        "i have paid",
        "i've paid",
        "naira",
        "₦",
      ];
      const hits = (data || []).filter((m: any) => {
        const c = (m.content || "").toLowerCase();
        return keys.some((k) => c.includes(k));
      });
      setHotLeads(hits.slice(0, 40));
    } catch {
      setHotLeads([]);
    }
  }

  async function loadUnlockRequests() {
    try {
      const { data, error } = await supabase
        .from("unlock_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) {
        setPendingUnlocks(
          data.map((r: any) => {
            const note = String(r.note || "");
            const m = note.match(/screenshot:(https?:\/\/\S+)/i);
            return {
              id: r.id,
              label: r.label,
              note,
              media_id: r.media_id,
              user_id: r.user_id,
              at: r.created_at,
              screenshot: m ? m[1] : null,
            };
          })
        );
        return;
      }
    } catch {}
    try {
      setPendingUnlocks(JSON.parse(localStorage.getItem(UNLOCKS_KEY) || "[]"));
    } catch {
      setPendingUnlocks([]);
    }
  }

  async function approveUnlock(u: any) {
    if (u.media_id && u.user_id) {
      const { error: insErr } = await supabase.from("media_unlocks").upsert(
        { user_id: u.user_id, media_id: u.media_id },
        { onConflict: "user_id,media_id" }
      );
      if (insErr) {
        setMessage("Unlock DB error: " + insErr.message);
        return;
      }
    }
    // Premium payments → set is_premium
    if (u.user_id && /premium/i.test(String(u.label || ""))) {
      await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("id", u.user_id);
    }
    if (typeof u.id === "string" && u.id.length > 15) {
      await supabase.from("unlock_requests").update({ status: "approved" }).eq("id", u.id);
    }
    setPendingUnlocks((prev) => prev.filter((x) => x.id !== u.id));
    setMessage("Approved");
  }

  function removeUnlock(id: string) {
    const next = pendingUnlocks.filter((u) => u.id !== id);
    setPendingUnlocks(next);
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify(next));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || []);
    setFiles(list);
    setPreviews(list.map((f) => URL.createObjectURL(f)));
  }

  const filtered = accounts.filter((a) => {
    const q = accountSearch.toLowerCase();
    const match =
      !q ||
      a.username?.toLowerCase().includes(q) ||
      a.display_name?.toLowerCase().includes(q);
    const roleOk = roleFilter === "ALL" || a.role === roleFilter;
    return match && roleOk;
  });

  // ========== LOGIN ==========
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-pink-500 text-center mb-6">Admin</h1>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 mb-4"
          />
          {message && <p className="text-red-400 text-sm text-center mb-3">{message}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 rounded-xl"
          >
            Enter Admin
          </button>
        </div>
      </div>
    );
  }

  // ========== SINGLE ACCOUNT ==========
  if (selectedAccount) {
    return (
      <div className="min-h-screen bg-black text-white p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setSelectedAccount(null)}
            className="text-pink-500 mb-4 text-sm"
          >
            ← Back to All Accounts
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-xl font-bold">
              {selectedAccount.avatar_url ? (
                <img
                  src={selectedAccount.avatar_url}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                selectedAccount.username?.[0]?.toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {selectedAccount.display_name || selectedAccount.username}
              </h2>
              <p className="text-gray-400 text-sm">@{selectedAccount.username}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedAccount.role} · {selectedAccount.is_premium ? "PREMIUM" : "free"}
              </p>
            </div>
          </div>

          {/* Power controls */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              onClick={() => togglePremium(selectedAccount)}
              className={`py-2.5 rounded-xl text-sm font-semibold ${
                selectedAccount.is_premium ? "bg-yellow-600" : "bg-zinc-800"
              }`}
            >
              {selectedAccount.is_premium ? "Remove Premium" : "Make Premium"}
            </button>
            <button
              onClick={() => toggleRole(selectedAccount)}
              className="py-2.5 rounded-xl text-sm font-semibold bg-zinc-800"
            >
              Role → {selectedAccount.role === "GIRL" ? "GUY" : "GIRL"}
            </button>
            <button
              onClick={() => applyDefaultServices(selectedAccount)}
              className="py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 col-span-2"
            >
              Apply default services
            </button>
            <button
              onClick={() => fixAccountLogin(selectedAccount)}
              disabled={loading}
              className="py-2.5 rounded-xl text-sm font-semibold bg-pink-600 col-span-2 disabled:opacity-50"
            >
              Fix login
            </button>
            <button
              onClick={() =>
                banAccount(selectedAccount, !selectedAccount.is_banned)
              }
              disabled={loading}
              className="py-2.5 rounded-xl text-sm font-semibold bg-orange-700 col-span-1 disabled:opacity-50"
            >
              {selectedAccount.is_banned ? "Unban" : "Ban"}
            </button>
            <button
              onClick={() => deleteAccountFull(selectedAccount)}
              disabled={loading}
              className="py-2.5 rounded-xl text-sm font-semibold bg-red-700 col-span-1 disabled:opacity-50"
            >
              Delete account
            </button>
            <button
              onClick={() => {
                const n = prompt("Set display followers_count to:", "1000");
                if (n == null) return;
                adminEditStats("set_followers", {
                  userId: selectedAccount.id,
                  count: Number(n),
                });
              }}
              className="py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 col-span-2"
            >
              Edit followers count
            </button>
          </div>

          {message && (
            <p className="text-sm text-pink-400 mb-4 text-center">{message}</p>
          )}

          {/* Followers + compact Services */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Followers</p>
              <p className="text-xl font-bold text-pink-500">{followerCount}</p>
            </div>
            <button
              onClick={() => {
                const n = prompt("Set followers to:", String(followerCount || 1000));
                if (n == null) return;
                adminEditStats("set_followers", {
                  userId: selectedAccount.id,
                  count: Number(n),
                });
                setFollowerCount(Number(n) || 0);
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold"
            >
              Edit
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowServices((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-semibold text-sm">
                Services ({servicesList.length})
              </span>
              <span className="text-gray-400 text-xs">
                {showServices ? "Hide ▲" : "Edit ▼"}
              </span>
            </button>
            {showServices && (
              <div className="px-4 pb-4 space-y-2 border-t border-zinc-800 pt-3">
                {servicesList.map((s, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 bg-zinc-800 rounded-lg px-2 py-2"
                  >
                    <input
                      value={s.name}
                      onChange={(e) => {
                        const next = [...servicesList];
                        next[i] = { ...next[i], name: e.target.value };
                        setServicesList(next);
                      }}
                      placeholder="Name"
                      className="flex-1 min-w-[100px] bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      value={s.price}
                      onChange={(e) => {
                        const next = [...servicesList];
                        next[i] = {
                          ...next[i],
                          price: Number(e.target.value) || 0,
                        };
                        setServicesList(next);
                      }}
                      className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setServicesList(servicesList.filter((_, j) => j !== i))
                      }
                      className="text-red-400 text-[11px]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setServicesList([
                      ...servicesList,
                      { name: "New", price: 5000, desc: "" },
                    ])
                  }
                  className="w-full py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold"
                >
                  + Add
                </button>
                {servicesMsg && (
                  <p
                    className={`text-xs ${
                      servicesMsg.startsWith("Error")
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {servicesMsg}
                  </p>
                )}
                <button
                  onClick={saveServices}
                  className="w-full bg-pink-600 py-2 rounded-xl text-sm font-semibold"
                >
                  Save Services
                </button>
              </div>
            )}
          </div>

          {/* Post as account */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8">
            <h3 className="font-bold mb-4">Post as this account</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {(
                [
                  ["public", "Public"],
                  ["private", "Private ₦"],
                  ["story", "Story"],
                  ["free_anon", "Free videos"],
                ] as const
              ).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setPostType(t)}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    postType === t ? "bg-pink-600" : "bg-zinc-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {postType === "free_anon" && (
              <p className="text-xs text-gray-400 mb-3">
                Multi-select many videos (30–40). Each becomes a{" "}
                <span className="text-pink-400">Free video</span> with no username on
                feed/reels. Pick any account — name is hidden.
              </p>
            )}
            {(postType === "public" || postType === "free_anon") && (
              <textarea
                placeholder={
                  postType === "free_anon"
                    ? "Optional caption (still no username shown)..."
                    : "Caption..."
                }
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 mb-3 resize-none"
              />
            )}
            {postType === "private" && (
              <>
                <input
                  type="text"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 mb-3"
                />
                <div className="relative mb-3">
                  <span className="absolute left-4 top-3.5 text-gray-400">₦</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-8 pr-4 py-3"
                  />
                </div>
              </>
            )}
            {previews.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto">
                {previews.map((src, i) => (
                  <div key={i} className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                    {files[i]?.type.startsWith("video") ? (
                      <video src={src} className="w-full h-full object-cover" />
                    ) : (
                      <img src={src} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full bg-zinc-800 py-2.5 rounded-xl text-sm mb-3"
            >
              Choose media
            </button>
            <button
              onClick={handlePostAsAccount}
              disabled={loading}
              className="w-full bg-pink-600 py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </div>

          {/* Content lists */}
          <section className="mb-6">
            <h3 className="font-bold mb-2">Posts ({accountPosts.length})</h3>
            {selectedPostIds.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-pink-400">{selectedPostIds.length} posts</span>
                <button type="button" onClick={bulkAddLikesToPosts} className="text-[11px] px-2 py-1 rounded-lg bg-pink-700">+Likes all</button>
                <button type="button" onClick={() => setSelectedPostIds([])} className="text-[11px] px-2 py-1 rounded-lg bg-zinc-700">Clear</button>
              </div>
            )}
            <div className="space-y-2">
              {accountPosts.map((p) => {
                let thumb = p.media_url;
                let tType = p.media_type;
                let multi = 0;
                try {
                  if (String(p.media_url || "").trim().startsWith("[")) {
                    const arr = JSON.parse(p.media_url);
                    if (Array.isArray(arr) && arr[0]?.url) {
                      thumb = arr[0].url;
                      tType = arr[0].type || tType;
                      multi = arr.length;
                    }
                  }
                } catch {}
                return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-zinc-900 rounded-xl p-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedPostIds.includes(p.id)}
                    onChange={() =>
                      setSelectedPostIds((prev) =>
                        prev.includes(p.id)
                          ? prev.filter((x) => x !== p.id)
                          : [...prev, p.id]
                      )
                    }
                    className="w-4 h-4 shrink-0 accent-pink-500"
                  />
                  <div className="w-12 h-12 bg-zinc-800 rounded overflow-hidden relative shrink-0">
                    {tType === "video" ? (
                      <video src={thumb} className="w-full h-full object-cover" />
                    ) : (
                      <img src={thumb} className="w-full h-full object-cover" alt="" />
                    )}
                    {multi > 1 && (
                      <span className="absolute bottom-0 right-0 text-[9px] bg-black/80 px-1 text-white">
                        {multi}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 truncate">
                      {multi > 1 ? `Carousel · ${multi} · ` : ""}
                      {p.caption || "—"}
                    </p>
                    <p className="text-[11px] text-pink-400 mt-0.5">
                      ♥ {postLikeCounts[p.id] ?? "…"} likes
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const n = prompt(
                        "Likes now: " +
                          (postLikeCounts[p.id] ?? 0) +
                          ". How many to ADD?",
                        "100"
                      );
                      if (n == null) return;
                      await adminEditStats("add_likes", {
                        postId: p.id,
                        count: Math.min(50000, Math.max(1, Number(n) || 1)),
                      });
                      if (selectedAccount)
                        loadAccountContent(selectedAccount.id);
                    }}
                    className="text-pink-400 text-xs font-semibold"
                  >
                    +Likes
                  </button>
                  <button
                    onClick={async () => {
                      const n = prompt("How many comments to ADD?", "12");
                      if (n == null) return;
                      await adminEditStats("add_comments", {
                        postId: p.id,
                        count: Math.min(50000, Math.max(1, Number(n) || 1)),
                      });
                      if (selectedAccount)
                        loadAccountContent(selectedAccount.id);
                    }}
                    className="text-sky-400 text-xs font-semibold"
                  >
                    +Comments
                  </button>
                  <button
                    onClick={() =>
                      adminEditStats("clear_likes", { postId: p.id })
                    }
                    className="text-gray-400 text-xs"
                  >
                    Clear likes
                  </button>
                  <button
                    onClick={() =>
                      adminEditStats("clear_comments", { postId: p.id })
                    }
                    className="text-gray-400 text-xs"
                  >
                    Clear comments
                  </button>
                  <button
                    onClick={() => deleteContent("posts", p.id)}
                    className="text-red-400 text-xs"
                  >
                    Delete
                  </button>
                </div>
                );
              })}
            </div>
          </section>

          <section className="mb-6">
            <h3 className="font-bold mb-2">Private ({accountPrivate.length})</h3>
            <div className="space-y-2">
              {accountPrivate.map((p) => {
                let thumb = p.media_url;
                let tType = p.media_type;
                let multi = 0;
                try {
                  if (String(p.media_url || "").trim().startsWith("[")) {
                    const arr = JSON.parse(p.media_url);
                    if (Array.isArray(arr) && arr[0]?.url) {
                      thumb = arr[0].url;
                      tType = arr[0].type || tType;
                      multi = arr.length;
                    }
                  }
                } catch {}
                return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-zinc-900 rounded-xl p-2"
                >
                  <div className="w-12 h-12 bg-zinc-800 rounded overflow-hidden relative shrink-0">
                    {tType === "video" ? (
                      <video src={thumb} className="w-full h-full object-cover" />
                    ) : (
                      <img src={thumb} className="w-full h-full object-cover" alt="" />
                    )}
                    {multi > 1 && (
                      <span className="absolute bottom-0 right-0 text-[9px] bg-black/80 px-1 text-white">
                        {multi}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs">
                      {multi > 1 ? `Bundle · ${multi} · ` : ""}
                      {p.title}
                    </p>
                    <p className="text-xs text-pink-400">₦{p.price}</p>
                  </div>
                  <button
                    onClick={() => deleteContent("private_media", p.id)}
                    className="text-red-400 text-xs"
                  >
                    Delete
                  </button>
                </div>
                );
              })}
            </div>
          </section>

          <section className="mb-6">
            <h3 className="font-bold mb-2">Stories ({accountStories.length})</h3>
            <div className="space-y-2">
              {accountStories.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 bg-zinc-900 rounded-xl p-2"
                >
                  <div className="w-12 h-12 bg-zinc-800 rounded overflow-hidden">
                    {s.media_type === "video" ? (
                      <video src={s.media_url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={s.media_url} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>
                  <button
                    onClick={() => deleteContent("stories", s.id)}
                    className="text-red-400 text-xs ml-auto"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ========== MAIN ADMIN SHELL ==========
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="sticky top-0 z-40 bg-black border-b border-zinc-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-pink-500">Lagos Girls Admin</h1>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs text-gray-500"
          >
            Logout
          </button>
        </div>
        <div className="max-w-2xl mx-auto flex gap-1 mt-3 overflow-x-auto">
          {(
            [
              ["accounts", "Accounts"],
              ["stats", "Stats"],
              ["chats", "Chats"],
              ["hotleads", "Hot leads"],
              ["unlocks", "Unlocks"],
              ["settings", "Settings"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 ${
                tab === id ? "bg-pink-600 text-white" : "bg-zinc-900 text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {message && (
          <p className="text-sm text-pink-400 text-center mb-4">{message}</p>
        )}

        {/* STATS */}
        {tab === "stats" && (
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Users", stats.total],
              ["Girls", stats.girls],
              ["Guys", stats.guys],
              ["Premium", stats.premium],
              ["Posts", stats.posts],
              ["Messages", stats.messages],
            ].map(([label, val]) => (
              <div
                key={label as string}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
              >
                <p className="text-2xl font-bold text-pink-500">{val}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
            <button
              onClick={() => {
                loadStats();
                loadAccounts();
              }}
              className="col-span-2 bg-zinc-800 py-2.5 rounded-xl text-sm"
            >
              Refresh
            </button>
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="font-bold mb-1">Payment instructions</h3>
              <p className="text-xs text-gray-500 mb-3">
                Shown when users book services / calls (saved in this browser until we wire a DB
                settings table).
              </p>
              <textarea
                value={paymentText}
                onChange={(e) => setPaymentText(e.target.value)}
                rows={8}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm mb-3"
              />
              <button
                onClick={savePaymentInstructions}
                className="w-full bg-pink-600 py-2.5 rounded-xl text-sm font-semibold"
              >
                Save payment text
              </button>
              {settingsMsg && (
                <p className="text-green-400 text-xs mt-2">{settingsMsg}</p>
              )}
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="font-bold mb-2">Bulk actions</h3>
              <button
                onClick={applyDefaultServicesAllGirls}
                disabled={loading}
                className="w-full bg-zinc-800 py-2.5 rounded-xl text-sm mb-2"
              >
                Apply default services to ALL girls
              </button>
            </div>
          </div>
        )}

        {/* CHATS */}
        {tab === "chats" && (
          <div>
            {!selectedConv ? (
              <div className="space-y-2">
                <button
                  onClick={loadConversations}
                  className="text-xs text-gray-500 mb-2"
                >
                  Refresh chats
                </button>
                {conversations.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-8">No conversations yet</p>
                )}
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c)}
                    className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-3"
                  >
                    <p className="text-sm font-medium">
                      @{c.guy?.username || c.guy_id?.slice(0, 8)} → @
                      {c.girl?.username || c.girl_id?.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.updated_at
                        ? new Date(c.updated_at).toLocaleString()
                        : "—"}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setSelectedConv(null)}
                  className="text-pink-500 text-sm mb-3"
                >
                  ← Back
                </button>
                <p className="text-xs text-gray-500 mb-3">
                  Reply as the girl. Users see this in the app.
                </p>
                <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
                  {convMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`text-sm px-3 py-2 rounded-xl max-w-[85%] ${
                        m.sender_id === selectedConv.girl_id
                          ? "bg-zinc-800 mr-auto"
                          : "bg-pink-600 ml-auto"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    placeholder="Reply as girl..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-sm"
                  />
                  <button
                    onClick={sendAdminReply}
                    className="bg-pink-600 px-4 rounded-full text-sm font-semibold"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HOT LEADS — money intent last 24h */}
        {tab === "hotleads" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">
                Messages in last 24h that mention pay / book / meet / video — chase these first.
              </p>
              <button onClick={loadHotLeads} className="text-xs text-pink-500 shrink-0 ml-2">
                Refresh
              </button>
            </div>
            {hotLeads.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No hot leads yet</p>
            ) : (
              <div className="space-y-2">
                {hotLeads.map((m) => (
                  <div
                    key={m.id}
                    className="bg-zinc-900 border border-pink-500/20 rounded-xl p-3"
                  >
                    <p className="text-sm text-gray-100 whitespace-pre-wrap">{m.content}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {m.created_at ? new Date(m.created_at).toLocaleString() : ""} · conv{" "}
                      {String(m.conversation_id || "").slice(0, 8)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const conv = conversations.find((c) => c.id === m.conversation_id);
                        if (conv) {
                          setSelectedConv(conv);
                          openConversation(conv);
                          setTab("chats");
                        } else {
                          setMessage("Open Chats tab and find this conversation");
                          setTab("chats");
                        }
                      }}
                      className="mt-2 text-xs text-pink-400"
                    >
                      Open in Chats →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* UNLOCKS */}
        {tab === "unlocks" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">
                Users tap “I’ve paid” → appear here. Approve only after you confirm transfer.
              </p>
              <button onClick={loadUnlockRequests} className="text-xs text-pink-500 shrink-0 ml-2">
                Refresh
              </button>
            </div>
            {pendingUnlocks.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No pending unlocks</p>
            ) : (
              <div className="space-y-2">
                {pendingUnlocks.map((u) => (
                  <div
                    key={u.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex gap-3">
                      {u.screenshot && (
                        <a href={u.screenshot} target="_blank" rel="noreferrer">
                          <img
                            src={u.screenshot}
                            alt="Proof"
                            className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                          />
                        </a>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{u.label || u.id}</p>
                        <p className="text-xs text-gray-500 break-all">{u.note}</p>
                        {u.user_id && (
                          <p className="text-[10px] text-gray-600 truncate">
                            user: {u.user_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveUnlock(u)}
                        className="flex-1 text-xs bg-green-700 py-2 rounded-lg font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => removeUnlock(u.id)}
                        className="text-xs bg-zinc-800 px-3 py-2 rounded-lg text-gray-400"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACCOUNTS */}
        {tab === "accounts" && (
          <>
            {/* Create */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
              <h3 className="font-bold mb-3">Create fake account</h3>
              <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 mb-2 text-sm"
              />
              <input
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 mb-2 text-sm"
              />
              <input
                placeholder="Bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 mb-2 text-sm"
              />
              <input
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 mb-2 text-sm"
              />
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setRole("GIRL")}
                  className={`flex-1 py-2 rounded-lg text-sm ${
                    role === "GIRL" ? "bg-pink-600" : "bg-zinc-800"
                  }`}
                >
                  GIRL
                </button>
                <button
                  onClick={() => setRole("GUY")}
                  className={`flex-1 py-2 rounded-lg text-sm ${
                    role === "GUY" ? "bg-pink-600" : "bg-zinc-800"
                  }`}
                >
                  GUY
                </button>
              </div>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={() => avatarRef.current?.click()}
                className="w-full bg-zinc-800 py-2 rounded-xl text-sm mb-2"
              >
                {avatarFile ? avatarFile.name : "Avatar (optional)"}
              </button>
              <button
                onClick={createFakeAccount}
                disabled={loading}
                className="w-full bg-pink-600 py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create account"}
              </button>
            </div>

            {/* Bulk free videos — no account open required */}
            <div className="bg-zinc-900 border border-pink-500/30 rounded-2xl p-4 mb-4">
              <h3 className="font-bold text-sm mb-1">Free videos (anonymous)</h3>
              <p className="text-xs text-gray-500 mb-3">
                Multi-select 30–40 videos. No username on feed. Needs ≥1 girl account
                as storage host only.
              </p>
              <input
                type="file"
                accept="video/*,image/*"
                multiple
                className="block w-full text-xs text-gray-400 mb-2"
                onChange={handleFileSelect}
              />
              {files.length > 0 && (
                <p className="text-xs text-pink-400 mb-2">{files.length} file(s) selected</p>
              )}
              <button
                type="button"
                onClick={handleBulkFreeVideos}
                disabled={loading || files.length === 0}
                className="w-full bg-pink-600 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {loading ? "Uploading…" : `Post ${files.length || ""} free video(s)`}
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-3">
              <input
                placeholder="Search username..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 text-sm"
              >
                <option value="ALL">All</option>
                <option value="GIRL">Girls</option>
                <option value="GUY">Guys</option>
              </select>
            </div>

            {selectedIds.length > 0 && (
              <div className="mb-3 p-3 bg-pink-950/40 border border-pink-800/50 rounded-xl space-y-2">
                <p className="text-xs text-pink-300 font-semibold">
                  {selectedIds.length} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={bulkSetFollowers} className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800">Set followers</button>
                  <button type="button" onClick={bulkApplyServices} className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800">Default services</button>
                  <button type="button" onClick={() => bulkPremium(true)} className="text-[11px] px-2 py-1 rounded-lg bg-yellow-800">Premium on</button>
                  <button type="button" onClick={() => bulkPremium(false)} className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800">Premium off</button>
                  <button type="button" onClick={() => setSelectedIds([])} className="text-[11px] px-2 py-1 rounded-lg bg-zinc-700">Clear</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filtered.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(acc.id)}
                    onChange={() => toggleSelectId(acc.id)}
                    className="w-4 h-4 shrink-0 accent-pink-500"
                  />
                  <button
                    onClick={() => setSelectedAccount(acc)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center font-bold">
                      {acc.avatar_url ? (
                        <img
                          src={acc.avatar_url}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        (acc.username || "?")[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {acc.display_name || acc.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        @{acc.username} · {acc.role}
                        {acc.is_premium ? " · ★" : ""}
                      </p>
                    </div>
                  </button>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => togglePremium(acc)}
                      className={`text-[10px] px-2 py-1 rounded-lg ${
                        acc.is_premium ? "bg-yellow-700" : "bg-zinc-800"
                      }`}
                    >
                      {acc.is_premium ? "Premium" : "Free"}
                    </button>
                    <button
                      onClick={() => toggleRole(acc)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-zinc-800"
                    >
                      {acc.role}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

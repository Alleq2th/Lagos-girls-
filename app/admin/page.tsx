"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://xbqayhlpsvpjfehdbznz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicWF5aGxwc3ZwamZlaGRiem56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTU1ODYsImV4cCI6MjEwNzU5MTU4Nn0.zjYGcVkXSLq7NmknIwonyMxStzkfPzK-cC_xkC4y-qo"
);

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Create account
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("Lagos");
  const [role, setRole] = useState<"GIRL" | "GUY">("GIRL");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Accounts list
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  // Content for selected account
  const [accountPosts, setAccountPosts] = useState<any[]>([]);
  const [accountPrivate, setAccountPrivate] = useState<any[]>([]);
  const [accountStories, setAccountStories] = useState<any[]>([]);

  // Posting as selected account
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(2000);
  const [postType, setPostType] = useState<"public" | "private" | "story">("public");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const avatarRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ADMIN_PASSWORD = "lagos2025";

  useEffect(() => {
    if (isAuthenticated) loadAccounts();
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedAccount) {
      loadAccountContent(selectedAccount.id);
    }
  }, [selectedAccount]);

  async function loadAccounts() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAccounts(data);
  }

  async function loadAccountContent(userId: string) {
    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: privates } = await supabase
      .from("private_media")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: stories } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setAccountPosts(posts || []);
    setAccountPrivate(privates || []);
    setAccountStories(stories || []);
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
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
      const fakeEmail = `${cleanUsername}${Date.now()}@gmail.com`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: "FakePass123!",
        options: {
          data: { username: cleanUsername, role },
        },
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
          const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
          avatar_url = data.publicUrl;
        }
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        username: cleanUsername,
        display_name: displayName || username,
        bio: bio || null,
        location: location || "Lagos",
        role,
        avatar_url,
      });

      if (profileError) throw profileError;

      setMessage(`✅ @${cleanUsername} created!`);
      setUsername("");
      setDisplayName("");
      setBio("");
      setAvatarFile(null);
      if (avatarRef.current) avatarRef.current.value = "";
      loadAccounts();
    } catch (err: any) {
      setMessage(err.message || "Error creating account");
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
    if (!selectedAccount || files.length === 0) return setMessage("Select files first");

    setLoading(true);
    setMessage("");

    try {
      for (const file of files) {
        const mediaType = file.type.startsWith("video") ? "video" : "image";
        const mediaUrl = await uploadFile(file);

        if (postType === "story") {
          await supabase.from("stories").insert({
            user_id: selectedAccount.id,
            media_url: mediaUrl,
            media_type: mediaType,
          });
        } else if (postType === "private") {
          await supabase.from("private_media").insert({
            user_id: selectedAccount.id,
            title: title || "Private Content",
            media_url: mediaUrl,
            media_type: mediaType,
            price,
          });
        } else {
          await supabase.from("posts").insert({
            user_id: selectedAccount.id,
            caption: caption || null,
            media_url: mediaUrl,
            media_type: mediaType,
          });
        }
      }

      setMessage("Content posted successfully!");
      setFiles([]);
      setPreviews([]);
      setCaption("");
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      loadAccountContent(selectedAccount.id);
    } catch (err: any) {
      setMessage(err.message || "Failed to post");
    }
    setLoading(false);
  }

  async function deleteContent(table: string, id: string) {
    if (!confirm("Delete this content?")) return;
    await supabase.from(table).delete().eq("id", id);
    loadAccountContent(selectedAccount.id);
    setMessage("Deleted");
          }
    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  // ========== LOGIN SCREEN ==========
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-pink-500 text-center mb-6">Admin Access</h1>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 mb-4"
          />
          {message && <p className="text-red-400 text-sm text-center mb-3">{message}</p>}
          <button onClick={handleLogin} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 rounded-xl">
            Enter Admin
          </button>
        </div>
      </div>
    );
  }

  // ========== SINGLE ACCOUNT CONTROL ==========
  if (selectedAccount) {
    return (
      <div className="min-h-screen bg-black text-white p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setSelectedAccount(null)} className="text-pink-500 mb-4 text-sm">
            ← Back to All Accounts
          </button>

          {/* Account Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-xl font-bold">
              {selectedAccount.avatar_url ? (
                <img src={selectedAccount.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                selectedAccount.username?.[0]?.toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{selectedAccount.display_name || selectedAccount.username}</h2>
              <p className="text-gray-400 text-sm">@{selectedAccount.username}</p>
            </div>
          </div>

          {/* POST AS THIS ACCOUNT */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8">
            <h3 className="font-bold mb-4">Post as this account</h3>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPostType("public")}
                className={`flex-1 py-2 rounded-lg text-sm ${postType === "public" ? "bg-pink-600" : "bg-zinc-800"}`}
              >
                Public
              </button>
              <button
                onClick={() => setPostType("private")}
                className={`flex-1 py-2 rounded-lg text-sm ${postType === "private" ? "bg-pink-600" : "bg-zinc-800"}`}
              >
                Private ₦
              </button>
              <button
                onClick={() => setPostType("story")}
                className={`flex-1 py-2 rounded-lg text-sm ${postType === "story" ? "bg-pink-600" : "bg-zinc-800"}`}
              >
                Story
              </button>
            </div>

            {postType === "public" && (
              <textarea
                placeholder="Caption..."
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
                  placeholder="Title (e.g. My Nudes)"
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
              <div className="grid grid-cols-4 gap-2 mb-3">
                {previews.map((src, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-zinc-800">
                    <img src={src} className="w-full h-full object-cover" alt="" />
                  </div>
                ))}
              </div>
            )}

            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-zinc-600 rounded-xl p-6 text-center mb-4 cursor-pointer"
            >
              <p className="text-gray-400 text-sm">
                {files.length > 0 ? `${files.length} file(s) selected` : "Tap to select photos / videos"}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {message && <p className="text-sm text-pink-400 mb-3">{message}</p>}

            <button
              onClick={handlePostAsAccount}
              disabled={loading || files.length === 0}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
            >
              {loading ? "Posting..." : "Post Now"}
            </button>
          </div>

          {/* EXISTING CONTENT */}
          <div className="space-y-8">
            {/* Public Posts */}
            <div>
              <h3 className="font-bold mb-3">Public Posts ({accountPosts.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {accountPosts.map((p) => (
                  <div key={p.id} className="relative aspect-square bg-zinc-900 rounded-lg overflow-hidden">
                    <img src={p.media_url} className="w-full h-full object-cover" alt="" />
                    <button
                      onClick={() => deleteContent("posts", p.id)}
                      className="absolute top-1 right-1 bg-black/70 text-xs px-2 py-1 rounded text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Private Content */}
            <div>
              <h3 className="font-bold mb-3 text-pink-500">Private Content ({accountPrivate.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {accountPrivate.map((p) => (
                  <div key={p.id} className="relative aspect-square bg-zinc-900 rounded-lg overflow-hidden">
                    <img src={p.media_url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs p-1 text-center">
                      ₦{p.price}
                    </div>
                    <button
                      onClick={() => deleteContent("private_media", p.id)}
                      className="absolute top-1 right-1 bg-black/70 text-xs px-2 py-1 rounded text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Stories */}
            <div>
              <h3 className="font-bold mb-3">Stories ({accountStories.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {accountStories.map((s) => (
                  <div key={s.id} className="relative aspect-square bg-zinc-900 rounded-lg overflow-hidden">
                    <img src={s.media_url} className="w-full h-full object-cover" alt="" />
                    <button
                      onClick={() => deleteContent("stories", s.id)}
                      className="absolute top-1 right-1 bg-black/70 text-xs px-2 py-1 rounded text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN ADMIN DASHBOARD ==========
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-pink-500">Lagos Girls Admin</h1>
          <a href="/" className="text-sm text-gray-400">← Back to App</a>
        </div>

        {/* CREATE ACCOUNT */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Create New Account</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Username (no spaces)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3"
            />
            <input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3"
            />
            <textarea
              placeholder="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 resize-none"
            />
            <input
              type="text"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3"
            >
              <option value="GIRL">Girl</option>
              <option value="GUY">Guy</option>
            </select>

            <button onClick={() => avatarRef.current?.click()} className="text-sm text-pink-500">
              {avatarFile ? avatarFile.name : "Upload Profile Picture"}
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />

            {message && (
              <p className={`text-sm ${message.includes("✅") ? "text-green-400" : "text-red-400"}`}>
                {message}
              </p>
            )}

            <button
              onClick={createFakeAccount}
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </div>

        {/* ALL ACCOUNTS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">All Accounts ({accounts.length})</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-700 transition"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center font-bold">
                  {acc.avatar_url ? (
                    <img src={acc.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    acc.username?.[0]?.toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-medium">{acc.display_name || acc.username}</p>
                  <p className="text-xs text-gray-400">@{acc.username} • {acc.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
              }

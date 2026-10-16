"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Create account form
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("Lagos");
  const [role, setRole] = useState<"GIRL" | "GUY">("GIRL");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // List of fake accounts
  const [accounts, setAccounts] = useState<any[]>([]);

  const avatarRef = useRef<HTMLInputElement>(null);

  // Change this password to whatever you want
  const ADMIN_PASSWORD = "lagos2025";

  useEffect(() => {
    if (isAuthenticated) loadAccounts();
  }, [isAuthenticated]);

  async function loadAccounts() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAccounts(data);
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
      // 1. Create a fake email
      const fakeEmail = `${username.toLowerCase()}@lagosgirls.fake`;

      // 2. Create auth user (with a default password)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: "FakePass123!",
        options: {
          data: { username: username.toLowerCase(), role },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      let avatar_url = null;

      // 3. Upload avatar if selected
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

      // 4. Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        username: username.toLowerCase(),
        display_name: displayName || username,
        bio: bio || null,
        location: location || "Lagos",
        role,
        avatar_url,
      });

      if (profileError) throw profileError;

      setMessage(`✅ Account @${username} created successfully!`);
      setUsername("");
      setDisplayName("");
      setBio("");
      setLocation("Lagos");
      setAvatarFile(null);
      if (avatarRef.current) avatarRef.current.value = "";
      loadAccounts();
    } catch (err: any) {
      setMessage(err.message || "Error creating account");
    }

    setLoading(false);
  }

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

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-pink-500">Lagos Girls Admin</h1>
          <a href="/" className="text-sm text-gray-400">← Back to App</a>
        </div>

        {/* CREATE ACCOUNT */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Create Fake Account</h2>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Username (e.g. chioma_baddie)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3"
            />
            <input
              type="text"
              placeholder="Display Name (e.g. Chioma)"
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

            <div>
              <button
                onClick={() => avatarRef.current?.click()}
                className="text-sm text-pink-500 mb-2"
              >
                {avatarFile ? avatarFile.name : "Upload Profile Picture"}
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
            </div>

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

        {/* LIST OF ACCOUNTS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">All Accounts ({accounts.length})</h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center font-bold">
                  {acc.avatar_url ? (
                    <img src={acc.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    acc.username?.[0]?.toUpperCase()
                  )}
                </div>
                <div className="flex-1">
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

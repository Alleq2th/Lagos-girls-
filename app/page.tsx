"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile, Post, PrivateMedia } from "@/types";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<"age" | "auth" | "feed" | "profile" | "create" | "private" | "edit">("age");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Auth form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"GUY" | "GIRL">("GUY");
  const [agreed, setAgreed] = useState(false);

  // Profile edit
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

  // Create post
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [price, setPrice] = useState(2000);
  const [title, setTitle] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        setView("feed");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        setView("feed");
      } else {
        setProfile(null);
        setView("auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === "feed") loadPosts();
  }, [view]);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      setLocation(data.location || "");
    }
  }

  async function loadPosts() {
    const { data } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (
          id,
          username,
          display_name,
          avatar_url,
          role,
          location
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setPosts(data as any);
  }

  async function handleSignUp() {
    if (!agreed) {
      setMessage("You must agree that you are 18+ and accept the Terms");
      return;
    }
    if (!email || !password || !username) {
      setMessage("Please fill all fields");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username: username.toLowerCase(),
        role,
        display_name: username,
      });

      if (profileError) {
        setMessage(profileError.message);
      } else {
        setMessage("Account created! Check your email to confirm (or just login).");
      }
    }
    setLoading(false);
  }

  async function handleLogin() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setMessage(error.message);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setView("auth");
  }

  async function updateProfile() {
    if (!session) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio,
        location,
      })
      .eq("id", session.user.id);

    if (error) setMessage(error.message);
    else {
      setMessage("Profile updated!");
      loadProfile(session.user.id);
      setView("profile");
    }
    setLoading(false);
  }

  async function uploadFile(file: File, bucket: string) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleCreatePost() {
    if (!session || !file) {
      setMessage("Please select a photo or video");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const mediaType = file.type.startsWith("video") ? "video" : "image";
      const mediaUrl = await uploadFile(file, "media");

      if (isPrivate) {
        const { error } = await supabase.from("private_media").insert({
          user_id: session.user.id,
          title: title || "Private content",
          media_url: mediaUrl,
          media_type: mediaType,
          price: price,
        });
        if (error) throw error;
        setMessage("Private content uploaded!");
      } else {
        const { error } = await supabase.from("posts").insert({
          user_id: session.user.id,
          caption,
          media_url: mediaUrl,
          media_type: mediaType,
        });
        if (error) throw error;
        setMessage("Posted successfully!");
      }

      setCaption("");
      setTitle("");
      setFile(null);
      setIsPrivate(false);
      if (fileRef.current) fileRef.current.value = "";
      setView("feed");
      loadPosts();
    } catch (err: any) {
      setMessage(err.message || "Upload failed");
    }
    setLoading(false);
  }

  // ========== UI ==========

  // AGE GATE
  if (view === "age") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-pink-500 mb-2">Lagos Girls</h1>
          <p className="text-gray-400 mb-8">Premium adult experience</p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left mb-6">
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              This website contains adult content intended for individuals 18 years of age or older.
              By entering you confirm that you are at least 18 years old and you agree to our Terms of Service and Privacy Policy.
            </p>
            <p className="text-xs text-gray-500">
              We may use uploaded images and content as stated in our terms. Digital content purchases are final.
            </p>
          </div>

          <button
            onClick={() => setView("auth")}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-4 rounded-xl text-lg transition"
          >
            I am 18 or older — Enter
          </button>
        </div>
      </div>
    );
  }

  // AUTH
  if (view === "auth" || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-pink-500 text-center mb-8">Lagos Girls</h1>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "GUY" | "GIRL")}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500"
            >
              <option value="GUY">I am a Guy</option>
              <option value="GIRL">I am a Girl</option>
            </select>

            <label className="flex items-start gap-3 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />
              <span>
                I confirm I am 18+ and I agree to the Terms of Service & Privacy Policy.
                I understand that uploaded content may be used according to the platform rules.
              </span>
            </label>

            {message && (
              <p className="text-sm text-center text-pink-400">{message}</p>
            )}

            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3.5 rounded-xl transition"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-pink-500">Lagos Girls</h1>
          <div className="flex items-center gap-4 text-sm">
            <button onClick={() => setView("feed")} className={view === "feed" ? "text-pink-500" : "text-gray-400"}>
              Feed
            </button>
            <button onClick={() => setView("create")} className={view === "create" ? "text-pink-500" : "text-gray-400"}>
              Post
            </button>
            <button onClick={() => setView("profile")} className={view === "profile" ? "text-pink-500" : "text-gray-400"}>
              Me
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* FEED */}
        {view === "feed" && (
          <div className="divide-y divide-zinc-900">
            {posts.length === 0 && (
              <p className="text-center text-gray-500 py-20">No posts yet. Be the first!</p>
            )}
            {posts.map((post) => (
              <article key={post.id} className="pb-6">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                    {post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                        {post.profiles?.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{post.profiles?.display_name || post.profiles?.username}</p>
                    <p className="text-xs text-gray-500">
                      @{post.profiles?.username} {post.profiles?.location && `• ${post.profiles.location}`}
                    </p>
                  </div>
                </div>

                {post.media_type === "video" ? (
                  <video
                    src={post.media_url}
                    controls
                    className="w-full aspect-[4/5] object-cover bg-zinc-900"
                  />
                ) : (
                  <img
                    src={post.media_url}
                    alt=""
                    className="w-full aspect-[4/5] object-cover bg-zinc-900"
                  />
                )}

                {post.caption && (
                  <p className="px-4 mt-3 text-sm">
                    <span className="font-semibold mr-2">{post.profiles?.username}</span>
                    {post.caption}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        {/* CREATE POST */}
        {view === "create" && (
          <div className="p-4 space-y-5">
            <h2 className="text-xl font-bold">Create Post</h2>

            <div className="flex gap-3">
              <button
                onClick={() => setIsPrivate(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${!isPrivate ? "bg-pink-600" : "bg-zinc-800"}`}
              >
                Public Post
              </button>
              <button
                onClick={() => setIsPrivate(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${isPrivate ? "bg-pink-600" : "bg-zinc-800"}`}
              >
                Private (Paid)
              </button>
            </div>

            {isPrivate && (
              <>
                <input
                  type="text"
                  placeholder="Title (e.g. My Nudes)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
                />
                <input
                  type="number"
                  placeholder="Price in ₦"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
                />
              </>
            )}

            {!isPrivate && (
              <textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 resize-none"
              />
            )}

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center cursor-pointer hover:border-pink-500 transition"
            >
              {file ? (
                <p className="text-pink-400">{file.name}</p>
              ) : (
                <p className="text-gray-400">Tap to select Photo or Video</p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {message && <p className="text-center text-sm text-pink-400">{message}</p>}

            <button
              onClick={handleCreatePost}
              disabled={loading || !file}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl"
            >
              {loading ? "Uploading..." : isPrivate ? "Upload Private Content" : "Share Post"}
            </button>
          </div>
        )}

        {/* PROFILE */}
        {view === "profile" && profile && (
          <div className="p-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-zinc-500">
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile.display_name || profile.username}</h2>
                <p className="text-gray-400 text-sm">@{profile.username}</p>
                <p className="text-xs text-pink-500 mt-1">{profile.role}</p>
              </div>
            </div>

            {profile.bio && <p className="text-gray-300 mb-4">{profile.bio}</p>}
            {profile.location && <p className="text-sm text-gray-500 mb-6">📍 {profile.location}</p>}

            <div className="space-y-3">
              <button
                onClick={() => setView("edit")}
                className="w-full bg-zinc-900 border border-zinc-700 py-3 rounded-xl font-medium"
              >
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-zinc-900 border border-zinc-700 py-3 rounded-xl font-medium text-red-400"
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {/* EDIT PROFILE */}
        {view === "edit" && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold mb-2">Edit Profile</h2>
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
            />
            <textarea
              placeholder="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 resize-none"
            />
            <input
              type="text"
              placeholder="Location (e.g. Lekki, Lagos)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
            />
            {message && <p className="text-sm text-pink-400">{message}</p>}
            <button
              onClick={updateProfile}
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 py-3.5 rounded-xl font-semibold"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => setView("profile")}
              className="w-full bg-zinc-900 py-3 rounded-xl"
            >
              Cancel
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

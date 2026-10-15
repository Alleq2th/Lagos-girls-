"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { Profile, Post, PrivateMedia } from "../types";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<"age" | "auth" | "feed" | "profile" | "create" | "user" | "edit" | "terms">("age");
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userPrivate, setUserPrivate] = useState<PrivateMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Auth
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
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [price, setPrice] = useState(2000);
  const [title, setTitle] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        ensureProfile(session.user);
        setView("feed");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        ensureProfile(session.user);
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

  // ========== AUTO CREATE PROFILE ==========
  async function ensureProfile(user: any) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      setLocation(data.location || "");
      return data;
    }

    // Profile doesn't exist → create it automatically
    const newProfile = {
      id: user.id,
      username: user.user_metadata?.username || user.email?.split("@")[0] || "user" + Date.now(),
      display_name: user.user_metadata?.username || "New User",
      role: user.user_metadata?.role || "GUY",
    };

    const { data: created, error } = await supabase
      .from("profiles")
      .insert(newProfile)
      .select()
      .single();

    if (!error && created) {
      setProfile(created);
      return created;
    }
  }

  async function loadPosts() {
    const { data } = await supabase
      .from("posts")
      .select(`*, profiles (id, username, display_name, avatar_url, role, location)`)
      .order("created_at", { ascending: false })
      .limit(40);

    if (data) setPosts(data as any);
  }

  async function openUserProfile(userId: string) {
    const { data: userData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!userData) return;

    setSelectedUser(userData);

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: privateData } = await supabase
      .from("private_media")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setUserPosts(postsData || []);
    setUserPrivate(privateData || []);
    setView("user");
  }

  // ========== AUTH ==========
  async function handleSignUp() {
    if (!agreed) return setMessage("You must confirm you are 18+");
    if (!email || !password || !username) return setMessage("Please fill all fields");

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.toLowerCase(), role },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username: username.toLowerCase(),
        display_name: username,
        role,
      });
      setMessage("Account created successfully!");
    }
    setLoading(false);
  }

  async function handleLogin() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setView("auth");
  }

  // ========== PROFILE UPDATE ==========
  async function updateProfile() {
    if (!session) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio, location })
      .eq("id", session.user.id);

    if (error) setMessage(error.message);
    else {
      setMessage("Profile updated!");
      ensureProfile(session.user);
      setView("profile");
    }
    setLoading(false);
  }

  // ========== FILE HANDLING ==========
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 10) {
      setMessage("Maximum 10 files at once");
      return;
    }
    setFiles(selected);

    const urls = selected.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
  }

  async function uploadFile(file: File) {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("media").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleCreatePost() {
    if (!session || files.length === 0) return setMessage("Please select at least one photo or video");

    setLoading(true);
    setMessage("");

    try {
      for (const file of files) {
        const mediaType = file.type.startsWith("video") ? "video" : "image";
        const mediaUrl = await uploadFile(file);

        if (isPrivate) {
          await supabase.from("private_media").insert({
            user_id: session.user.id,
            title: title || "Private Content",
            media_url: mediaUrl,
            media_type: mediaType,
            price,
          });
        } else {
          await supabase.from("posts").insert({
            user_id: session.user.id,
            caption: files.length === 1 ? caption : caption || null,
            media_url: mediaUrl,
            media_type: mediaType,
          });
        }
      }

      setMessage(isPrivate ? "Private content uploaded!" : "Posted successfully!");
      setFiles([]);
      setPreviews([]);
      setCaption("");
      setTitle("");
      setIsPrivate(false);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => {
        setView("feed");
        loadPosts();
      }, 800);
    } catch (err: any) {
      setMessage(err.message || "Upload failed");
    }
    setLoading(false);
  }
    // ========== UI ==========
  if (view === "age") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-pink-500 mb-2">Lagos Girls</h1>
          <p className="text-gray-400 mb-8">Premium adult experience for 18+</p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left text-sm text-gray-300 mb-6 leading-relaxed">
            This platform contains adult content. By entering you confirm you are at least 18 years old.
            You also agree that any content you upload may be used according to our Terms.
          </div>

          <button
            onClick={() => setView("auth")}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-4 rounded-xl text-lg"
          >
            I am 18 or older — Enter
          </button>

          <button onClick={() => setView("terms")} className="mt-4 text-sm text-gray-500 underline">
            Terms & Privacy Policy
          </button>
        </div>
      </div>
    );
  }

  if (view === "terms") {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setView("age")} className="text-pink-500 mb-6">← Back</button>
          <h1 className="text-2xl font-bold mb-4">Terms & Privacy Policy</h1>
          <div className="text-sm text-gray-300 space-y-4 leading-relaxed">
            <p>1. You must be 18 years or older to use this platform.</p>
            <p>2. All content is adult in nature.</p>
            <p>3. By uploading content you grant Lagos Girls a license to display and distribute it on the platform.</p>
            <p>4. Digital content purchases are final and non-refundable.</p>
            <p>5. We respect your privacy. We do not sell your personal data.</p>
            <p>6. Harassment, illegal content, or underage material will result in immediate ban.</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === "auth" || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-pink-500 text-center mb-8">Lagos Girls</h1>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500" />
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500" />

            <select value={role} onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3">
              <option value="GUY">I am a Guy</option>
              <option value="GIRL">I am a Girl</option>
            </select>

            <label className="flex items-start gap-3 text-sm text-gray-300">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              <span>I confirm I am 18+ and agree to the Terms & Privacy Policy</span>
            </label>

            {message && <p className="text-center text-sm text-pink-400">{message}</p>}

            <button onClick={handleSignUp} disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl">
              {loading ? "Creating..." : "Create Account"}
            </button>
            <button onClick={handleLogin} disabled={loading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3.5 rounded-xl">
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
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-pink-500">Lagos Girls</h1>
          <div className="flex gap-5 text-sm">
            <button onClick={() => setView("feed")} className={view === "feed" ? "text-pink-500" : "text-gray-400"}>Feed</button>
            <button onClick={() => setView("create")} className={view === "create" ? "text-pink-500" : "text-gray-400"}>Post</button>
            <button onClick={() => setView("profile")} className={view === "profile" ? "text-pink-500" : "text-gray-400"}>Me</button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* FEED */}
        {view === "feed" && (
          <div>
            {posts.length === 0 ? (
              <p className="text-center text-gray-500 py-24">No posts yet. Be the first to post!</p>
            ) : (
              posts.map((post) => (
                <article key={post.id} className="border-b border-zinc-900 pb-6">
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => openUserProfile(post.user_id)}>
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold overflow-hidden">
                      {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        post.profiles?.username?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{post.profiles?.display_name || post.profiles?.username}</p>
                      <p className="text-xs text-gray-500">@{post.profiles?.username}</p>
                    </div>
                  </div>

                  {post.media_type === "video" ? (
                    <video src={post.media_url} controls className="w-full aspect-[4/5] bg-zinc-900" />
                  ) : (
                    <img src={post.media_url} className="w-full aspect-[4/5] object-cover bg-zinc-900" />
                  )}

                  {post.caption && (
                    <p className="px-4 mt-3 text-sm">
                      <span className="font-semibold mr-2">{post.profiles?.username}</span>
                      {post.caption}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        )}

        {/* CREATE */}
        {view === "create" && (
          <div className="p-4 space-y-5">
            <h2 className="text-xl font-bold">Create Post</h2>

            <div className="flex gap-3">
              <button onClick={() => setIsPrivate(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${!isPrivate ? "bg-pink-600" : "bg-zinc-800"}`}>
                Public
              </button>
              <button onClick={() => setIsPrivate(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${isPrivate ? "bg-pink-600" : "bg-zinc-800"}`}>
                Private (Paid)
              </button>
            </div>

            {isPrivate && (
              <>
                <input type="text" placeholder="Title (e.g. My Nudes)" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3" />
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-400">₦</span>
                  <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-4 py-3" />
                </div>
              </>
            )}

            {!isPrivate && (
              <textarea placeholder="Write a caption..." value={caption} onChange={(e) => setCaption(e.target.value)}
                rows={3} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 resize-none" />
            )}

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-zinc-900">
                    {files[i]?.type.startsWith("video") ? (
                      <video src={src} className="w-full h-full object-cover" />
                    ) : (
                      <img src={src} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center cursor-pointer hover:border-pink-500 transition">
              <p className="text-gray-400">{files.length > 0 ? `${files.length} file(s) selected` : "Tap to select Photos or Videos"}</p>
              <p className="text-xs text-gray-600 mt-1">Up to 10 files</p>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
            </div>

            {message && <p className="text-center text-sm text-pink-400">{message}</p>}

            <button onClick={handleCreatePost} disabled={loading || files.length === 0}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl">
              {loading ? "Uploading..." : isPrivate ? `Upload Private • ₦${price.toLocaleString()}` : "Share Post"}
            </button>
          </div>
        )}

        {/* MY PROFILE */}
        {view === "profile" && profile && (
          <div className="p-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold overflow-hidden">
                {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : profile.username[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile.display_name || profile.username}</h2>
                <p className="text-gray-400 text-sm">@{profile.username}</p>
                <p className="text-xs text-pink-500 mt-1">{profile.role}</p>
              </div>
            </div>

            {profile.bio && <p className="text-gray-300 mb-2">{profile.bio}</p>}
            {profile.location && <p className="text-sm text-gray-500 mb-6">📍 {profile.location}</p>}

            <div className="space-y-3">
              <button onClick={() => setView("edit")} className="w-full bg-zinc-900 border border-zinc-700 py-3 rounded-xl">
                Edit Profile
              </button>
              <button onClick={handleLogout} className="w-full bg-zinc-900 border border-zinc-700 py-3 rounded-xl text-red-400">
                Logout
              </button>
            </div>
          </div>
        )}

        {/* EDIT PROFILE */}
        {view === "edit" && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold">Edit Profile</h2>
            <input type="text" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3" />
            <textarea placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 resize-none" />
            <input type="text" placeholder="Location (e.g. Lekki)" value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3" />
            {message && <p className="text-sm text-pink-400">{message}</p>}
            <button onClick={updateProfile} disabled={loading} className="w-full bg-pink-600 py-3.5 rounded-xl font-semibold">
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => setView("profile")} className="w-full bg-zinc-900 py-3 rounded-xl">Cancel</button>
          </div>
        )}

        {/* OTHER USER PROFILE */}
        {view === "user" && selectedUser && (
          <div className="p-4">
            <button onClick={() => setView("feed")} className="text-sm text-gray-400 mb-4">← Back</button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold">
                {selectedUser.username[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedUser.display_name || selectedUser.username}</h2>
                <p className="text-gray-400 text-sm">@{selectedUser.username}</p>
                <p className="text-xs text-pink-500">{selectedUser.role}</p>
              </div>
            </div>

            {selectedUser.bio && <p className="text-gray-300 mb-4">{selectedUser.bio}</p>}

            <h3 className="font-bold mb-3">Public Posts</h3>
            <div className="grid grid-cols-3 gap-1 mb-8">
              {userPosts.map((p) => (
                <div key={p.id} className="aspect-square bg-zinc-900 overflow-hidden">
                  {p.media_type === "video" ? (
                    <video src={p.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={p.media_url} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>

            {userPrivate.length > 0 && (
              <>
                <h3 className="font-bold mb-3 text-pink-500">Private Content 🔒</h3>
                <div className="grid grid-cols-2 gap-3">
                  {userPrivate.map((m) => (
                    <div key={m.id} className="relative rounded-xl overflow-hidden bg-zinc-900">
                      <img src={m.media_url} className="w-full aspect-[3/4] object-cover locked" />
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        <p className="font-medium text-sm mb-1">{m.title}</p>
                        <p className="text-pink-400 font-bold">₦{m.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
              }

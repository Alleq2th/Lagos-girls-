"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { smartFeedSort, shuffleArray } from "../lib/algorithm";
import type { Profile, Post, PrivateMedia } from "../types";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<"age" | "auth" | "feed" | "profile" | "create" | "user" | "edit" | "terms" | "saved" | "messages" | "chat">("age");
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userPrivate, setUserPrivate] = useState<PrivateMedia[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [comments, setComments] = useState<{ [key: string]: any[] }>({});
  const [activeStory, setActiveStory] = useState<any>(null);
  const [storyComment, setStoryComment] = useState("");

  // Messaging
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentChat, setCurrentChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"GUY" | "GIRL">("GUY");
  const [agreed, setAgreed] = useState(false);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Create
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isStory, setIsStory] = useState(false);
  const [price, setPrice] = useState(2000);
  const [title, setTitle] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

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
    if (view === "feed") {
      loadPosts();
      loadStories();
    }
    if (view === "saved" && session) loadSavedPosts();
    if (view === "profile" && session) loadMyPosts();
    if (view === "messages" && session) loadConversations();
  }, [view]);

  async function ensureProfile(user: any) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      setLocation(data.location || "");
      return data;
    }
    const newProfile = {
      id: user.id,
      username: user.user_metadata?.username || user.email?.split("@")[0] || "user" + Date.now(),
      display_name: user.user_metadata?.username || "New User",
      role: user.user_metadata?.role || "GUY",
    };
    const { data: created } = await supabase.from("profiles").insert(newProfile).select().single();
    if (created) setProfile(created);
  }

  async function loadStories() {
    const { data } = await supabase
      .from("stories")
      .select(`*, profiles (id, username, display_name, avatar_url)`)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });
    if (data) setStories(shuffleArray(data));
  }

  async function loadPosts() {
    setFeedLoading(true);
    try {
      const { data } = await supabase
        .from("posts")
        .select(`*, profiles (id, username, display_name, avatar_url, role, location)`)
        .order("created_at", { ascending: false })
        .limit(40);

      if (data && data.length > 0) {
        // Parallelize stats fetching for better speed
        const postsWithStats = await Promise.all(
          data.map(async (post: any) => {
            const [likesRes, myLikeRes, mySaveRes] = await Promise.all([
              supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", post.id),
              session?.user?.id
                ? supabase.from("likes").select("id").eq("post_id", post.id).eq("user_id", session.user.id).maybeSingle()
                : Promise.resolve({ data: null }),
              session?.user?.id
                ? supabase.from("saves").select("id").eq("post_id", post.id).eq("user_id", session.user.id).maybeSingle()
                : Promise.resolve({ data: null }),
            ]);
            return {
              ...post,
              likes_count: likesRes.count || 0,
              liked_by_me: !!myLikeRes.data,
              saved_by_me: !!mySaveRes.data,
            };
          })
        );
        setPosts(smartFeedSort(postsWithStats));
      } else {
        setPosts([]);
      }
    } finally {
      setFeedLoading(false);
    }
  }

  async function loadMyPosts() {
    if (!session) return;
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setMyPosts(data || []);
  }

  async function loadComments(postId: string) {
    const { data } = await supabase
      .from("comments")
      .select(`*, profiles (username, display_name, avatar_url)`)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setComments((prev) => ({ ...prev, [postId]: data || [] }));
  }

  async function loadSavedPosts() {
    if (!session) return;
    const { data } = await supabase
      .from("saves")
      .select(`post_id, posts (*, profiles (username, display_name, avatar_url))`)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (data) setSavedPosts(data.map((s: any) => s.posts));
  }

  async function loadConversations() {
    if (!session || !profile) return;
    const { data } = await supabase
      .from("conversations")
      .select(`*, guy:profiles!guy_id(username, display_name, avatar_url), girl:profiles!girl_id(username, display_name, avatar_url)`)
      .or(`guy_id.eq.${session.user.id},girl_id.eq.${session.user.id}`)
      .order("updated_at", { ascending: false });
    setConversations(data || []);
    }
    async function openUserProfile(userId: string) {
    const { data: userData } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (!userData) return;
    setSelectedUser(userData);

    const { data: postsData } = await supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    const { data: privateData } = await supabase.from("private_media").select("*").eq("user_id", userId).order("created_at", { ascending: false });

    setUserPosts(postsData || []);
    setUserPrivate(privateData || []);
    setView("user");
  }

  async function toggleLike(postId: string) {
    if (!session) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update for instant feedback
    const wasLiked = post.liked_by_me;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked_by_me: !wasLiked,
              likes_count: wasLiked ? Math.max(0, (p.likes_count || 0) - 1) : (p.likes_count || 0) + 1,
            }
          : p
      )
    );

    if (wasLiked) {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", session.user.id);
    } else {
      await supabase.from("likes").insert({ post_id: postId, user_id: session.user.id });
    }
  }

  async function toggleSave(postId: string) {
    if (!session) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update
    const wasSaved = post.saved_by_me;
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, saved_by_me: !wasSaved } : p))
    );

    if (wasSaved) {
      await supabase.from("saves").delete().eq("post_id", postId).eq("user_id", session.user.id);
    } else {
      await supabase.from("saves").insert({ post_id: postId, user_id: session.user.id });
    }
  }

  async function postComment(postId: string) {
    if (!session || !commentText[postId]?.trim()) return;
    await supabase.from("comments").insert({
      post_id: postId,
      user_id: session.user.id,
      content: commentText[postId],
    });
    setCommentText({ ...commentText, [postId]: "" });
    loadComments(postId);
  }

  async function openComments(postId: string) {
    setShowComments({ ...showComments, [postId]: !showComments[postId] });
    if (!comments[postId]) loadComments(postId);
  }

  async function deleteMyPost(postId: string) {
    if (!confirm("Delete this post?")) return;
    await supabase.from("posts").delete().eq("id", postId);
    loadMyPosts();
    setMessage("Post deleted");
  }

  // ========== PREMIUM ==========
  async function becomePremium() {
    if (!session || !profile) return;
    if (profile.is_premium) return setMessage("You are already Premium");

    const confirmPay = confirm("Become Premium for ₦5,000?\n\nYou will be able to message girls.");
    if (!confirmPay) return;

    // For now we just activate it (later we connect real Paystack)
    const { error } = await supabase
      .from("profiles")
      .update({ is_premium: true })
      .eq("id", session.user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("🎉 You are now Premium!");
      ensureProfile(session.user);
    }
  }

  // ========== MESSAGING ==========
  async function startChat(girlId: string) {
    if (!session || !profile) return;

    if (!profile.is_premium) {
      return setMessage("Only Premium users can message. Become Premium for ₦5,000");
    }

    // Check if conversation already exists
    let { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("guy_id", session.user.id)
      .eq("girl_id", girlId)
      .maybeSingle();

    if (!existing) {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          guy_id: session.user.id,
          girl_id: girlId,
        })
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }
      existing = newConv;
    }

    setCurrentChat(existing);
    loadChatMessages(existing.id);
    setView("chat");
  }

  async function loadChatMessages(conversationId: string) {
    const { data } = await supabase
      .from("messages")
      .select(`*, sender:profiles(username, display_name, avatar_url)`)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setChatMessages(data || []);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !currentChat || !session) return;

    await supabase.from("messages").insert({
      conversation_id: currentChat.id,
      sender_id: session.user.id,
      content: newMessage.trim(),
    });

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", currentChat.id);

    setNewMessage("");
    loadChatMessages(currentChat.id);
  }

  // ========== AUTH ==========
  async function handleSignUp() {
    if (!agreed) return setMessage("You must confirm you are 18+");
    if (!password || !username) return setMessage("Username and password required");

    const finalEmail = email || `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}${Date.now()}@gmail.com`;

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: finalEmail,
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
      setMessage("Account created!");
    }
    setLoading(false);
  }

  async function handleLogin() {
    setLoading(true);
    setMessage("");
    const finalEmail = email || `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`;
    const { error } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
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
    setMessage("");

    let avatar_url = profile?.avatar_url || null;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const fileName = `avatar-${session.user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, { upsert: true });
      if (uploadError) {
        setMessage(uploadError.message);
        setLoading(false);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      avatar_url = data.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio,
        location,
        avatar_url,
      })
      .eq("id", session.user.id);

    if (error) setMessage(error.message);
    else {
      setMessage("Profile updated!");
      ensureProfile(session.user);
      setAvatarFile(null);
      setView("profile");
    }
    setLoading(false);
  }

  // ========== FILE HANDLING ==========
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 10) return setMessage("Maximum 10 files");
    setFiles(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
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
    if (!session || files.length === 0) return setMessage("Select at least one file");

    setLoading(true);
    setMessage("");

    try {
      for (const file of files) {
        const mediaType = file.type.startsWith("video") ? "video" : "image";
        const mediaUrl = await uploadFile(file);

        if (isStory) {
          await supabase.from("stories").insert({
            user_id: session.user.id,
            media_url: mediaUrl,
            media_type: mediaType,
          });
        } else if (isPrivate) {
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

      setMessage(isStory ? "Added to Story!" : isPrivate ? "Private content uploaded!" : "Posted!");
      setFiles([]);
      setPreviews([]);
      setCaption("");
      setTitle("");
      setIsPrivate(false);
      setIsStory(false);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => {
        setView("feed");
        loadPosts();
        loadStories();
      }, 700);
    } catch (err: any) {
      setMessage(err.message || "Upload failed");
    }
    setLoading(false);
  }

  // ========== UI - AGE GATE ==========
  if (view === "age") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-pink-500 mb-2">Lagos Girls</h1>
          <p className="text-gray-400 mb-8">Premium adult experience for 18+</p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left text-sm text-gray-300 mb-6">
            This platform contains adult content. By entering you confirm you are at least 18 years old.
          </div>
          <button onClick={() => setView("auth")} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-4 rounded-xl text-lg">
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
      <div className="min-h-screen bg-black p-5 pb-20">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setView(session ? "profile" : "auth")} className="text-pink-500 mb-5 text-sm font-medium">← Back</button>
          <h1 className="text-2xl font-bold mb-1">Terms of Service</h1>
          <p className="text-xs text-gray-500 mb-6">Last updated: October 2026 • Lagos Girls Platform</p>

          <div className="text-[13px] text-gray-300 space-y-6 leading-relaxed">
            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">1. Acceptance of Terms</h2>
              <p>By accessing, browsing, registering for, or using the Lagos Girls platform (the “Service”), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service (“Terms”). If you do not agree to these Terms, you must not use the Service. These Terms constitute a legally binding agreement between you and the operators of Lagos Girls.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">2. Age Requirement and Eligibility</h2>
              <p>You must be at least eighteen (18) years of age to access or use Lagos Girls. By creating an account or using the platform, you represent and warrant that you are 18 years of age or older and have the legal capacity to enter into this agreement. We reserve the right to request proof of age at any time and to terminate any account that violates this requirement without notice or refund.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">3. Description of the Service</h2>
              <p>Lagos Girls is an adult-oriented digital entertainment platform that allows users to view content, interact with profiles, unlock private media, purchase digital services, and engage in messaging. The Service is intended solely for adult entertainment, fantasy, and digital content consumption.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">4. Nature of Content and Likenesses</h2>
              <p>All profiles, photographs, videos, stories, usernames, display names, biographies, and other materials on the platform are provided for entertainment purposes. Users acknowledge that content may include real or stylized likenesses of individuals. By using the Service you expressly agree that:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1.5">
                <li>You are purchasing access to digital content, private media, and fantasy interactions only.</li>
                <li>The platform does not operate as an escort agency, dating agency, or physical meeting service.</li>
                <li>Any reference to “services” (including but not limited to video calls, private chats, custom content, parties, or similar offerings) refers to digital or entertainment offerings unless independently arranged outside the platform in a manner permitted by applicable law.</li>
                <li>The operators of Lagos Girls do not control, verify, or guarantee the real-world identity, location, availability, or conduct of any person whose likeness appears on the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">5. No Guarantee of Real-World Interaction</h2>
              <p>Lagos Girls does not arrange, facilitate, promote, or guarantee any in-person meetings, physical encounters, or real-world sexual services. Any expectation of physical contact or offline meetings is solely the responsibility of the users involved and is outside the scope of the Service. The platform and its operators shall have no liability arising from any offline interaction between users.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">6. Account Registration</h2>
              <p>To access certain features you must create an account. You agree to provide accurate information and to keep your login credentials confidential. You are solely responsible for all activity that occurs under your account. We reserve the right to refuse registration or to terminate accounts at our sole discretion.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">7. Payments, Fees, and Refund Policy</h2>
              <p>Certain features of the Service require payment, including but not limited to Premium membership, unlocking private content, and purchasing listed services. All prices are displayed in Nigerian Naira (₦) unless otherwise stated.</p>
              <p className="mt-2">ALL PAYMENTS ARE FINAL AND NON-REFUNDABLE. Once a digital product is unlocked, a service is marked as delivered, or Premium access is activated, no refund will be provided except where mandatory under applicable consumer protection law. Initiating a chargeback or payment dispute without first contacting support may result in immediate and permanent account termination.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">8. Premium Membership</h2>
              <p>Premium membership grants access to additional features such as messaging. Premium status is personal to your account and may not be transferred. We reserve the right to modify Premium benefits or pricing with reasonable notice.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">9. User Conduct and Prohibited Activities</h2>
              <p>You agree that you will not:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1.5">
                <li>Upload, request, or share any content involving anyone under the age of 18.</li>
                <li>Engage in harassment, threats, blackmail, stalking, or non-consensual sharing of private information.</li>
                <li>Use the Service for any illegal purpose under Nigerian law or the laws of your jurisdiction.</li>
                <li>Attempt to reverse-engineer, scrape, crawl, or extract data from the platform.</li>
                <li>Impersonate any person or entity or misrepresent your affiliation.</li>
                <li>Interfere with or disrupt the integrity or performance of the Service.</li>
                <li>Circumvent any paywall, access control, or payment system.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">10. Content Ownership and License</h2>
              <p>By uploading any content to Lagos Girls, you grant the platform a non-exclusive, worldwide, royalty-free, transferable license to use, display, reproduce, distribute, and promote such content in connection with the Service and its marketing. You represent that you own or have the necessary rights to the content you upload.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">11. Intellectual Property</h2>
              <p>The Lagos Girls name, logo, design, and all related materials are the property of the platform operators. You may not use them without prior written permission.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">12. Third-Party Services</h2>
              <p>The Service may integrate with third-party payment processors, hosting providers, and other services. Your use of those services is subject to their respective terms. We are not responsible for the actions or policies of third parties.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">13. Disclaimer of Warranties</h2>
              <p>THE SERVICE IS PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">14. Limitation of Liability</h2>
              <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL LAGOS GIRLS, ITS OPERATORS, AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
              <p className="mt-2">OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ONE THOUSAND NAIRA (₦1,000), WHICHEVER IS GREATER.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">15. Indemnification</h2>
              <p>You agree to indemnify, defend, and hold harmless Lagos Girls and its operators from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or related to your use of the Service, your content, your violation of these Terms, or your violation of any rights of another person.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">16. Account Suspension and Termination</h2>
              <p>We may suspend or terminate your access to the Service at any time, with or without cause or notice, including for violation of these Terms, suspected fraud, chargebacks, or any conduct we deem harmful to the platform or other users. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination shall survive.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">17. Privacy</h2>
              <p>We collect information necessary to operate the Service, including account details, profile information, and usage data. We do not sell personal information to third parties for their marketing purposes. Payment data is processed by third-party payment providers under their own privacy policies.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">18. Modifications to the Service and Terms</h2>
              <p>We reserve the right to modify, suspend, or discontinue the Service (or any part of it) at any time. We may also update these Terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the revised Terms.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">19. Governing Law and Dispute Resolution</h2>
              <p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to conflict of law principles. Any dispute arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts located in Nigeria.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">20. Severability</h2>
              <p>If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">21. Entire Agreement</h2>
              <p>These Terms constitute the entire agreement between you and Lagos Girls regarding the Service and supersede all prior agreements and understandings.</p>
            </section>

            <section>
              <h2 className="font-bold text-white text-[14px] mb-1.5">22. Contact</h2>
              <p>For questions about these Terms, you may contact the platform through the available support channels within the application.</p>
            </section>

            <section className="pt-3 border-t border-zinc-800">
              <p className="text-gray-400 font-medium">By creating an account, checking the agreement box, logging in, or continuing to use Lagos Girls, you acknowledge that you have had the opportunity to read these Terms of Service in full and that you agree to be legally bound by them.</p>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ========== AUTH SCREEN ==========
  if (view === "auth" || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-pink-500 text-center mb-8">Lagos Girls</h1>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm opacity-80"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3"
            >
              <option value="GUY">I am a Guy</option>
              <option value="GIRL">I am a Girl</option>
            </select>

            <label className="flex items-start gap-3 text-sm text-gray-300">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              <span>
                I confirm I am 18+ and agree to the{" "}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setView("terms"); }}
                  className="text-pink-500 underline font-medium"
                >
                  Terms of Service
                </button>
              </span>
            </label>

            {message && <p className="text-center text-sm text-pink-400">{message}</p>}

            <button onClick={handleSignUp} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl">
              {loading ? "Creating..." : "Create Account"}
            </button>
            <button onClick={handleLogin} disabled={loading} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3.5 rounded-xl">
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }
    // ========== MAIN APP ==========
  return (
    <div className="min-h-screen bg-black pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-lg mx-auto px-4 h-[52px] flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-tight text-pink-500">Lagos Girls</h1>
          <div className="flex items-center gap-5 text-[13.5px] font-medium">
            <button
              onClick={() => setView("feed")}
              className={`transition-colors ${view === "feed" ? "text-pink-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              Feed
            </button>
            <button
              onClick={() => setView("create")}
              className={`transition-colors ${view === "create" ? "text-pink-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              Post
            </button>
            <button
              onClick={() => setView("messages")}
              className={`transition-colors ${view === "messages" || view === "chat" ? "text-pink-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              Messages
            </button>
            <button
              onClick={() => setView("profile")}
              className={`transition-colors ${view === "profile" || view === "saved" ? "text-pink-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              Me
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* ========== FEED ========== */}
        {view === "feed" && (
          <div>
            {/* Stories Row - Instagram style */}
            <div className="flex gap-3.5 overflow-x-auto px-3 py-3 border-b border-zinc-900/80 scrollbar-hide">
              <div
                className="flex flex-col items-center gap-1.5 min-w-[72px] cursor-pointer"
                onClick={() => { setIsStory(true); setView("create"); }}
              >
                <div className="relative">
                  <div className="w-[68px] h-[68px] rounded-full border-2 border-dashed border-pink-500/80 flex items-center justify-center bg-zinc-900">
                    <span className="text-2xl text-pink-500 font-light">+</span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">Your Story</span>
              </div>
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="flex flex-col items-center gap-1.5 min-w-[72px] cursor-pointer active:opacity-70"
                  onClick={() => setActiveStory(story)}
                >
                  <div className="w-[68px] h-[68px] rounded-full p-[2.5px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                    <div className="w-full h-full rounded-full bg-black p-[2px] overflow-hidden">
                      {story.profiles?.avatar_url ? (
                        <img src={story.profiles.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold">
                          {story.profiles?.username?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-300 truncate w-[68px] text-center font-medium">
                    {story.profiles?.username}
                  </span>
                </div>
              ))}
            </div>

            {/* Active Story Viewer - more controlled size */}
            {activeStory && (
              <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3">
                <div className="relative w-full max-w-md max-h-[85vh] bg-black rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-zinc-800">
                  {/* Progress */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800 z-20">
                    <div className="h-full bg-white/90 w-3/4" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between px-3.5 py-3 relative z-10 bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center gap-2.5" onClick={() => { setActiveStory(null); openUserProfile(activeStory.user_id); }}>
                      <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden ring-2 ring-pink-500/60">
                        {activeStory.profiles?.avatar_url ? (
                          <img src={activeStory.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                            {activeStory.profiles?.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-[13px]">{activeStory.profiles?.username}</span>
                        <p className="text-[10px] text-gray-400">
                          {new Date(activeStory.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveStory(null)}
                      className="w-8 h-8 flex items-center justify-center text-xl text-white/90 rounded-full bg-black/40"
                    >
                      ×
                    </button>
                  </div>

                  {/* Media - constrained */}
                  <div className="flex-1 flex items-center justify-center bg-zinc-950 min-h-[280px] max-h-[55vh]">
                    {activeStory.media_type === "video" ? (
                      <video
                        src={activeStory.media_url}
                        controls
                        autoPlay
                        playsInline
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <img
                        src={activeStory.media_url}
                        className="max-h-full max-w-full object-contain"
                        alt=""
                      />
                    )}
                  </div>

                  {/* Reply bar */}
                  <div className="p-3 flex gap-2.5 items-center border-t border-zinc-900 bg-black">
                    <input
                      type="text"
                      placeholder="Reply to story..."
                      value={storyComment}
                      onChange={(e) => setStoryComment(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-[13px] placeholder:text-gray-500 focus:outline-none focus:border-pink-500/40"
                    />
                    <button
                      onClick={() => {
                        if (storyComment.trim()) {
                          setMessage("Reply sent (coming soon)");
                          setStoryComment("");
                          setTimeout(() => setMessage(""), 2000);
                        }
                      }}
                      className="text-pink-500 font-semibold text-[13px] px-2"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {feedLoading && posts.length === 0 && (
              <div className="space-y-6 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-28 bg-zinc-800 rounded" />
                        <div className="h-2.5 w-16 bg-zinc-800/70 rounded" />
                      </div>
                    </div>
                    <div className="w-full aspect-[4/5] bg-zinc-900" />
                    <div className="px-4 pt-3 space-y-2">
                      <div className="h-4 w-24 bg-zinc-800 rounded" />
                      <div className="h-3 w-3/4 bg-zinc-800/60 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Posts */}
            {!feedLoading && posts.length === 0 ? (
              <div className="text-center py-24 px-6">
                <p className="text-gray-500 text-lg mb-1">No posts yet</p>
                <p className="text-gray-600 text-sm">Be the first to share something</p>
              </div>
            ) : (
              posts.map((post) => (
                <article key={post.id} className="border-b border-zinc-900/80 pb-4">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div
                      className="flex items-center gap-2.5 cursor-pointer active:opacity-70"
                      onClick={() => openUserProfile(post.user_id)}
                    >
                      <div className="w-[38px] h-[38px] rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-sm font-bold ring-1 ring-zinc-700">
                        {post.profiles?.avatar_url ? (
                          <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          post.profiles?.username?.[0]?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[13.5px] leading-tight">
                          {post.profiles?.display_name || post.profiles?.username}
                        </p>
                        <p className="text-[11px] text-gray-500 leading-tight">@{post.profiles?.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openUserProfile(post.user_id)}
                      className="text-[12px] text-pink-500 font-semibold px-2 py-1"
                    >
                      View
                    </button>
                  </div>

                  {/* Media - better fitting */}
                  <div className="relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {post.media_type === "video" ? (
                      <video
                        src={post.media_url}
                        controls
                        playsInline
                        className="w-full max-h-[70vh] object-contain bg-black"
                      />
                    ) : (
                      <img
                        src={post.media_url}
                        className="w-full max-h-[70vh] object-contain bg-black"
                        alt=""
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className="flex items-center gap-1.5 active:scale-90 transition-transform"
                      >
                        <span className="text-[26px] leading-none">{post.liked_by_me ? "❤️" : "🤍"}</span>
                        {(post.likes_count || 0) > 0 && (
                          <span className="text-[13px] font-semibold tabular-nums">{post.likes_count}</span>
                        )}
                      </button>
                      <button
                        onClick={() => openComments(post.id)}
                        className="text-[24px] leading-none active:scale-90 transition-transform"
                      >
                        💬
                      </button>
                    </div>
                    <button
                      onClick={() => toggleSave(post.id)}
                      className="text-[22px] leading-none active:scale-90 transition-transform"
                    >
                      {post.saved_by_me ? "🔖" : "📑"}
                    </button>
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <p className="px-3.5 mt-1 text-[13.5px] leading-snug">
                      <span className="font-semibold mr-1.5">{post.profiles?.username}</span>
                      <span className="text-gray-100">{post.caption}</span>
                    </p>
                  )}

                  {/* Comments */}
                  {showComments[post.id] && (
                    <div className="px-3.5 mt-3 space-y-2.5 pb-1">
                      {(comments[post.id] || []).map((c: any) => (
                        <div key={c.id} className="text-[13px] leading-snug">
                          <span className="font-semibold mr-1.5">{c.profiles?.username}</span>
                          <span className="text-gray-200">{c.content}</span>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2 items-center">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentText[post.id] || ""}
                          onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                          className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-full px-4 py-2 text-[13px] placeholder:text-gray-500 focus:outline-none focus:border-zinc-600"
                        />
                        <button
                          onClick={() => postComment(post.id)}
                          className="text-pink-500 text-[13px] font-semibold px-1 disabled:opacity-40"
                          disabled={!commentText[post.id]?.trim()}
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        )}

        {/* ========== CREATE ========== */}
        {view === "create" && (
          <div className="p-4 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold">{isStory ? "Add to Story" : "Create Post"}</h2>
              {!isStory && (
                <button
                  onClick={() => { setIsStory(true); setIsPrivate(false); }}
                  className="text-[12px] text-pink-500 font-medium"
                >
                  Switch to Story
                </button>
              )}
              {isStory && (
                <button
                  onClick={() => setIsStory(false)}
                  className="text-[12px] text-pink-500 font-medium"
                >
                  Switch to Post
                </button>
              )}
            </div>

            {!isStory && (
              <div className="flex p-1 bg-zinc-900 rounded-xl">
                <button
                  onClick={() => { setIsPrivate(false); setIsStory(false); }}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition ${!isPrivate ? "bg-pink-600 text-white" : "text-gray-400"}`}
                >
                  Public
                </button>
                <button
                  onClick={() => { setIsPrivate(true); setIsStory(false); }}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition ${isPrivate ? "bg-pink-600 text-white" : "text-gray-400"}`}
                >
                  Private ₦
                </button>
              </div>
            )}

            {isPrivate && !isStory && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Title for private content"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[14px] placeholder:text-gray-500"
                />
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">₦</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-[14px]"
                  />
                </div>
              </div>
            )}

            {!isPrivate && !isStory && (
              <textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 resize-none text-[14px] placeholder:text-gray-500"
              />
            )}

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                    <img src={src} className="w-full h-full object-cover" alt="" />
                  </div>
                ))}
              </div>
            )}

            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-zinc-700 rounded-2xl py-10 text-center cursor-pointer active:bg-zinc-900/50 transition"
            >
              <p className="text-[28px] mb-2">📷</p>
              <p className="text-gray-400 text-[14px]">
                {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : "Tap to select Photo / Video"}
              </p>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
            </div>

            {message && <p className="text-center text-[13px] text-pink-400">{message}</p>}

            <button
              onClick={handleCreatePost}
              disabled={loading || files.length === 0}
              className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-[15px] transition"
            >
              {loading
                ? "Uploading..."
                : isStory
                ? "Share to Story"
                : isPrivate
                ? `Upload Private • ₦${price.toLocaleString()}`
                : "Share Post"}
            </button>
          </div>
        )}

        {/* ========== MESSAGES ========== */}
        {view === "messages" && (
          <div className="p-4">
            <h2 className="text-[18px] font-bold mb-4">Messages</h2>
            {!profile?.is_premium && (
              <div className="bg-zinc-900/80 border border-pink-500/20 rounded-2xl p-6 mb-6 text-center">
                <p className="text-[15px] mb-1 font-medium">Premium only</p>
                <p className="text-[13px] text-gray-400 mb-4">Unlock messaging to chat with girls</p>
                <button
                  onClick={becomePremium}
                  className="bg-pink-600 hover:bg-pink-500 px-6 py-2.5 rounded-xl font-semibold text-[14px]"
                >
                  Become Premium — ₦5,000
                </button>
              </div>
            )}
            {conversations.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-[15px]">No conversations yet</p>
                <p className="text-gray-600 text-[13px] mt-1">Start chatting from someone’s profile</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const other = conv.guy_id === session.user.id ? conv.girl : conv.guy;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setCurrentChat(conv);
                        loadChatMessages(conv.id);
                        setView("chat");
                      }}
                      className="flex items-center gap-3 p-3 bg-zinc-900/60 rounded-xl cursor-pointer active:bg-zinc-800 transition"
                    >
                      <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center font-bold shrink-0">
                        {other?.avatar_url ? (
                          <img src={other.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          other?.username?.[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[14px] truncate">{other?.display_name || other?.username}</p>
                        <p className="text-[12px] text-gray-500 truncate">@{other?.username}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== CHAT ========== */}
        {view === "chat" && currentChat && (
          <div className="flex flex-col h-[calc(100vh-3.5rem)]">
            <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
              <button onClick={() => setView("messages")} className="text-pink-500">←</button>
              <span className="font-medium">Chat</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === session.user.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${msg.sender_id === session.user.id ? "bg-pink-600" : "bg-zinc-800"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-zinc-800 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2.5 text-sm"
              />
              <button onClick={sendMessage} className="bg-pink-600 px-5 py-2.5 rounded-full text-sm font-medium">Send</button>
            </div>
          </div>
        )}

        {/* ========== PROFILE ========== */}
        {view === "profile" && profile && (
          <div className="pb-8">
            {/* Profile Header */}
            <div className="px-4 pt-5 pb-4">
              <div className="flex items-start gap-4">
                <div className="w-[86px] h-[86px] rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-3xl font-bold ring-2 ring-zinc-700 shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    profile.username[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h2 className="text-[20px] font-bold leading-tight truncate">
                    {profile.display_name || profile.username}
                  </h2>
                  <p className="text-[13px] text-gray-400 mt-0.5">@{profile.username}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] font-medium text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded-full">
                      {profile.role}
                    </span>
                    {profile.is_premium && (
                      <span className="text-[11px] font-medium text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                        Premium
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {profile.bio && (
                <p className="text-[13.5px] text-gray-200 mt-4 leading-relaxed">{profile.bio}</p>
              )}
              {profile.location && (
                <p className="text-[12.5px] text-gray-500 mt-1.5 flex items-center gap-1">
                  <span>📍</span> {profile.location}
                </p>
              )}

              {/* Stats */}
              <div className="flex gap-6 mt-4 pt-1">
                <div>
                  <p className="text-[16px] font-bold">{myPosts.length}</p>
                  <p className="text-[11px] text-gray-500">Posts</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 space-y-2.5">
              {!profile.is_premium && (
                <button
                  onClick={becomePremium}
                  className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 py-3 rounded-xl font-semibold text-[14px]"
                >
                  Become Premium — ₦5,000
                </button>
              )}
              <div className="flex gap-2.5">
                <button
                  onClick={() => setView("edit")}
                  className="flex-1 bg-zinc-900 border border-zinc-800 py-2.5 rounded-xl text-[13px] font-medium"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setView("saved")}
                  className="flex-1 bg-zinc-900 border border-zinc-800 py-2.5 rounded-xl text-[13px] font-medium"
                >
                  Saved
                </button>
              </div>
            </div>

            {/* My Posts Grid */}
            <div className="mt-6 border-t border-zinc-900">
              <div className="px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-[14px]">My Posts</h3>
                <span className="text-[12px] text-gray-500">{myPosts.length} posts</span>
              </div>
              {myPosts.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <p className="text-gray-500 text-[15px]">No posts yet</p>
                  <p className="text-gray-600 text-[13px] mt-1">Share your first post</p>
                  <button
                    onClick={() => setView("create")}
                    className="mt-4 text-pink-500 text-[13px] font-medium"
                  >
                    Create Post
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-[2px]">
                  {myPosts.map((p) => (
                    <div key={p.id} className="relative aspect-square bg-zinc-900 overflow-hidden group">
                      <img src={p.media_url} className="w-full h-full object-cover" alt="" />
                      <button
                        onClick={() => deleteMyPost(p.id)}
                        className="absolute top-1.5 right-1.5 bg-black/70 text-[11px] w-6 h-6 flex items-center justify-center rounded-full text-red-400 opacity-80"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 mt-8">
              <button
                onClick={handleLogout}
                className="w-full bg-zinc-900/80 border border-zinc-800 py-3 rounded-xl text-red-400 text-[14px] font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        )}
        {/* ========== OTHER VIEWS (Edit, Saved, User Profile) ========== */}
        {view === "edit" && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold">Edit Profile</h2>
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-3xl">
                {avatarFile ? (
                  <img src={URL.createObjectURL(avatarFile)} className="w-full h-full object-cover" alt="" />
                ) : profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  profile?.username[0].toUpperCase()
                )}
              </div>
              <button onClick={() => avatarRef.current?.click()} className="text-pink-500 text-sm">Change Photo</button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
            </div>
            <input type="text" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3" />
            <textarea placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 resize-none" />
            <input type="text" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3" />
            {message && <p className="text-sm text-pink-400">{message}</p>}
            <button onClick={updateProfile} disabled={loading} className="w-full bg-pink-600 py-3.5 rounded-xl font-semibold">{loading ? "Saving..." : "Save"}</button>
            <button onClick={() => setView("profile")} className="w-full bg-zinc-900 py-3 rounded-xl">Cancel</button>
          </div>
        )}

        {view === "saved" && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Saved</h2>
              <button onClick={() => setView("profile")} className="text-pink-500 text-sm">Back</button>
            </div>
            {savedPosts.length === 0 ? (
              <p className="text-center text-gray-500 py-16">No saved posts</p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {savedPosts.map((p: any) => (
                  <div key={p.id} className="aspect-square bg-zinc-900 overflow-hidden">
                    <img src={p.media_url} className="w-full h-full object-cover" alt="" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "user" && selectedUser && (
          <div className="pb-10">
            <div className="px-4 pt-3">
              <button onClick={() => setView("feed")} className="text-[13px] text-gray-400 mb-4 font-medium">← Back</button>

              <div className="flex items-start gap-4">
                <div className="w-[86px] h-[86px] rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-3xl font-bold ring-2 ring-zinc-700 shrink-0">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    selectedUser.username[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h2 className="text-[20px] font-bold leading-tight truncate">
                    {selectedUser.display_name || selectedUser.username}
                  </h2>
                  <p className="text-[13px] text-gray-400 mt-0.5">@{selectedUser.username}</p>
                  <span className="inline-block text-[11px] font-medium text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded-full mt-1.5">
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              {selectedUser.bio && (
                <p className="text-[13.5px] text-gray-200 mt-4 leading-relaxed">{selectedUser.bio}</p>
              )}
              {selectedUser.location && (
                <p className="text-[12.5px] text-gray-500 mt-1.5">📍 {selectedUser.location}</p>
              )}

              {profile?.is_premium && selectedUser.role === "GIRL" && (
                <button
                  onClick={() => startChat(selectedUser.id)}
                  className="w-full bg-pink-600 hover:bg-pink-500 py-3 rounded-xl font-semibold mt-4 text-[14px]"
                >
                  Message
                </button>
              )}
            </div>

            {/* Services */}
            {(() => {
              let services: { name: string; price: number; desc?: string }[] = [];
              try {
                const raw = (selectedUser as any).services;
                if (raw) {
                  services = typeof raw === "string" ? JSON.parse(raw) : raw;
                }
              } catch {}
              if (!services.length) return null;
              return (
                <div className="mt-6 border-t border-zinc-900">
                  <div className="px-4 py-3">
                    <h3 className="font-semibold text-[14px]">Services</h3>
                  </div>
                  <div className="px-4 space-y-2 pb-2">
                    {services.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-[14px]">{s.name}</p>
                          {s.desc && <p className="text-[12px] text-gray-500 mt-0.5">{s.desc}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-pink-400 font-bold text-[14px]">₦{Number(s.price).toLocaleString()}</p>
                          <button className="text-[11px] text-pink-500 font-medium mt-0.5">Request</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Public Posts */}
            <div className="mt-4 border-t border-zinc-900">
              <div className="px-4 py-3">
                <h3 className="font-semibold text-[14px]">Posts</h3>
              </div>
              {userPosts.length === 0 ? (
                <p className="text-center text-gray-500 text-[13px] py-10">No public posts</p>
              ) : (
                <div className="grid grid-cols-3 gap-[2px]">
                  {userPosts.map((p) => (
                    <div key={p.id} className="aspect-square bg-zinc-900 overflow-hidden">
                      <img src={p.media_url} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Private Content */}
            {userPrivate.length > 0 && (
              <div className="mt-4 border-t border-zinc-900">
                <div className="px-4 py-3">
                  <h3 className="font-semibold text-[14px] text-pink-500">Private Content 🔒</h3>
                </div>
                <div className="px-4 grid grid-cols-2 gap-3 pb-4">
                  {userPrivate.map((m) => (
                    <div key={m.id} className="relative rounded-xl overflow-hidden bg-zinc-900">
                      <img src={m.media_url} className="w-full aspect-[3/4] object-cover locked" alt="" />
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2">
                        <p className="font-medium text-[13px] mb-1 text-center">{m.title}</p>
                        <p className="text-pink-400 font-bold text-[14px]">₦{m.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

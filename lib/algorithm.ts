/**
 * Lagos Girls recommendation engine — Phase 1
 * Home feed + Reels: creator rotation, no-repeat cycles, cooldowns.
 */

export type FeedType = "home" | "reels";

export interface FeedCandidate {
  postId: string;
  creatorId: string;
  publishedAt: number;
  score: number;
  post: any;
}

export interface FeedState {
  cycleId: string;
  seenPostIds: string[];
  recentCreatorIds: string[];
  cycleStartedAt: number;
}

const STORAGE_PREFIX = "lagos_feed_state_";

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function newCycleId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadFeedState(feedType: FeedType, userKey: string): FeedState {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + feedType + "_" + userKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.cycleId && Array.isArray(parsed.seenPostIds)) {
        return {
          cycleId: parsed.cycleId,
          seenPostIds: parsed.seenPostIds.slice(-2000),
          recentCreatorIds: (parsed.recentCreatorIds || []).slice(-100),
          cycleStartedAt: parsed.cycleStartedAt || Date.now(),
        };
      }
    }
  } catch {}
  return {
    cycleId: newCycleId(),
    seenPostIds: [],
    recentCreatorIds: [],
    cycleStartedAt: Date.now(),
  };
}

export function saveFeedState(
  feedType: FeedType,
  userKey: string,
  state: FeedState
) {
  try {
    localStorage.setItem(
      STORAGE_PREFIX + feedType + "_" + userKey,
      JSON.stringify({
        ...state,
        seenPostIds: state.seenPostIds.slice(-2000),
        recentCreatorIds: state.recentCreatorIds.slice(-100),
      })
    );
  } catch {}
}

export function scorePost(
  post: any,
  opts?: {
    followingIds?: Set<string>;
  }
): number {
  const likes = Number(post.likes_count) || 0;
  const comments = Number(post.comments_count) || 0;
  const ageMs = Date.now() - new Date(post.created_at || 0).getTime();
  const ageHours = Math.max(0, ageMs / (1000 * 60 * 60));
  const freshness = Math.max(0, 72 - ageHours) / 72;

  let score =
    likes * 2 +
    comments * 3 +
    freshness * 12 +
    (Number(post.likes_boost) || 0) * 0.5;

  const creatorId = String(post.user_id || "");
  if (opts?.followingIds?.has(creatorId)) {
    score += 8;
  }

  const idHash = String(post.id || "")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  score += (idHash % 7) * 0.01;

  return score;
}

function toCandidates(
  posts: any[],
  opts?: { followingIds?: Set<string> }
): FeedCandidate[] {
  return (posts || []).map((post) => ({
    postId: String(post.id),
    creatorId: String(post.user_id || post.profiles?.id || "unknown"),
    publishedAt: new Date(post.created_at || 0).getTime(),
    score: scorePost(post, opts),
    post,
  }));
}

export function buildFeedBatch(
  posts: any[],
  state: FeedState,
  feedType: FeedType,
  batchSize: number,
  opts?: { followingIds?: string[] }
): { ordered: any[]; state: FeedState } {
  const followingIds = new Set(opts?.followingIds || []);
  const candidates = toCandidates(posts, { followingIds });
  let working: FeedState = {
    ...state,
    seenPostIds: [...state.seenPostIds],
    recentCreatorIds: [...state.recentCreatorIds],
  };

  const seen = new Set(working.seenPostIds);
  let unseen = candidates.filter((c) => !seen.has(c.postId));

  if (unseen.length === 0 && candidates.length > 0) {
    working = {
      cycleId: newCycleId(),
      seenPostIds: [],
      recentCreatorIds: [],
      cycleStartedAt: Date.now(),
    };
    unseen = candidates;
  }

  const uniqueCreators = new Set(unseen.map((c) => c.creatorId)).size;
  let cooldown =
    feedType === "reels"
      ? uniqueCreators >= 12
        ? 10
        : uniqueCreators >= 6
          ? 4
          : 1
      : uniqueCreators >= 8
        ? 1
        : 0;

  const ranked = [...unseen].sort((a, b) => b.score - a.score);
  const batch: FeedCandidate[] = [];
  const creatorsInBatch = new Set<string>();

  const tryPick = (list: FeedCandidate[], strictCooldown: boolean) => {
    for (const post of list) {
      if (batch.length >= batchSize) break;
      if (creatorsInBatch.has(post.creatorId)) continue;
      if (strictCooldown && cooldown > 0) {
        const recent = working.recentCreatorIds.slice(-cooldown);
        if (recent.includes(post.creatorId)) continue;
      }
      batch.push(post);
      creatorsInBatch.add(post.creatorId);
      working.seenPostIds.push(post.postId);
      working.recentCreatorIds.push(post.creatorId);
    }
  };

  tryPick(ranked, true);
  if (batch.length < batchSize) {
    tryPick(
      ranked.filter((c) => !batch.some((b) => b.postId === c.postId)),
      false
    );
  }
  if (batch.length < batchSize) {
    for (const post of ranked) {
      if (batch.length >= batchSize) break;
      if (batch.some((b) => b.postId === post.postId)) continue;
      batch.push(post);
      working.seenPostIds.push(post.postId);
      working.recentCreatorIds.push(post.creatorId);
    }
  }

  return {
    ordered: batch.map((c) => c.post),
    state: working,
  };
}

export function orderFullFeed(
  posts: any[],
  feedType: FeedType,
  userKey: string,
  opts?: { followingIds?: string[] }
): any[] {
  if (!posts?.length) return [];

  let state = loadFeedState(feedType, userKey);
  const allIds = new Set(posts.map((p) => String(p.id)));
  state.seenPostIds = state.seenPostIds.filter((id) => allIds.has(id));

  const unseenCount = posts.filter(
    (p) => !state.seenPostIds.includes(String(p.id))
  ).length;
  if (unseenCount === 0) {
    state = {
      cycleId: newCycleId(),
      seenPostIds: [],
      recentCreatorIds: [],
      cycleStartedAt: Date.now(),
    };
  }

  const result: any[] = [];
  let guard = 0;
  const target = posts.length;

  while (result.length < target && guard < target + 5) {
    const { ordered, state: next } = buildFeedBatch(
      posts,
      state,
      feedType,
      Math.min(40, target - result.length + 5),
      opts
    );
    state = next;
    for (const p of ordered) {
      if (!result.some((r) => r.id === p.id)) result.push(p);
    }
    if (ordered.length === 0) {
      state = {
        cycleId: newCycleId(),
        seenPostIds: [],
        recentCreatorIds: [],
        cycleStartedAt: Date.now(),
      };
      const retry = buildFeedBatch(posts, state, feedType, target, opts);
      state = retry.state;
      for (const p of retry.ordered) {
        if (!result.some((r) => r.id === p.id)) result.push(p);
      }
      break;
    }
    guard++;
  }

  saveFeedState(feedType, userKey, state);
  return result;
}

export function diversifyByAccount(posts: any[]): any[] {
  return orderFullFeed(posts, "home", "anon");
}

export function smartFeedSort(posts: any[]) {
  return orderFullFeed(posts, "home", "anon");
}

/**
 * Mix leaks into the home feed so they don't dominate.
 * Default: up to 1 leak after every `everyN` normal posts (default 3).
 */
export function mixLeaksIntoFeed(posts: any[], everyN = 3): any[] {
  if (!posts?.length) return [];

  const isLeak = (p: any) => {
    if (!p) return false;
    if (String(p.caption || "").includes("__leak__")) return true;
    try {
      const j =
        typeof p.media_url === "string" ? JSON.parse(p.media_url) : p.media_url;
      if (j && j.leak) return true;
    } catch {}
    return false;
  };

  const normals = posts.filter((p) => !isLeak(p));
  const leaks = posts.filter((p) => isLeak(p));

  if (!leaks.length) return normals;
  if (!normals.length) return leaks.slice(0, 3); // never dump only leaks

  const out: any[] = [];
  let li = 0;
  for (let i = 0; i < normals.length; i++) {
    out.push(normals[i]);
    // After everyN normal posts, insert one leak if available
    if ((i + 1) % everyN === 0 && li < leaks.length) {
      out.push(leaks[li++]);
    }
  }
  // Leftover leaks: sprinkle one every everyN at end, max a few
  let extra = 0;
  while (li < leaks.length && extra < 5) {
    out.push(leaks[li++]);
    extra++;
  }
  return out;
}

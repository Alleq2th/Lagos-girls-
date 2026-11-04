/**
 * Lagos Girls recommendation engine — Phase 1
 * Home feed + Reels: creator rotation, no-repeat cycles, cooldowns.
 * Designed so Phase 2+ (interests, Redis) can plug in without rewrite.
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

/** Score a post for ranking within rotation (Phase 1 heuristics). */
export function scorePost(
  post: any,
  opts?: {
    followingIds?: Set<string>;
    likedBoost?: boolean;
  }
): number {
  const likes = Number(post.likes_count) || 0;
  const comments = Number(post.comments_count) || 0;
  const ageMs = Date.now() - new Date(post.created_at || 0).getTime();
  const ageHours = Math.max(0, ageMs / (1000 * 60 * 60));
  const freshness = Math.max(0, 72 - ageHours) / 72; // 0–1, decays over 3 days

  let score =
    likes * 2 +
    comments * 3 +
    freshness * 12 +
    (Number(post.likes_boost) || 0) * 0.5;

  const creatorId = String(post.user_id || "");
  if (opts?.followingIds?.has(creatorId)) {
    score += 8; // hybrid: followed get a boost, not a monopoly
  }

  // Tiny stable jitter so equal scores don't stick in id order forever
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

/**
 * Build ordered feed with:
 * - No post twice in the same cycle
 * - Creator rotation (one creator per "slot" until pool allows)
 * - Creator cooldown (stronger on reels)
 * - New cycle when unseen content is exhausted (reshuffled order)
 */
export function buildFeedBatch(
  posts: any[],
  state: FeedState,
  feedType: FeedType,
  batchSize: number,
  opts?: { followingIds?: string[] }
): { ordered: any[]; state: FeedState } {
  const followingIds = new Set(opts?.followingIds || []);
  let candidates = toCandidates(posts, { followingIds });
  let working: FeedState = {
    ...state,
    seenPostIds: [...state.seenPostIds],
    recentCreatorIds: [...state.recentCreatorIds],
  };

  const seen = new Set(working.seenPostIds);
  let unseen = candidates.filter((c) => !seen.has(c.postId));

  // Start a new cycle if everything was already shown
  if (unseen.length === 0 && candidates.length > 0) {
    working = {
      cycleId: newCycleId(),
      seenPostIds: [],
      recentCreatorIds: [],
      cycleStartedAt: Date.now(),
    };
    unseen = candidates;
  }

  // Adaptive cooldown: reels prefer more space between same creator
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

  // Rank unseen by score
  const ranked = [...unseen].sort((a, b) => b.score - a.score);

  const batch: FeedCandidate[] = [];
  const creatorsInBatch = new Set<string>();

  // Round-robin pass: prefer creators not yet in this batch / recent window
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

  // Fallback: relax cooldown if batch still short (small catalog)
  if (batch.length < batchSize) {
    tryPick(
      ranked.filter((c) => !batch.some((b) => b.postId === c.postId)),
      false
    );
  }

  // Still short: fill with remaining unseen ignoring creator uniqueness in batch
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

/**
 * Full ordered list for current cycle (client-side Phase 1).
 * Call when posts load; persist returned state.
 */
export function orderFullFeed(
  posts: any[],
  feedType: FeedType,
  userKey: string,
  opts?: { followingIds?: string[] }
): any[] {
  if (!posts?.length) return [];

  let state = loadFeedState(feedType, userKey);
  const allIds = new Set(posts.map((p) => String(p.id)));

  // Drop seen ids that no longer exist
  state.seenPostIds = state.seenPostIds.filter((id) => allIds.has(id));

  // If almost everything seen, start fresh cycle
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
    // Prevent infinite loop if batch empty
    if (ordered.length === 0) {
      // force new cycle
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

/** @deprecated use orderFullFeed — kept for imports */
export function diversifyByAccount(posts: any[]): any[] {
  return orderFullFeed(posts, "home", "anon");
}

/** @deprecated use orderFullFeed */
export function smartFeedSort(posts: any[]) {
  return orderFullFeed(posts, "home", "anon");
                                  }
    

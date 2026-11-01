export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Round-robin by account so the same girl does not appear back-to-back.
 * Round 1: one post from every user (highest engagement first within user).
 * Round 2: second posts, etc.
 * Within each round, users are shuffled once (stable until full reload).
 */
export function diversifyByAccount(posts: any[]): any[] {
  if (!posts?.length) return [];

  const byUser = new Map<string, any[]>();
  for (const p of posts) {
    const uid = String(p.user_id || p.profiles?.id || "unknown");
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(p);
  }

  // Sort each user's posts: engagement then newer
  for (const [, list] of byUser) {
    list.sort((a, b) => {
      const sa =
        (a.likes_count || 0) * 2 +
        (a.comments_count || 0) * 3 +
        new Date(a.created_at || 0).getTime() / 1e13;
      const sb =
        (b.likes_count || 0) * 2 +
        (b.comments_count || 0) * 3 +
        new Date(b.created_at || 0).getTime() / 1e13;
      return sb - sa;
    });
  }

  const userIds = shuffleArray([...byUser.keys()]);
  const result: any[] = [];
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    // Rotate start index each round so order is not identical every cycle
    const rotated = [
      ...userIds.slice(round % userIds.length),
      ...userIds.slice(0, round % userIds.length),
    ];
    for (const uid of rotated) {
      const list = byUser.get(uid)!;
      if (round < list.length) {
        result.push(list[round]);
        added = true;
      }
    }
    round++;
    if (round > 200) break; // safety
  }
  return result;
}

/**
 * Score then diversify — stable for a given load (no reshuffle on scroll).
 */
export function smartFeedSort(posts: any[]) {
  return diversifyByAccount(posts || []);
}

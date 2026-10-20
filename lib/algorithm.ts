export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Stable feed sort — runs once when posts are loaded.
 * Does NOT use Math.random on every call, so scrolling never reshuffles.
 * Score = engagement + recency. Order stays fixed until next full load.
 */
export function smartFeedSort(posts: any[]) {
  const scored = posts.map((p) => {
    const likes = p.likes_count || 0;
    const comments = p.comments_count || 0;
    const ageHours = Math.max(
      0,
      (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60)
    );
    // Newer posts get a gentle boost; likes/comments matter more
    const recency = Math.max(0, 48 - ageHours) / 48;
    const score = likes * 2 + comments * 3 + recency * 5;
    return { post: p, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break by id so order is 100% stable
    return String(a.post.id).localeCompare(String(b.post.id));
  });

  return scored.map((s) => s.post);
}

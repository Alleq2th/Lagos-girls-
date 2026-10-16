export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function smartFeedSort(posts: any[]) {
  // Simple algorithm: shuffle + put posts with more likes a bit higher
  const shuffled = shuffleArray(posts);
  
  return shuffled.sort((a, b) => {
    const scoreA = (a.likes_count || 0) * 0.3 + Math.random();
    const scoreB = (b.likes_count || 0) * 0.3 + Math.random();
    return scoreB - scoreA;
  });
}

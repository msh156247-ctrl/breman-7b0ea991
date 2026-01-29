// Random avatar generation utilities using DiceBear API

const AVATAR_STYLES = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'notionists', 'thumbs'] as const;

/**
 * Generate a random avatar URL using DiceBear API
 * @param seed - Unique identifier (user id, team id, etc.)
 * @param type - 'user' or 'team' for different styles
 */
export function generateRandomAvatar(seed: string, type: 'user' | 'team' = 'user'): string {
  // Use different styles for users vs teams
  const style = type === 'team' ? 'shapes' : 'adventurer-neutral';
  
  // Add timestamp to ensure uniqueness based on seed
  const uniqueSeed = `${seed}-${seed.slice(0, 8)}`;
  
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(uniqueSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Get avatar URL with fallback to random avatar
 * @param avatarUrl - Current avatar URL (might be null/undefined)
 * @param seed - Unique identifier for generating random avatar
 * @param type - 'user' or 'team'
 */
export function getAvatarWithFallback(
  avatarUrl: string | null | undefined,
  seed: string,
  type: 'user' | 'team' = 'user'
): string {
  // If avatarUrl exists and is a valid URL (not just emoji), use it
  if (avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:'))) {
    return avatarUrl;
  }
  
  // Generate random avatar
  return generateRandomAvatar(seed, type);
}

/**
 * Check if a string is an emoji (for team emblems)
 */
export function isEmoji(str: string): boolean {
  if (!str) return false;
  // Simple check: emojis are usually 1-4 characters when including modifiers
  return str.length <= 4 && !/^https?:\/\//.test(str) && !/^data:/.test(str);
}

/**
 * Get team emblem (image URL, emoji, or random avatar)
 */
export function getTeamEmblem(
  emblemUrl: string | null | undefined,
  teamId: string
): { type: 'image' | 'emoji' | 'random'; value: string } {
  if (!emblemUrl) {
    return { type: 'random', value: generateRandomAvatar(teamId, 'team') };
  }
  
  if (isEmoji(emblemUrl)) {
    return { type: 'emoji', value: emblemUrl };
  }
  
  if (emblemUrl.startsWith('http') || emblemUrl.startsWith('data:')) {
    return { type: 'image', value: emblemUrl };
  }
  
  return { type: 'random', value: generateRandomAvatar(teamId, 'team') };
}

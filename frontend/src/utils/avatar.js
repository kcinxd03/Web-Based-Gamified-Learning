/**
 * Default avatar filename (without .png) by gender.
 * Male → Eliza, Female → Oliver. Other/missing → Eliza.
 */
export function getDefaultAvatarByGender(gender) {
  if (!gender || typeof gender !== 'string') return 'eliza';
  const g = gender.trim().toLowerCase();
  if (g === 'female') return 'oliver';
  if (g === 'male') return 'eliza';
  return 'eliza';
}

/** Background color per avatar (avatar name key, lowercased) */
export const AVATAR_BG_COLORS = {
  oliver: '#fef08a',
  eliza: '#90EE90',
  ryan: '#e9d5ff',
  mason: '#ddd6fe',
  kimberly: '#86efac',
  adrian: '#fed7aa',
  riley: '#fbcfe8',
  avery: '#bae6fd',
  ryker: '#93c5fd',
  jack: '#cbd5e1',
  andrea: '#ddd6fe',
  jessica: '#d6d3d1',
  leah: '#fed7aa',
  liliana: '#fbcfe8',
  eden: '#e9d5ff',
  vivian: '#93c5fd',
  jameson: '#bae6fd',
  maria: '#d6d3d1',
  valentina: '#e9d5ff',
  emery: '#86efac'
};

/**
 * Get the image src for an avatar.
 * profilePicture can be: a preset name (e.g. 'oliver', 'eliza'), a custom image URL (http/https), or a data URL (data:image/...).
 */
export function getAvatarSrc(profilePicture, gender) {
  if (profilePicture && typeof profilePicture === 'string') {
    const v = profilePicture.trim();
    if (v.startsWith('data:') || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) {
      return v;
    }
    const name = v.toLowerCase().replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
    return `/Avatars/${name}.png`;
  }
  const defaultName = getDefaultAvatarByGender(gender);
  return `/Avatars/${defaultName}.png`;
}

/**
 * Whether the profile picture is a custom image (URL or data URL) rather than a preset name.
 */
export function isCustomAvatar(profilePicture) {
  if (!profilePicture || typeof profilePicture !== 'string') return false;
  const v = profilePicture.trim();
  return v.startsWith('data:') || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/');
}

/**
 * Get background color for an avatar by name (profilePicture value).
 * Returns default for custom images (data URLs / URLs).
 */
export function getAvatarBgColor(avatarName) {
  if (!avatarName || typeof avatarName !== 'string') return '#90EE90';
  if (isCustomAvatar(avatarName)) return '#90EE90';
  return AVATAR_BG_COLORS[avatarName.trim().toLowerCase()] ?? '#90EE90';
}

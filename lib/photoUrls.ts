// Models often drop the "photo-" prefix of Unsplash image URLs (the photo library lists bare ids),
// which gives a broken image: images.unsplash.com/1438761681033-6461ffad8d80. That slip has exactly
// one correct repair, so it is fixed in code instead of spending an AI pass on it.

const MISSING_PREFIX = /images\.unsplash\.com\/(?=\d{10,13}-[0-9a-f]{12}\b)/g;

export const fixPhotoUrl = (code: string): string => code.replace(MISSING_PREFIX, "images.unsplash.com/photo-");

/** The same project with every such URL repaired (unchanged files keep their identity). */
export function fixPhotoUrls(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(files).map(([path, code]) => [path, fixPhotoUrl(code)]));
}

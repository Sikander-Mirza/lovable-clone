export const MAX_IMAGES = 4;

/** Downscale to at most `max` px on the long side and re-encode as JPEG, so images stay small to store and send. */
export async function fileToDataUrl(file: File, max = 1280): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // flatten transparency
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Taller than this (height / width) and an attached screenshot is cut into slices. */
export const TALL_RATIO = 2;
/** Each slice is about this tall compared with its width (a bit taller than a laptop screen). */
export const SLICE_RATIO = 1.25;
/** Hidden hint sent with the request when a long screenshot was cut up. */
export const SLICE_NOTE =
  "Note: some of the attached images are consecutive vertical slices of one long screenshot (neighbouring slices overlap a little). Read them top to bottom as ONE page.";

/**
 * How to cut an image of this size. A full-page screenshot is far taller than wide; shrunk into one image
 * (long side at most 1280px) its text and buttons become unreadable for the model, so tall images are
 * cut into 2 to `maxParts` slices that overlap by 4% so nothing is lost at the cuts.
 */
export function planSlices(w: number, h: number, maxParts: number): { y: number; h: number }[] {
  if (w <= 0 || h / w <= TALL_RATIO || maxParts < 2) return [{ y: 0, h }];
  const parts = Math.min(maxParts, Math.max(2, Math.ceil(h / (w * SLICE_RATIO))));
  const base = Math.ceil(h / parts);
  const overlap = Math.round(base * 0.04);
  return Array.from({ length: parts }, (_, i) => {
    const y = i === 0 ? 0 : i * base - overlap;
    return { y, h: Math.min(h, (i + 1) * base) - y };
  });
}

/** Like fileToDataUrl, but a tall screenshot becomes several slices (at most `room` images). */
export async function fileToDataUrls(file: File, room: number, max = 1280): Promise<{ urls: string[]; sliced: boolean }> {
  const bmp = await createImageBitmap(file);
  try {
    const slices = planSlices(bmp.width, bmp.height, room);
    const urls = slices.map((s) => {
      const scale = Math.min(1, max / Math.max(bmp.width, s.h));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(s.h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bmp, 0, s.y, bmp.width, s.h, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", 0.82);
    });
    return { urls, sliced: slices.length > 1 };
  } finally {
    bmp.close();
  }
}

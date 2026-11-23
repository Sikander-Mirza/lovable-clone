// Visual self-review: the builder screenshots the running preview (desktop and phone) and asks
// the model to look at it like a designer and fix real visual defects.

/** Largest page height captured (pixels); very long pages are cut off here. */
export const REVIEW_MAX_HEIGHT = 3200;
/** Output width of a review screenshot (pixels). Narrower previews are not scaled up. */
export const REVIEW_WIDTH = 900;

/** Pixel ratio that keeps a screenshot at most REVIEW_WIDTH wide. */
export const reviewPixelRatio = (viewportWidth: number) => Math.min(1, REVIEW_WIDTH / Math.max(1, viewportWidth));

export const isReviewShot = (v: unknown): v is string =>
  typeof v === "string" && v.startsWith("data:image/jpeg;base64,") && v.length <= 1_500_000;

export function visualReviewPrompt(shots: number): string {
  const what =
    shots >= 2
      ? "Attached are two screenshots of the current site: the first at desktop width and the second at phone width."
      : "Attached is a screenshot of the current site.";
  return (
    `Do a visual design review. ${what} Look at them the way a careful designer would and find REAL visual defects: ` +
    "overlapping or clipped text, unreadable contrast, broken or missing images, awkward empty gaps, cramped or misaligned sections, " +
    "elements that overflow or get cut off at phone width, and inconsistent spacing. " +
    "Fix only what is actually wrong, with small <edit> blocks on the existing files, and keep the content and the visual direction exactly as they are. " +
    "Start with one sentence listing the defects you found. If you find none, say so in one sentence and change nothing."
  );
}

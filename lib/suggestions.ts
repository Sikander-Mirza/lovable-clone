// One-click follow-ups shown under the latest version. Chosen from what the
// project is still missing, so they stay relevant instead of repeating.

type Idea = { label: string; prompt: string; missing: (code: string) => boolean };

const IDEAS: Idea[] = [
  {
    label: "Add testimonials",
    prompt: "Add a testimonials section with 3 realistic customer quotes, names, roles and avatars.",
    missing: (c) => !/testimonial|reviews?\b/i.test(c),
  },
  {
    label: "Add pricing",
    prompt: "Add a pricing section with 3 plans, a highlighted recommended plan and a feature list for each.",
    missing: (c) => !/pricing|plans?\b/i.test(c),
  },
  {
    label: "Add FAQ",
    prompt: "Add an FAQ section with 6 useful questions in an accordion that opens and closes.",
    missing: (c) => !/faq|frequently asked/i.test(c),
  },
  {
    label: "Add contact form",
    prompt: "Add a contact section with a validated form (name, email, message), a success state and contact details.",
    missing: (c) => !/<form/i.test(c),
  },
  {
    label: "Add a stats strip",
    prompt: "Add a stats strip with 4 impressive numbers and short labels between sections.",
    missing: (c) => !/stats?\b|counter/i.test(c),
  },
  {
    label: "Add a newsletter signup",
    prompt: "Add a newsletter signup block with an email field and a success message, above the footer.",
    missing: (c) => !/newsletter|subscribe/i.test(c),
  },
  {
    label: "Add photos",
    prompt: "Add relevant real photos to the hero and the main sections using the photo URL pattern from your instructions.",
    missing: (c) => !/unsplash|<img/i.test(c),
  },
  {
    label: "Improve mobile layout",
    prompt: "Review the whole page for small screens and fix spacing, stacking, font sizes and the mobile menu.",
    missing: () => true,
  },
  {
    label: "Make it more polished",
    prompt: "Polish the design: consistent spacing, stronger typography hierarchy, subtle animations and better hover states.",
    missing: () => true,
  },
];

export function suggestionsFor(files: Record<string, string>, max = 4): { label: string; prompt: string }[] {
  const code = Object.values(files).join("\n");
  if (!code) return [];
  return IDEAS.filter((i) => i.missing(code))
    .slice(0, max)
    .map(({ label, prompt }) => ({ label, prompt }));
}

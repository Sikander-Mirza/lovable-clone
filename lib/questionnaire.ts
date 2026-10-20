// A fixed, basic questionnaire shown before building. No AI call, so it always
// appears instantly, even when the model is busy or offline.

export type ClarifyQuestion = {
  id: string;
  question: string;
  /** Tappable suggestions. Empty = a plain text question. */
  options: string[];
  multi: boolean;
  /** Placeholder for the free-text box. */
  placeholder?: string;
};

export const QUESTIONS: ClarifyQuestion[] = [
  {
    id: "type",
    question: "What kind of website do you want?",
    options: [
      "Business / company",
      "Portfolio",
      "Online store",
      "Blog",
      "Restaurant / cafe",
      "Product or app landing page",
      "Event / wedding",
      "Course / education",
    ],
    multi: false,
    placeholder: "Or describe it in your own words...",
  },
  {
    id: "name",
    question: "What is the name of your business or brand?",
    options: [],
    multi: false,
    placeholder: "e.g. Noor Coffee House",
  },
  {
    id: "audience",
    question: "Who is it for?",
    options: ["General public", "Customers / clients", "Businesses (B2B)", "Students", "Young audience", "Professionals"],
    multi: true,
  },
  {
    id: "style",
    question: "Which look and feel do you prefer?",
    options: [
      "Modern and minimal",
      "Corporate and professional",
      "Colorful and playful",
      "Dark and bold",
      "Elegant and luxury",
      "Warm and friendly",
    ],
    multi: false,
  },
  {
    id: "color",
    question: "Main color?",
    options: ["Blue", "Green", "Purple", "Red / orange", "Black and white", "Let the AI choose"],
    multi: false,
  },
  {
    id: "pages",
    question: "Which pages or sections should it have?",
    options: ["Home", "About us", "Services / products", "Gallery / portfolio", "Pricing", "Testimonials", "Blog", "FAQ", "Contact"],
    multi: true,
  },
  {
    id: "features",
    question: "Any features you need?",
    options: [
      "Contact form",
      "Online booking",
      "Online ordering / cart",
      "Newsletter signup",
      "Login / signup",
      "WhatsApp / social links",
      "Dark mode toggle",
    ],
    multi: true,
  },
  {
    id: "language",
    question: "Language of the website text?",
    options: ["English", "Urdu", "Roman Urdu", "Arabic"],
    multi: false,
  },
];

/** Preselect the site type from words in the prompt (the user can still change it). */
export function guessType(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const rules: [RegExp, string][] = [
    [/restaurant|cafe|coffee|menu|bakery|food|pizza/, "Restaurant / cafe"],
    [/portfolio|resume|cv\b|freelanc/, "Portfolio"],
    [/shop|store|ecommerce|e-commerce|sell|product catalog|cart/, "Online store"],
    [/blog|article|magazine|news/, "Blog"],
    [/wedding|event|conference|party/, "Event / wedding"],
    [/course|school|academy|education|tutor|learning/, "Course / education"],
    [/landing|startup|saas|app\b/, "Product or app landing page"],
    [/business|company|agency|consult|services?|clinic|firm/, "Business / company"],
  ];
  return rules.find(([re]) => re.test(p))?.[1] ?? null;
}

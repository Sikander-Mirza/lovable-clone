export type Template = {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
  prompt: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "saas-landing",
    title: "SaaS landing page",
    blurb: "Hero, features, pricing, FAQ",
    emoji: "🚀",
    prompt:
      "Build a polished SaaS landing page for an AI note-taking app called 'Noted'. Sections: sticky navbar, hero with headline and two CTAs, logo strip, 6-feature grid with icons, how-it-works in 3 steps, testimonials, a monthly/annual pricing toggle with 3 plans, an FAQ accordion, and a footer. Modern indigo/violet palette, generous spacing, subtle hover animations.",
  },
  {
    id: "portfolio",
    title: "Portfolio (multi-page)",
    blurb: "Home, Projects, Contact",
    emoji: "🎨",
    prompt:
      "Build a personal portfolio website for a product designer with three pages using react-router-dom: Home (intro, skills, featured work), Projects (filterable grid of 6 case studies with images), and Contact (form with validation and success message). Shared navbar and footer, dark theme with a bright accent color.",
  },
  {
    id: "dashboard",
    title: "Analytics dashboard",
    blurb: "KPIs, charts, table",
    emoji: "📊",
    prompt:
      "Build an analytics dashboard with a sidebar, a top bar with search and avatar, 4 KPI cards with trend indicators, a line chart of revenue, a bar chart of signups by channel, a donut chart of traffic sources (use recharts), and a recent-orders table with status badges and sorting. Realistic mock data, clean light theme.",
  },
  {
    id: "kanban",
    title: "Kanban board",
    blurb: "Columns, cards, saved locally",
    emoji: "🗂️",
    prompt:
      "Build a Kanban board with three columns (To do, In progress, Done). Users can add cards, edit a card title inline, delete cards, and move cards between columns with buttons. Persist everything in localStorage. Include a header with a board title and a card counter per column.",
  },
  {
    id: "store",
    title: "Online store",
    blurb: "Products, cart, checkout UI",
    emoji: "🛍️",
    prompt:
      "Build an online store for a minimalist sneaker brand: product grid with filters (size, price) and sorting, a product detail modal with size picker, a slide-over shopping cart with quantity controls and totals, and a checkout form UI (no real payments). Persist the cart in localStorage. Clean editorial look.",
  },
  {
    id: "blog",
    title: "Blog",
    blurb: "Posts list and article pages",
    emoji: "✍️",
    prompt:
      "Build a blog with react-router-dom: a home page with a featured post and a grid of post cards with tags, an article page with typography-focused layout, reading time, and related posts, and an About page. Include 6 realistic mock posts and a tag filter. Warm, readable serif design.",
  },
  {
    id: "restaurant",
    title: "Restaurant site",
    blurb: "Menu, hours, reservations",
    emoji: "🍝",
    prompt:
      "Build a restaurant website for an Italian trattoria: hero with a booking CTA, a tabbed menu (starters, pasta, mains, desserts) with prices, an about section, opening hours, a reservation form (date, time, guests) with confirmation message, and a footer with map placeholder and contacts. Warm, appetizing colors.",
  },
  {
    id: "todo",
    title: "Habit tracker",
    blurb: "Streaks and weekly chart",
    emoji: "✅",
    prompt:
      "Build a habit tracker: add habits, check them off per day on a 7-day grid, show current streaks, and a weekly completion chart (recharts). Persist in localStorage. Friendly, colorful design with progress rings.",
  },
  {
    id: "link-in-bio",
    title: "Link in bio",
    blurb: "Profile and link buttons",
    emoji: "🔗",
    prompt:
      "Build a mobile-first link-in-bio page for a creator: avatar, name, short bio, social icons, and 6 stylish link buttons with hover effects, plus a small email newsletter signup. Gradient background, centered 480px column.",
  },
];

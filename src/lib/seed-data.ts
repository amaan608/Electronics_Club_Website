// Initial content, inserted once per database (see src/lib/db.ts). After that the admin panel owns it.

// Heads for the 2026–27 tenure, from the club's "Meet the Heads" Instagram post (15 July 2026).
// The post shows first names only. Add photos as Cloudinary URLs in Admin → Team.
export const team2026 = [
  { name: "Mourya", role: "Secretary", bio: "Maintaining steady state through chaos." },
  { name: "Mythra", role: "Overall Coordinator", bio: "The all-rounder." },
  { name: "Abdullah", role: "Projects and Inventory Manager", bio: "Time to bring some order to chaos." },
  { name: "Suhani", role: "Projects and Inventory Manager", bio: "Top 10 PIM of all time." },
  { name: "Premaja", role: "Events Manager", bio: "Chaos inside, calm outside." },
  { name: "Carlton", role: "Analog Head", bio: "Life is analog. Digital is just an approximation." },
  { name: "Gurchet", role: "Digital Head", bio: "Still waiting on the next positive edge of my life." },
  { name: "Kartikeya", role: "Embedded and IoT Head", bio: "If it works, don’t ask how." },
  { name: "Amaan", role: "Signal Processing Head", bio: "Minimal words, maximum clarity." },
  { name: "Yash", role: "Content Head", bio: "Junior title, senior-level handling." },
  { name: "Princy", role: "Design Head", bio: "It’s all about the aesthetics." },
].map((member, order) => ({ ...member, order, tenure: "2026–27", published: true }));

export const starterProjects = [
  {
    slug: "signal-display",
    title: "Signal display",
    category: "SIGNAL PROCESSING",
    description: "An LED spectrum display that turns audio frequencies into columns of light.",
    detail: "A microphone feeds a sampled audio stream into a microcontroller. Frequency bins map to LED columns so a change in pitch or amplitude becomes visible.",
    hardware: "Microcontroller, microphone module, LED matrix",
    image: "/art/signal-display.png",
  },
  {
    slug: "battery-monitor",
    title: "Battery monitor",
    category: "INSTRUMENTATION",
    description: "A compact voltage monitor with a simple, readable charge indicator.",
    detail: "A voltage divider feeds the analog input. The firmware smooths repeated samples, estimates the charge range, and updates a segmented display.",
    hardware: "Development board, voltage divider, segmented display",
    image: "/art/battery-monitor.png",
  },
  {
    slug: "desktop-plotter",
    title: "Desktop plotter",
    category: "MOTION CONTROL",
    description: "A two-axis drawing machine that translates coordinates into pen strokes.",
    detail: "Two stepper motors move the pen along a programmed path. A servo lifts the pen between strokes while limit switches establish a repeatable starting position.",
    hardware: "Stepper drivers, pen carriage, servo, limit switches",
    image: "/art/desktop-plotter.png",
  },
].map((project, order) => ({ ...project, order, stage: "Concept", published: true }));

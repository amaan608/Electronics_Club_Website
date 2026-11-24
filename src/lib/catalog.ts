export const members = [
  {
    name: "Ananya Rao",
    role: "Club coordinator",
    photo: "team-lead",
    bio: "Brings the project teams and workshop calendar together.",
  },
  {
    name: "Arjun Sen",
    role: "Hardware lead",
    photo: "team-hardware",
    bio: "Helps members take circuit ideas from breadboard to board layout.",
  },
  {
    name: "Meera Shah",
    role: "Events coordinator",
    photo: "team-events",
    bio: "Organizes hands-on sessions and the club’s collaborative builds.",
  },
];
export const projects = [
  {
    slug: "signal-display",
    title: "Signal display",
    category: "SIGNAL PROCESSING",
    description:
      "An LED spectrum display that turns audio frequencies into columns of light.",
    detail:
      "A microphone feeds a sampled audio stream into a microcontroller. Frequency bins map to LED columns so a change in pitch or amplitude becomes visible.",
    hardware: "Microcontroller, microphone module, LED matrix",
  },
  {
    slug: "battery-monitor",
    title: "Battery monitor",
    category: "INSTRUMENTATION",
    description:
      "A compact voltage monitor with a simple, readable charge indicator.",
    detail:
      "A voltage divider feeds the analog input. The firmware smooths repeated samples, estimates the charge range, and updates a segmented display.",
    hardware: "Development board, voltage divider, segmented display",
  },
  {
    slug: "desktop-plotter",
    title: "Desktop plotter",
    category: "MOTION CONTROL",
    description:
      "A two-axis drawing machine that translates coordinates into pen strokes.",
    detail:
      "Two stepper motors move the pen along a programmed path. A servo lifts the pen between strokes while limit switches establish a repeatable starting position.",
    hardware: "Stepper drivers, pen carriage, servo, limit switches",
  },
];

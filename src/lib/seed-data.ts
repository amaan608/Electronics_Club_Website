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

// The demo projects that earlier versions seeded. The brochure seed removes them.
export const demoProjectSlugs = ["signal-display", "battery-monitor", "desktop-plotter"];

// Club projects, summarised from the 2026 brochure. Images are added as Cloudinary URLs in Admin → Projects.
export const brochureProjects = [
  {
    slug: "lena",
    title: "LENA",
    category: "DIGITAL · FPGA",
    description: "Real-time video filtering done entirely in FPGA fabric: a live camera feed blurred, sharpened or edge-detected with no software in the loop.",
    detail: "A camera captures at 24 MHz and streams 12-bit pixels into a custom image-processing module of control logic, line buffers and a convolution core. Processed frames are stored in a 640×480 BRAM and sent out by a Verilog VGA controller. Board switches select grayscale or colour and inverted or normal output, and swap kernels on the fly (blur, sharpen, Sobel). It was built in stages: the VGA controller, then the image pipeline simulated on static images in Vivado, then camera-to-VGA integration.\n\nResult: live, artifact-free filtered video in every mode, verified in simulation and then on FPGA hardware with a real camera.",
    hardware: "FPGA, camera module, BRAM frame buffer, VGA output · Verilog, Vivado",
    stage: "Completed",
  },
  {
    slug: "precision-oscillator",
    title: "Precision Oscillator",
    category: "ANALOG",
    description: "An open-loop oscillator turned into a self-correcting closed-loop system that cancels component drift within milliseconds.",
    detail: "Three blocks form the loop: a VCO (an integrator ramp with a Schmitt trigger) whose frequency follows its input voltage; a frequency-to-voltage converter (peak detector and low-pass filter) that senses the output; and a PID controller that compares it with a reference and feeds back a continuous correction, cancelling drift caused by heating of the passive components. It was prototyped on a breadboard, built on perfboard and verified with live DSO captures.\n\nResult: near-ideal linearity on both rising and falling ramp edges, and long-term frequency drift measurably removed compared with the open-loop design.",
    hardware: "Integrator VCO, Schmitt trigger, peak detector, low-pass filter, PID controller · DSO",
    stage: "Completed",
  },
  {
    slug: "synaptron",
    title: "Synaptron",
    category: "SIGNAL PROCESSING",
    description: "Low-cost prosthetic control that turns forearm muscle signals into real-time servo movement, with no machine-learning model in the loop.",
    detail: "Surface electrodes pick up EMG from the forearm muscles. The signal is amplified, notch-filtered to remove 50/60 Hz mains interference, and envelope-detected into a muscle-activation waveform. A threshold classifier maps activation strength to discrete gestures, each bound to a command that drives the motor and servo actuators.\n\nSignal chain: acquisition → amplification → notch filter → envelope detection → threshold classification → actuation.\n\nResult: a working real-time gesture-to-motion pipeline with deterministic, low-latency control from raw biosignals.",
    hardware: "Surface EMG electrodes, amplifier, notch filter, envelope detector, servo and motor actuators",
    stage: "Completed",
  },
  {
    slug: "darthawk",
    title: "Project Darthawk",
    category: "EMBEDDED",
    description: "An autonomous pan-tilt sentry that detects people with YOLO-nano on a Raspberry Pi and tracks them with minimal control-loop lag.",
    detail: "An optimised YOLO-nano model running on a Raspberry Pi finds people in live video and computes their offset from the frame centre. The offsets become angle changes, sent over non-blocking serial to a custom pan-tilt mount whose bare-metal firmware handles motor stepping, acceleration profiles and closed-loop position feedback. ROS 2 was deliberately skipped to keep the loop deterministic, and the whole pipeline was profiled to cut the lag between frame capture and movement.\n\nResult: motor response matched to the inference rate, with frame rate, resolution and model size tuned to avoid thermal throttling on the edge hardware.",
    hardware: "Raspberry Pi, camera, custom pan-tilt assembly, stepper motors · YOLO-nano, pySerial",
    stage: "Completed",
  },
  {
    slug: "lam-alfr-sarm",
    title: "LAM ALFR & SARM",
    category: "ROBOTICS",
    description: "Two custom robots that simulate synchronised material handling in a semiconductor cleanroom, built for the LAM Research Challenge.",
    detail: "An autonomous line-follower robot (ALFR) with an 8-channel line sensor array works with a manually driven single-arm robot (SARM) on an omni-wheel base. Both were modelled in SolidWorks, 3D-printed, and run on an ESP32 and an Arduino Nano. The SARM clears obstacles while the ALFR waits at junctions, then the ALFR passes three gates: a peristaltic pump dispenses exactly 125 mL, a LAM-shaped LED array lights up, and the robot parks precisely.\n\nResult: zero path deviation across all three obstacle stages, the 125 mL dispense within tight tolerance, and the full run inside the 10-minute limit.",
    hardware: "ESP32, Arduino Nano, 8-channel line sensor, omni wheels, peristaltic pump, LED array",
    stage: "LAM Research Challenge",
  },
  {
    slug: "delta-sigma-adc",
    title: "Delta-Sigma ADC",
    category: "VLSI",
    description: "A 20-bit delta-sigma ADC taken from modulator concept through RTL-to-GDSII layout, reaching 18.6 effective bits after layout.",
    detail: "The target was 16–19 effective bits (ENOB) at 0.5–2 ksps. Discrete-time, continuous-time and hybrid modulators and IIR/FIR/CIC filters were modelled in MATLAB/Simulink, and the filter coefficients were quantised for Verilog. A discrete-time modulator with auto-zeroing and chopping outputs a 1-bit stream at 2048× the sampling rate into a demodulator → CIC → downsampler chain, which was synthesised, laid out through the full RTL-to-GDSII flow, and re-analysed in MATLAB.\n\nResult: 137.79 dB SNR from the modulator; 112.41 dB SNDR (18.38 ENOB) after synthesis and 18.6 ENOB after layout, with 0.88 dB passband droop.",
    hardware: "MATLAB/Simulink, Verilog, RTL-to-GDSII flow, CIC decimation filter",
    stage: "Inter-IIT problem statement",
  },
].map((project, order) => ({ ...project, order, published: true }));

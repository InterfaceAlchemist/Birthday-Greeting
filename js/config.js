// ✏️ Edit this file to personalise the greeting. {name} and {from} are replaced automatically.
window.CONFIG = {
  name: "Hasley",
  from: "Jeremy",
  lines: [
    "Today is all about you, Boss.",
    "Thank you for being someone I can count on, and for every laugh we’ve shared.",
    "I hope this year brings you everything you’ve been quietly hoping for.",
    "Happy Birthday! 🎉 — {from}"
  ],
  // One wish per balloon (6 balloons)
  wishes: [
    "Good health and a calm heart 💖",
    "More adventures with the people you love ✈️",
    "Dreams that finally come true ✨",
    "Lots of food, naps and zero stress 🍰",
    "Success in everything you try 🚀",
    "A year full of reasons to smile 😊"
  ],
  balloonColors: ["#ff5c93", "#4cc9f0", "#ffb703", "#7ae582", "#b388ff", "#ff8a5c"],
  // 🔒 Unlock time, in the viewer's local time. Leave "" to open anytime. Add ?preview to the URL to skip the lock while testing.
  unlockAt: "2026-11-16T00:00:00",
  lockedText: "A surprise is waiting for you, {name}…",
  // 💌 Reply button shown at the end. {msg} is replaced by the message below. Use ONE link style:
  //   "sms:+639XXXXXXXXX?&body={msg}"                          (text message)
  //   "https://m.me/YOUR_FB_USERNAME"                          (Messenger)
  //   "mailto:you@email.com?subject=Thank%20you&body={msg}"    (email)
  reply: { label: "Reply to {from} on Instagram 💌", url: "https://ig.me/m/404notjeremi", message: "" },
  cardText: "Wishing you a year full of love, laughter and care. 🫶",
  finalWish: "That’s every wish. Now go eat some cake! 🍰"
};

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
  // 📷 Photo memories: they pop out of the gift right after it opens. Put the image files in public/photos/ and list them here. Use photos: [] to skip.
  memoriesTitle: "A few memories, {name} 💛",
  photos: [
    { src: "photos/1.jpg", caption: "Showing up for others 🌟" },
    { src: "photos/2.jpg", caption: "Giving with a full heart 💛" },
    { src: "photos/3.jpg", caption: "Kindness looks good on you 🌿" },
    { src: "photos/4.jpg", caption: "Making someone’s day 🤗" },
    { src: "photos/5.jpg", caption: "Teamwork and good vibes 🙌" },
    { src: "photos/6.jpg", caption: "Golden hour, golden heart 🌅" }
  ],
  // Her portrait: "src" is the last photo in the stack, "face" is the square crop printed on the card.
  portrait: { src: "photos/hasley.jpg", face: "photos/hasley-face.jpg", caption: "Happy Birthday, {name}! 🎂" },
  finalWish: "That’s every wish. Now go eat some cake! 🍰"
};
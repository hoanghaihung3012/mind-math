# Publish Text (YouTube Shorts)

Write these into the clip's `publish.json` (`titles`, `description` as an array of lines, `tags`, `pinnedComment`); `mm publish <clip>` turns it into `out/<date>/<slug>/publish.txt` for copy-paste. English, channel name: Mind Math. Use the real numbers from the clip's math check and say "about" for rounded values.

## Title (give 3 options)
- Question form: "How Many Steps to Walk Around the Earth? 🌍"
- Shock form: "53 MILLION Steps to Walk Around the Earth"
- Keep under 70 characters, put the key number or question first.

## Description template
```
<Hook question again, one sentence> <emoji>

<One-sentence answer with the biggest number.>

The math:
• <fact 1 with unit and source value>
• <calculation step>
• <calculation step>
• <final result>

All numbers are approximate.

<Question to the viewer> 👇

👉 Subscribe to Mind Math for more mind-blowing math in under 60 seconds.

#Shorts #MindMath #MathFacts #DidYouKnow #<topic1> #<topic2>
```

## Tags
8-10 comma-separated: `mind math, math facts, <topic keywords>, mind blowing facts, math shorts, did you know`.

## Pinned comment
Ask a question the viewer can answer with a number or a choice (for example "How many years would YOU last?").

## Upload checklist
- Not made for kids, visibility Public.
- Turn on the altered/synthetic content disclosure if asked (the voice is synthetic).
- Look at the thumbnail frame YouTube picks: it must not show text in the bottom 150 px or right 56 px.
- Re-run `mm safe <clip>` after any layout change before exporting again.

## Channel description (set once)
```
Mind Math 🧠➗ Math that makes your brain go "wait... WHAT?!"

Every video turns a simple question into a mind-blowing number. Quick 2D animations, clear explanations, real numbers. Under 60 seconds.

🔔 Subscribe for new math Shorts.

📩 Business / collabs: <email>
```
Channel keywords: `math, math facts, mind blowing, did you know, science, shorts, animation, numbers`.

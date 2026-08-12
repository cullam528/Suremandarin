# SureMandarin Daily design QA

Reference: selected Direction 1 from the SureMandarin Daily ideation set — compact app-like speaking lesson with a 7-day progress row, one real-life phrase, audio/listen control and a prominent speaking CTA.

## Result

- Desktop preview: passed. The new `/en/daily` page keeps the existing SureMandarin header/footer and brand tokens, with a focused Daily surface below them.
- Mobile preview at 390 × 844: passed. The challenge stacks into a single-column flow, keeps the seven day selector readable, and preserves the speaking CTA below the lesson.
- Visual match: passed. The generated coffee asset, pale blue surfaces, rounded cards, blue/cyan gradient CTA and streak treatment follow Direction 1 without introducing a second visual language.
- Core interaction: passed by DOM verification. Day selection, listen button, start speaking button, share CTA, course consultation CTA and account link are present and wired.
- PWA: passed at build level. Manifest, service worker registration, install prompt and basic app-shell caching are included.
- Backend fallback: passed. Built-in challenge content renders while Strapi is offline; published `daily-challenge-day` entries are used automatically when Strapi is available.


# PBJ Teaser Website — Plan

## The Goal
Build the skeleton of the full PeanutButterJelly.vip site (not a single page) so visitors get our vibe right away. Give them specific things to look forward to, so they stay excited instead of signing up and forgetting us. After signing up, people are pointed to our Instagram and told to watch for dates.

## Who It's For
**Guests:** 20–32-year-olds in Mumbai who spend ₹500–3,500 on a night out but find good small events only by luck.
- At launch: college students (18–23), young working people (24–32), couples (22–35), newcomers to Mumbai (moved here in the last 2 years)
- Later waves: serious hobby learners, parents (30–45, kids aged 4–12)

**Hosts and partners:**
- Paid hosts: solo teachers and artists, studios and small venues, clubs and groups, brands
- Free listings: everyday users with a spare ticket or a group plan (outside venues only, no home addresses)
- Partner program: venues (free repeating listings, "PBJ Partner" badge, we fill their quiet weekday slots) and brands (sponsor "PBJ Originals" nights, priced per event)

## The Site, Tab by Tab
Six folder tabs: **Home, Events, About, List Your Event, Be Our Partner, Our Secret.**
- Computers: tabs along the right edge; hovering shows the full label.
- Phones: tabs stacked close together at the top with part of each label showing. Tap to peek (the tab slides out to show its full label), tap again to open. Switching tabs feels like shuffling through folders.

**Home** (top to bottom)
1. Loading screen (first visit only): jelly-purple screen with "ooze the fun" gets vacuumed into a hole in the middle (edges pinched inward, slight drain-like twist, dark void around it), then the hero comes back out of the hole with a gentle turn
2. Hero: our mascot, front and centre, with a "Join the list" button
3. Short intro that spins into view as people scroll
4. What PBJ is all about
5. Pre-launch host lineup
6. Early perks
7. Email signup, then the Instagram link and "stay tuned for dates"

**Events:** "PBJ-approved events happening around you until we mine exclusive hidden gems for you."
- Curated picks from around Mumbai (not everything), filterable by neighbourhood, price (low to high), date and category
- Each event gets a PBJ-style card in our own words, using only photos we have permission for
- A "Go to event" button links out (to the host's own page or Instagram where possible), next to a "Get notified about events like this" signup
- On computers, the "Go to event" button follows the cursor over each event card (see "No Art shop cursor" in INSPIRATION.md); on phones it's a normal button on the card. Later, PBJ's own events get an "I AM IN" button that works the same way.
- We add events by hand through a simple form or spreadsheet (no code). Events hide themselves automatically once their date has passed.

**About:** the story behind PBJ and the founders' details.

**List Your Event:** who can list, a peek at "how to list" (design to be decided), a few rules (including outside venues only) and a host interest signup.

**Be Our Partner:** why hosts, venues and brands should partner with us, what we offer, and a "reach out" button.

**Our Secret:** "What PBJ does differently: it's a secret we can share if you reach out." Helps hosts see why to choose us over other platforms, and sparks curiosity in guests. Ends with a "reach out" button.

## Must-Haves (all needed for launch)
- All six tabs working, with the folder effect on computers and phones
- Every page with the content above
- Working email signups, feeding two lists: **guests**, and **hosts and partners**
- The 3D sandwich mascot that builds itself as people scroll (needs a 3D artist, so find one early)
- Smooth scrolling on computers (Lenis); normal touch scrolling on phones
- The intro spinning in, line-by-line text effects and the folder-shuffle animation
- Works well on phones and loads fast on mobile data

## Where Email Signups Go
- **Home:** at the bottom, plus a "Join the list" button in the hero that jumps to it (guest list)
- **Events:** "Get notified about events like this" on each event card (guest list)
- **List Your Event:** host interest signup (hosts and partners list)
- **Be Our Partner** and **Our Secret:** a "reach out" contact button instead of a signup

## Building Steps
- [x] 1. Starting project (Vite, GSAP, Lenis, Three.js)
- [ ] 2. The six folder tabs (first version done: hover on computers, tap to peek / tap to open on phones)
- [ ] 3. Home page sections in order (placeholders in place)
- [ ] 4. The other five tabs
- [ ] 5. Effects: "ooze the fun" loading screen (first version done), intro spin-in, line-by-line text, uneven-gap text, cursor-following button
- [ ] 6. Events page: curated cards, filters, easy way to add events, old events hide automatically
- [ ] 7. Email signups (guests list; hosts and partners list)
- [ ] 8. 3D sandwich mascot (first version done: code-built, assembles on scroll, face pops on at the end)
- [ ] 9. Phone version rounds
- [ ] Before launch: write an engineer guide (how to run the site, what each file does, what's unfinished), label the "version 1" point in GitHub, and have an engineer review it (optional short check-in earlier, once the main pages are built)
- [ ] 10. Launch on PeanutButterJelly.vip (only when desktop and phone are both ready)

## Not Building Yet
- Spin-off Events section (later, once we've handpicked and organised our own events)
- Partner Hosts list with a profile page for each host (later, once we have partners on our roster; see "No Art Music Week artist page" in INSPIRATION.md)
- Buying tickets or paying on the site
- Hosts listing events themselves (for now, List Your Event only collects interest)
- User accounts and logins
- Curator program (3rd wave)
- Sections for hobby learners and parents (2nd and 3rd waves)
- AI helper to catch events cancelled before their date

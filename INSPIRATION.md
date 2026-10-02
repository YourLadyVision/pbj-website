# Inspiration

Design ideas for PeanutButterJelly.vip, grouped by section of the site.
Screenshots go in the `inspiration/` folder.

To add an idea, copy the template below into the right section and fill it in.

```
### Idea name
- **Link:**
- **What I like:**
- **Where I'd use it:**
- **Screenshot:** inspiration/
```

---

## Hero
_The first thing people see at the top of the homepage._

### Cabi Foods hero
- **Link:** https://hero.gallery/hero-gallery/cabi-foods
- **What I like:** The folder effect on the right side: the menu (Home, Shop, For Us, Recipes) sits along the right edge as vertical tabs, like the dividers in a folder.
- **Where I'd use it:** In the hero.
- **Screenshot:** inspiration/
- **Phone version:** Same folder effect, but with the tabs along the top of the screen. Tapping a tab feels like shuffling through folders: that tab's page comes to the front.

## Animations
_Bounces, wiggles, hover effects, page transitions._

### Horizontal Text demo
- **Link:** https://demos.gsap.com/demo/horizontal-text
- **Code:** https://codepen.io/GreenSock/pen/MYyBrZw (uses GSAP's ScrollTrigger and SplitText)
- **What I like:** Big text slides sideways as I scroll down, and the letters animate individually as they move.
- **Where I'd use it:** Not decided yet. Probably for the tagline, "Mining Hidden Gems Around You", but nothing is fixed on where else it might go.
- **Screenshot:** inspiration/

### No Art shop "shop now" cursor
- **Link:** https://www.noartmusic.com/products
- **What I like:** When the mouse moves over a product, a small "shop now" label follows the cursor around.
- **Where I'd use it:** On the Events page, the button follows the cursor over each event card:
  - **"Go to event"** for curated events that link out to other platforms (from launch)
  - **"I AM IN"** for PBJ's own events (later, once we have them)
- **Screenshot:** inspiration/
- **Phone version:** Phones have no cursor, so on phones the button sits on each event card as a normal button.

## Scrolling
_What happens as people scroll down the page._

### Lenis: Smooth Scroll
- **Link:** https://github.com/darkroomengineering/lenis
- **Demo:** https://lenis.darkroom.engineering
- **What I like:** The whole smooth scroll effect.
- **Where I'd use it:** Everywhere, across the whole website and web app.
- **Screenshot:** inspiration/
- **Notes:** Works together with GSAP's ScrollTrigger, so it can be the smooth scroll that the other scroll ideas (line splits, horizontal text, the sandwich mascot) play on top of.
- **Decision:** Smooth scroll on computers only. On phones, leave the phone's normal touch scrolling alone (this is Lenis's default). Scroll animations still play on phones.

### Responsive Line Splits on Scroll demo
- **Link:** https://demos.gsap.com/demo/responsive-line-splits-on-scroll
- **Code:** https://codepen.io/GreenSock/pen/GggpRoB (uses GSAP's ScrollTrigger and SplitText)
- **What I like:** Clean, desktop-sized text for key info, trends, etc., shown between the smooth-scrolling parts of the site.
- **Where I'd use it:** On one or more pages, as part of the smooth scroll effect.
- **Screenshot:** inspiration/

#### How it would work
1. We write short, punchy text blocks for key info, like a trend or a hidden-gem fact about Mumbai.
2. As people scroll, each block appears line by line, with each line sliding or fading in smoothly.
3. The text resizes and re-arranges its lines to fit the screen, so it still looks clean on phones, not just desktops.

**To plan for:** Keep these text moments short (one to three sentences) so they're quick to read on a phone, and space them out between other sections so they feel special.

### Stagger Items In on Scroll demo
- **Link:** https://demos.gsap.com/demo/stagger-items-in-on-scroll
- **Code:** https://codepen.io/GreenSock/pen/NWGPxGZ (uses GSAP's ScrollTrigger)
- **What I like:** It shows many things neatly lined up, appearing one after another as I scroll.
- **Where I'd use it:** The "Spin-off Events" section showing all the events we've done so far. This probably comes later, once we have a few successful events under our belt.
- **Screenshot:** inspiration/

### 197 Historias Ilustradas grid scroll
- **Link:** https://www.awwwards.com/inspiration/grid-scroll-197-historias-ilustradas
- **What I like:** The grid scroll effect: each illustrated story card in the grid looks clean and focused.
- **Where I'd use it:** As an option for the "Spin-off Events" / Successful Events section (alternative to the Stagger Items idea above).
- **Click transition:** https://www.awwwards.com/inspiration/grid-transition-197-historias-ilustradas — when someone taps a card in the grid, this is how it opens into that event's full story.
- **End of story:** https://www.awwwards.com/inspiration/story-fade-197-historias-ilustradas — when someone scrolls to the end of an event's full story, a lineup of the next stories appears below and the story above fades out.
- **Screenshot:** inspiration/

## Email signup
_Forms and boxes where people join the mailing list._

## Mascot
_Characters, illustrations, and personality._

### Image Sequence demo
- **Link:** https://demos.gsap.com/demo/image-sequence
- **Code:** https://codepen.io/GreenSock/pen/VwgevYW (uses GSAP's ScrollTrigger)
- **What I like:** The image lights up and looks like a scene from a commercial.
- **Where I'd use it:** For my mascot: a 3D PB&J sandwich that builds itself as people scroll (not interactive, just scroll-driven).
- **Screenshot:** inspiration/

#### How it would work
1. Someone creates the sandwich-assembly scene in a 3D design program: bread lands, peanut butter spreads, jelly drops, the top slice closes. We could hire a 3D artist or look for ready-made models.
2. The scene is saved as a series of still pictures, often around 100 to 150.
3. On the site, scrolling flips through those pictures, so the sandwich builds as people scroll down and comes apart as they scroll back up.

**To plan for:** That many pictures can be heavy on mobile data. Keep them small and fast to load, and maybe use fewer frames on phones.

## Other
_Anything that doesn't fit above._

### No Art "About" text style (uneven gaps)
- **Link:** https://www.noartmusic.com (About section)
- **What I like:** The uneven gaps between words. Each line is stretched to fill the full width, so the spaces between words grow and shrink (this is called "justified" text). A big, bold headline sits on the left, and smaller all-caps typewriter-style text on the right.
- **Where I'd use it:** On the texts where I say so (not everywhere).
- **Screenshot:** inspiration/other-no-art-justified-text.webp
- **To plan for:** On narrow phone screens, lines with only a few words can get very large gaps. The phone version will take a few rounds of trying and adjusting until each spot reads well.

### No Art Music Week artist page
- **Link:** https://www.noartmusicweek.com/artists/itz3bby
- **What it looks like:** Each artist gets a profile: a big bold name, a large photo, the event they're playing (with date), and buttons to their Instagram and SoundCloud. Below it, a "Discover more artists" list shows everyone else on the lineup.
- **Where I'd use it:** Our list of Partner Hosts under PBJ, once we have them on our roster. Each host gets a profile like this (photo, name, their upcoming PBJ event, links to their Instagram or website), with "Discover more hosts" below.
- **Screenshot:** inspiration/

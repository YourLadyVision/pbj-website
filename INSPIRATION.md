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
- **To plan for:** On phones there isn't much room for tabs down the side, so we'd need a phone version (for example, the tabs along the bottom of the screen).

## Animations
_Bounces, wiggles, hover effects, page transitions._

### Horizontal Text demo
- **Link:** https://demos.gsap.com/demo/horizontal-text
- **Code:** https://codepen.io/GreenSock/pen/MYyBrZw (uses GSAP's ScrollTrigger and SplitText)
- **What I like:** Big text slides sideways as I scroll down, and the letters animate individually as they move.
- **Where I'd use it:** Not decided yet. Probably for the tagline, "Mining Hidden Gems Around You", but nothing is fixed on where else it might go.
- **Screenshot:** inspiration/

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

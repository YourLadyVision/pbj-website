# PeanutButterJelly.vip — Project Notes

## Brand
- **Name:** PeanutButterJelly.vip (short form: PB&J)
- **Tagline:** "Mining Hidden Gems Around You"
- **Audience & place:** Built for Mumbai. Content, examples, and copy should feel local to Mumbai.

## Look & Feel
- **Style:** Playful and bouncy. Rounded corners, soft shadows, gentle bounce/wiggle animations on buttons and cards. Friendly, fun, never corporate.
- **Colors (PB&J sandwich palette, placeholders until the owner shares the final palette):**
  - Peanut butter: warm tan/caramel (e.g. `#C68B3E`)
  - Jelly: grape purple (e.g. `#6B2D5C`) and strawberry red (e.g. `#D7263D`)
  - **Palette being tested (light mode):** text `#1F1200`, background `#FFFDF8`, primary `#E8AF45`, secondary `#C82828`, accent `#563201` (realtimecolors.com). Applied in `src/style.css`; earlier backgrounds were `#F9F9F7` and `#FFF8EB`.
  - Bread: soft cream (e.g. `#FFF4DC`) for cards and accents
  - Crust: toasted brown (e.g. `#8B5A2B`) for text and outlines
- **Typography (copied exactly from noartmusic.com):** Chivo Mono 400 for text and labels (no letter-spacing, line-height 1.2, all caps, justified paragraphs), headlines 700 with a fixed -1.44px letter-spacing and line-height 1, left-aligned. All sizes are multiples of one unit `--u` that scales with screen width (computers: width/90, tablets: width/52.125, phones: width/23.4375): text 0.75em, headlines 3em (2em on tablets and phones). Their headline font is Neue Haas Grotesk (paid, cannot be copied), so we use Helvetica Neue where installed, then Inter Tight. If a licence is bought, swap it in (`--display` in `src/style.css`).
- Keep text readable: dark text on light backgrounds, good contrast.
- Respect users who turn off motion (reduce animations when "reduced motion" is on).

## Build Priorities
- **Desktop-first:** Design for computers first, then adapt for tablets and phones. The phone version must still work and look great: we only launch when both desktop and phone versions are ready.
- Keep pages fast and light — many visitors will be on mobile data.
- Large, easy-to-tap buttons.

## Plan
- Follow `PLAN.md` for what we're building, in what order, and what we're not building yet.

## Inspiration
- Check `INSPIRATION.md` (and screenshots in `inspiration/`) whenever we build something new.

## Working With the Owner
- The owner is not technical. Explain changes in plain language and avoid jargon.

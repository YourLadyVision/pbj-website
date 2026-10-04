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
  - Page background: soft warm off-white (`#F9F9F7`), the same as Claude's light-mode background
  - Bread: soft cream (e.g. `#FFF4DC`) for cards and accents
  - Crust: toasted brown (e.g. `#8B5A2B`) for text and outlines
- **Typography (same as noartmusic.com):** Chivo Mono (free) for body text and labels, all caps and justified; big, bold, tight all-caps headlines. Their headline font is Neue Haas Grotesk (paid), so we use Inter Tight as the free stand-in. If a licence for Neue Haas Grotesk is bought later, swap it in (`--display` in `src/style.css`).
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

---
name: Paper & Capital
colors:
  surface: '#fef9f2'
  surface-dim: '#ded9d3'
  surface-bright: '#fef9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f3ed'
  surface-container: '#f2ede7'
  surface-container-high: '#ece7e1'
  surface-container-highest: '#e6e2dc'
  on-surface: '#1d1b18'
  on-surface-variant: '#444748'
  inverse-surface: '#32302c'
  inverse-on-surface: '#f5f0ea'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#ad3221'
  on-secondary: '#ffffff'
  secondary-container: '#ff6d56'
  on-secondary-container: '#6c0500'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#061c36'
  on-tertiary-container: '#7285a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#ffb4a7'
  on-secondary-fixed: '#400200'
  on-secondary-fixed-variant: '#8b190b'
  tertiary-fixed: '#d4e3ff'
  tertiary-fixed-dim: '#b4c8e9'
  on-tertiary-fixed: '#061c36'
  on-tertiary-fixed-variant: '#354863'
  background: '#fef9f2'
  on-background: '#1d1b18'
  surface-variant: '#e6e2dc'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
  body-lg:
    fontFamily: Source Serif 4
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
  body-md:
    fontFamily: Source Serif 4
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 28px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  meta-sm:
    fontFamily: Source Serif 4
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
spacing:
  margin-desktop: 64px
  margin-mobile: 20px
  gutter: 24px
  column-count: '12'
  max-width: 1280px
---

## Brand & Style

This design system is built upon the principles of **Editorial Minimalism** and **Classical Authority**. It targets a discerning audience that values intellectual depth and clarity over sensationalism. The aesthetic balances the heritage of traditional broadsheets with the precision of modern digital interfaces.

The UI evokes a sense of permanence and reliability. It utilizes a high-contrast, text-first approach where whitespace is not merely an absence of content but a deliberate tool for focus. The visual narrative is structured, rigorous, and free from the ephemeral trends of modern SaaS design. It is a digital sanctuary for serious inquiry.

## Colors

The palette is anchored by a warm, paper-inspired background that reduces eye strain during long-form reading.

- **Primary:** A deep charcoal-black used for all high-value text and structural borders.
- **Background:** A sophisticated cream/off-white that provides a tactile, "analog" feel.
- **Accent:** A muted, heritage red used sparingly for categorizations, active states, and critical highlights.
- **Secondary Accent:** A slate blue reserved for financial data, charts, and secondary links to maintain a clear distinction from editorial highlights.
- **Surface:** Subtle variations of the cream base are used for cards or distinct sections to maintain tonal layering without breaking the monolithic paper feel.

## Typography

Typography is the core of the identity. The system uses a dual-serif approach for maximum readability, supported by a functional sans-serif for UI utility.

- **Headlines:** Use Playfair Display. It provides a sharp, high-contrast look that signals editorial importance.
- **Body:** Use Source Serif 4. Optimized for screen reading, its generous x-height and clear terminals ensure legibility over long sessions.
- **Labels & UI:** Use Inter. It provides a sterile, modern counterpoint to the serif fonts, used for navigation, buttons, and data labels to denote "interactable" vs "readable."

## Layout & Spacing

The layout is governed by a **strict 12-column fixed grid** that centers on larger screens. This creates the "columnar" feel of a physical newspaper.

- **Vertical Rhythm:** A strict 4px baseline grid ensures that text lines in adjacent columns align perfectly, maintaining a sense of structural integrity.
- **Margins:** Generous outer margins are essential to the premium feel, preventing the content from feeling "trapped" by the browser edges.
- **Desktop:** Multi-column layouts (e.g., 8-column main article, 4-column sidebar) are standard.
- **Mobile:** Elements reflow to a single column with increased leading and slightly reduced headline sizes.
- **Dividers:** Use hairline borders (0.5px to 1px) in the Primary color at 20% opacity to separate sections without adding visual weight.

## Elevation & Depth

This system rejects shadows in favor of **structural layering and borders**. 

- **Flat Depth:** Hierarchy is established through the use of solid lines and tonal shifts. Elements do not "float"; they are "printed" onto the surface.
- **Keyline Containers:** Use thin borders to define specific content modules or navigation bars.
- **Inverted Surfaces:** Important sections (like the "Front" navigation or breaking alerts) use the Primary color as a background with the Background color for text to create an immediate visual hierarchy through maximum contrast.
- **No Blurs:** Avoid all glassmorphism or blur effects, as they detract from the authoritative, static nature of the brand.

## Shapes

The shape language is **unapologetically sharp**. 

- **No Corner Radius:** All buttons, cards, images, and input fields must have 0px roundedness. This reinforces the architectural and journalistic tone of the system.
- **Image Treatment:** Photography should be framed in strict rectangular containers. 
- **Buttons:** Large, flat rectangles. Secondary buttons use a border-only "ghost" style.

## Components

### Buttons
- **Primary:** Solid Primary color (#1A1A1A) with Background color text. Sharp corners.
- **Secondary:** Transparent with 1px Primary color border. 
- **Text:** Underlined Serif text for editorial links, Sans-serif for UI actions.

### Cards & Article Previews
- **Layout:** Vertical stack (Image > Label > Headline > Byline).
- **Separator:** Each preview is separated by a horizontal hairline rule.
- **Spacing:** Generous padding (at least 32px) between blocks of content.

### Inputs
- **Style:** Underline-only inputs are preferred for search; 1px bordered boxes for forms. 
- **Labels:** Always use `label-caps` typography above the field.

### Navigation
- **Top Bar:** A centered masthead with `display-lg` typography.
- **Global Nav:** A horizontal list of `label-caps` links, separated by vertical hairlines.

### Data & Tables
- **Grid Lines:** Only horizontal lines to emphasize the row-based reading flow.
- **Font:** Numerical data should use Inter to ensure vertical alignment of digits.
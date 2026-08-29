---
version: alpha
name: Mono Devtools
description: Developer tools — near-black, lime accent, sharp radii, custom extension keys.
colors:
  primary: "#0A0A0A"          # core text (on dark)
  secondary: "#A1A1AA"        # muted gray text
  tertiary: "#A3E635"         # interaction (lime)
  neutral: "#0A0A0A"          # page background (true black)
  on-primary: "#0A0A0A"
  on-tertiary: "#0A0A0A"
  on-neutral: "#F4F4F5"
  surface-code: "#18181B"     # custom extension key (ignored by mapper)
  accent-soft: "#ECFCCB"      # custom extension key (ignored by mapper)
typography:
  h1:
    fontFamily: "JetBrains Mono"
    fontSize: 2.5rem
    fontWeight: 700
    lineHeight: 1.1
  body-md:
    fontFamily: "IBM Plex Sans"
    fontSize: 1rem
    lineHeight: 1.55
rounded:
  sm: 2px
  md: 4px
  lg: 6px
  full: 9999px
---
## Overview
Mono proves two things: (1) custom non-standard color keys are safely ignored,
and (2) sharp radii (2–6px) map cleanly to --radius.

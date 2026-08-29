---
version: alpha
name: Verdant Health
description: Eco / health — off-white + forest green, rounded, full token set with all on-* keys.
colors:
  primary: "#14532D"          # core text (deep forest)
  secondary: "#4ADE80"        # supporting (mint)
  tertiary: "#15803D"         # interaction (green)
  neutral: "#F0FDF4"          # page background (mist)
  on-primary: "#F0FDF4"
  on-secondary: "#052E16"
  on-tertiary: "#F0FDF4"
  on-neutral: "#14532D"
  border: "#BBF7D0"
typography:
  h1:
    fontFamily: "Fraunces"
    fontSize: 3.25rem
    fontWeight: 600
    lineHeight: 1.1
  h2:
    fontFamily: "Fraunces"
    fontSize: 2.25rem
    fontWeight: 600
  body-md:
    fontFamily: "Nunito"
    fontSize: 1.0625rem
    lineHeight: 1.65
  label-caps:
    fontFamily: "Nunito"
    fontSize: 0.8rem
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  sm: 8px
  md: 14px
  lg: 22px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.md}"
    padding: 14px
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 24px
---
## Overview
Verdant uses a complete token set including a custom border color, proving the
compiler honors explicit secondary/tertiary/on-* values over inference.

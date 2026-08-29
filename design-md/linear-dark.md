---
version: alpha
name: Linear Dark
description: Productivity SaaS — near-black canvas, signature indigo, token references used throughout.
colors:
  primary: "#E6E6E6"          # core text (light on dark)
  secondary: "#8A8F98"        # supporting text
  tertiary: "#5E6AD2"         # interaction (indigo)
  neutral: "#08090A"          # page background (near black)
  on-primary: "#08090A"
  on-tertiary: "#FFFFFF"
  on-neutral: "#E6E6E6"
typography:
  h1:
    fontFamily: "Inter"
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
  h2:
    fontFamily: "Inter"
    fontSize: 2rem
    fontWeight: 600
  body-md:
    fontFamily: "Inter"
    fontSize: 1rem
    lineHeight: 1.55
  label-caps:
    fontFamily: "Inter"
    fontSize: 0.75rem
    fontWeight: 600
    letterSpacing: "0.06em"
rounded:
  sm: 6px
  md: 8px
  lg: 12px
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
    rounded: "{rounded.sm}"
    padding: 10px
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 20px
---
## Overview
Linear Dark mirrors the canonical starter's component style, using {token}
references that the compiler must resolve before mapping (tertiary -> --primary).

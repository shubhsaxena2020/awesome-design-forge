---
version: alpha
name: Nimbus
description: Cloud-native SaaS — airy oklch palette, no explicit foregrounds (inferred at compile time).
colors:
  primary: "oklch(20% 0.02 250)"     # core text (dark ink)
  secondary: "oklch(55% 0.03 250)"   # supporting
  tertiary: "oklch(62% 0.18 250)"    # interaction (azure)
  neutral: "oklch(98% 0.005 250)"    # page background (near white)
typography:
  h1:
    fontFamily: "Geist"
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
  body-md:
    fontFamily: "Geist"
    fontSize: 1rem
    lineHeight: 1.6
rounded:
  sm: 6px
  md: 12px
  lg: 20px
  full: 9999px
---
## Overview
Nimbus leans on oklch for perceptually even scales; foreground colors are
deliberately omitted and resolved by the compiler via WCAG contrast.

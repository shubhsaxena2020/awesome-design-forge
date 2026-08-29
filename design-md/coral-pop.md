---
version: alpha
name: Coral Pop
description: Playful consumer — coral + sky, friendly radius, only primary/secondary/neutral given.
colors:
  primary: "#7F1D1D"          # core text (deep wine, readable on coral bg)
  secondary: "#0369A1"        # supporting (sky)
  tertiary: "#FB7185"         # interaction (coral)
  neutral: "#FFF5F3"          # page background (blush)
typography:
  h1:
    fontFamily: "Outfit"
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
  body-md:
    fontFamily: "Nunito"
    fontSize: 1.0625rem
    lineHeight: 1.6
rounded:
  sm: 10px
  md: 18px
  lg: 28px
  full: 9999px
---
## Overview
Coral Pop supplies just the four canonical color keys and lets the compiler
infer on-* foregrounds and the border, exercising the fallback path.

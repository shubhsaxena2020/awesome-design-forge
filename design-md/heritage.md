---
version: alpha
name: Heritage
description: Architectural minimalism meets journalistic gravitas — print-inspired editorial palette.
colors:
  primary: "#1A1C1E"          # core text / headlines
  secondary: "#6C7278"        # supporting text, borders
  tertiary: "#B8422E"         # interaction driver (terracotta)
  neutral: "#F7F5F2"          # page background
  on-primary: "#F7F5F2"
  on-tertiary: "#F7F5F2"
  on-neutral: "#1A1C1E"
typography:
  h1:
    fontFamily: "Public Sans"
    fontSize: 3.5rem
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Public Sans"
    fontSize: 2rem
    fontWeight: 600
    lineHeight: 1.15
  body-md:
    fontFamily: "Public Sans"
    fontSize: 1.0625rem
    lineHeight: 1.6
  label-caps:
    fontFamily: "Public Sans"
    fontSize: 0.75rem
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  sm: 4px
  md: 8px
  lg: 16px
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
    padding: 12px
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 24px
---
## Overview
Heritage pairs a near-black ink with warm paper and a single terracotta accent,
evoking broadsheet typography and museum signage.

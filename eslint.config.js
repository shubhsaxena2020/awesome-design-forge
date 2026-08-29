import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "dist-preview/**",
      "test-results/**",
      "coverage/**",
      "src/brands/ingested.ts",
      "src/brands/ingested-specs.ts",
      "**/*.gen.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      // The codebase intentionally uses `any` in a few parser bridges; keep it
      // honest but non-blocking rather than a blanket ban.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "warn",
      // console usage is acceptable in CLI/debug surfaces
      "no-console": "off",
      "no-debugger": "error",
    },
  },
);

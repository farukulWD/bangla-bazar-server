// @ts-check
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "uploads/**",
      "logs/**",
      ".playwright-mcp/**",
    ],
  },

  js.configs.recommended,

  // Deliberately the non-type-checked preset: type-aware rules would surface a
  // large backlog across the files carried over from the old JS server. This
  // catches real defects without turning lint into a migration project.
  ...tseslint.configs.recommended,

  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    rules: {
      // Underscore marks an intentionally unused binding — the common case
      // being `catch (_err)` and destructured-rest omissions.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Must stay last: turns off every rule Prettier owns.
  prettier,
);

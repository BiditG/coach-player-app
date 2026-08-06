import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["app/**/*.{ts,tsx}"],
  project: ["app/**", "components/**", "lib/**", "utils/**"],
  next: true,
  ignoreDependencies: [
    "prettier-plugin-tailwindcss",
    "eslint-plugin-sonarjs",
    "autoprefixer",
  ],
};

export default config;

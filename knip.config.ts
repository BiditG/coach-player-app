import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["app/**/*.{ts,tsx}"],
  project: ["app/**", "components/**", "lib/**"],
  next: true,
  // shadcn/ui components expose a full component API (variants, sub-parts
  // like DropdownMenuGroup, etc.) — many are unused in this starter today but
  // are meant to be used as the project grows. Not dead code to prune.
  ignore: ["components/ui/**"],
  ignoreDependencies: [
    // Drives commitlint.config.js (`@commitlint/config-conventional`); knip
    // doesn't detect the commit-msg hook wiring as usage.
    "@commitlint/cli",
    // No component tests yet, but this is the intended tool for them
    // (see tests/unit/**) — keep available rather than churn add/remove.
    "@testing-library/react",
  ],
};

export default config;

# Accessibility Testing with axe-core

axe-core detects WCAG accessibility violations in your pages.

## 1. Install

```bash
npm install -D @axe-core/cli
```

## 2. Run Against Dev Server

```bash
# Start your app
npm run dev &

# Test a page
npx axe http://localhost:3000 --exit
npx axe http://localhost:3000/dashboard --exit
```

`--exit` returns non-zero exit code on violations (useful for CI).

## 3. Programmatic Testing (Vitest)

```bash
npm install -D axe-core @testing-library/jest-dom
```

```typescript
// tests/a11y/home.test.ts
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';

describe('Home page accessibility', () => {
  it('should have no critical violations', async () => {
    const response = await fetch('http://localhost:3000');
    const html = await response.text();
    const dom = new JSDOM(html);

    const results = await axe.run(dom.window.document.documentElement);
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });
});
```

## 4. Key WCAG Checks

axe-core covers:
- Color contrast ratios (WCAG AA: 4.5:1 for text)
- Missing alt text on images
- Form labels and ARIA attributes
- Keyboard navigation (tab order, focus management)
- Heading hierarchy (no skipped levels)

## 5. CI Integration

Add to your CI pipeline:
```yaml
- name: Accessibility check
  run: |
    npm run dev &
    npx wait-on http://localhost:3000
    npx axe http://localhost:3000 http://localhost:3000/pricing --exit
```

## Resources

- https://github.com/dequelabs/axe-core
- https://www.deque.com/axe/
- https://www.w3.org/WAI/WCAG21/quickref/

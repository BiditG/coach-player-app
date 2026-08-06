import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Architecture fitness functions — enforce import boundaries.
// These tests prevent accidental coupling between layers.
// Adapt the rules below to your project structure.

function getFilesRecursively(dir: string, ext: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
            results.push(...getFilesRecursively(fullPath, ext));
        } else if (entry.name.endsWith(ext)) {
            results.push(fullPath);
        }
    }
    return results;
}

function checkImports(files: string[], forbiddenPattern: RegExp): string[] {
    const violations: string[] = [];
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^import/) && forbiddenPattern.test(lines[i])) {
                const rel = path.relative(process.cwd(), file);
                violations.push(`${rel}:${i + 1} — ${lines[i].trim()}`);
            }
        }
    }
    return violations;
}

describe('Architecture Layers', () => {
    it('utils/ should not import from app/', () => {
        const files = getFilesRecursively('utils', '.ts');
        const violations = checkImports(files, /from\s+['"]@\/app\//);
        expect(violations, `Utils importing from app:\n${violations.join('\n')}`).toHaveLength(0);
    });

    it('utils/ should not import from components/', () => {
        const files = getFilesRecursively('utils', '.ts');
        const violations = checkImports(files, /from\s+['"]@\/components\//);
        expect(violations, `Utils importing from components:\n${violations.join('\n')}`).toHaveLength(0);
    });

    it('components/ should not import directly from utils/db/', () => {
        const files = [
            ...getFilesRecursively('components', '.tsx'),
            ...getFilesRecursively('components', '.ts'),
        ];
        const violations = checkImports(files, /from\s+['"]@\/utils\/db\//);
        expect(violations, `Components importing from DB layer:\n${violations.join('\n')}`).toHaveLength(0);
    });
});

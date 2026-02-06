/**
 * Tests for Runtime Validator Hook
 *
 * Run with: bun test hooks/pre-tool-use/__tests__/runtime-validator.test.ts
 */

import { describe, test, expect } from 'bun:test';
import {
  splitCommandSegments,
  stripQuotedStrings,
  isException,
  checkSegment,
  loadRules,
} from '../runtime-validator';

// ============================================================================
// Load rules once for all tests
// ============================================================================

const { rules } = loadRules();

// ============================================================================
// splitCommandSegments
// ============================================================================

describe('splitCommandSegments', () => {
  test('splits on &&', () => {
    const result = splitCommandSegments('echo hello && node script.js');
    expect(result).toEqual(['echo hello', 'node script.js']);
  });

  test('splits on ||', () => {
    const result = splitCommandSegments('test -f file || node fallback.js');
    expect(result).toEqual(['test -f file', 'node fallback.js']);
  });

  test('splits on ;', () => {
    const result = splitCommandSegments('echo hello; node script.js');
    expect(result).toEqual(['echo hello', 'node script.js']);
  });

  test('handles multiple operators', () => {
    const result = splitCommandSegments('cd dir && npm install && npm run build');
    expect(result).toEqual(['cd dir', 'npm install', 'npm run build']);
  });

  test('does not split inside double quotes', () => {
    const result = splitCommandSegments('echo "hello && world"');
    expect(result).toEqual(['echo "hello && world"']);
  });

  test('does not split inside single quotes', () => {
    const result = splitCommandSegments("echo 'hello && world'");
    expect(result).toEqual(["echo 'hello && world'"]);
  });

  test('does not split inside backticks', () => {
    const result = splitCommandSegments('echo `hello && world`');
    expect(result).toEqual(['echo `hello && world`']);
  });

  test('handles single command', () => {
    const result = splitCommandSegments('bun script.js');
    expect(result).toEqual(['bun script.js']);
  });

  test('handles escaped characters', () => {
    const result = splitCommandSegments('echo "hello \\"world\\"" && bun test');
    expect(result).toEqual(['echo "hello \\"world\\""', 'bun test']);
  });

  test('trims whitespace from segments', () => {
    const result = splitCommandSegments('  echo hello  &&  bun test  ');
    expect(result).toEqual(['echo hello', 'bun test']);
  });

  test('filters empty segments', () => {
    const result = splitCommandSegments('echo hello &&  && bun test');
    expect(result).toEqual(['echo hello', 'bun test']);
  });
});

// ============================================================================
// stripQuotedStrings
// ============================================================================

describe('stripQuotedStrings', () => {
  test('strips double-quoted strings', () => {
    expect(stripQuotedStrings('echo "use node for this"')).toBe('echo ');
  });

  test('strips single-quoted strings', () => {
    expect(stripQuotedStrings("echo 'use node for this'")).toBe('echo ');
  });

  test('strips backtick strings', () => {
    expect(stripQuotedStrings('echo `node script.js`')).toBe('echo ');
  });

  test('handles multiple quoted segments', () => {
    expect(stripQuotedStrings('echo "hello" and "world"')).toBe('echo  and ');
  });

  test('preserves unquoted content', () => {
    expect(stripQuotedStrings('bun run script.js')).toBe('bun run script.js');
  });

  test('handles escaped quotes inside double quotes', () => {
    expect(stripQuotedStrings('echo "hello \\"node\\" world"')).toBe('echo ');
  });

  test('handles empty string', () => {
    expect(stripQuotedStrings('')).toBe('');
  });
});

// ============================================================================
// isException
// ============================================================================

describe('isException', () => {
  test('returns true when exception flag matches', () => {
    expect(isException('node -v', ['-v', '--version'])).toBe(true);
  });

  test('returns true for --version', () => {
    expect(isException('node --version', ['-v', '--version'])).toBe(true);
  });

  test('returns false when no exception matches', () => {
    expect(isException('node script.js', ['-v', '--version'])).toBe(false);
  });

  test('returns false for empty exceptions', () => {
    expect(isException('node script.js', [])).toBe(false);
  });

  test('returns false for undefined exceptions', () => {
    expect(isException('node script.js', undefined)).toBe(false);
  });

  test('matches python -c exception', () => {
    expect(isException('python3 -c "print(1)"', ['-c', '-V', '--version'])).toBe(true);
  });

  test('matches python -V exception', () => {
    expect(isException('python3 -V', ['-c', '-V', '--version'])).toBe(true);
  });
});

// ============================================================================
// checkSegment — should BLOCK
// ============================================================================

describe('checkSegment - blocks wrong runtimes', () => {
  test('blocks node script.js', () => {
    const result = checkSegment('node script.js', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('node-to-bun');
    expect(result!.replacement).toBe('bun');
  });

  test('blocks node path/to/script.ts', () => {
    const result = checkSegment('node path/to/script.ts', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('node-to-bun');
  });

  test('blocks node script.mjs', () => {
    const result = checkSegment('node script.mjs', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('node-to-bun');
  });

  test('blocks node script.mts', () => {
    const result = checkSegment('node script.mts', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('node-to-bun');
  });

  test('blocks npm install', () => {
    const result = checkSegment('npm install', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('npm-to-bun');
    expect(result!.replacement).toBe('bun');
  });

  test('blocks npm run build', () => {
    const result = checkSegment('npm run build', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('npm-to-bun');
  });

  test('blocks npm i', () => {
    const result = checkSegment('npm i lodash', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('npm-to-bun');
  });

  test('blocks npm test', () => {
    const result = checkSegment('npm test', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('npm-to-bun');
  });

  test('blocks npx package', () => {
    const result = checkSegment('npx create-react-app my-app', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('npx-to-bunx');
    expect(result!.replacement).toBe('bunx');
  });

  test('blocks python script.py', () => {
    const result = checkSegment('python script.py', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('python-to-uv');
    expect(result!.replacement).toBe('uv run');
  });

  test('blocks python path/to/script.py', () => {
    const result = checkSegment('python skills/brand/brand.py colors', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('python-to-uv');
  });

  test('blocks python3 script.py', () => {
    const result = checkSegment('python3 script.py', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('python3-to-uv');
    expect(result!.replacement).toBe('uv run');
  });

  test('blocks python -m module', () => {
    const result = checkSegment('python -m pytest', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('python-m-to-uv');
    expect(result!.replacement).toBe('uv run -m');
  });

  test('blocks python3 -m module', () => {
    const result = checkSegment('python3 -m http.server', rules);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('python-m-to-uv');
  });
});

// ============================================================================
// checkSegment — should ALLOW
// ============================================================================

describe('checkSegment - allows correct runtimes', () => {
  test('allows bun script.js', () => {
    expect(checkSegment('bun script.js', rules)).toBeNull();
  });

  test('allows bun test', () => {
    expect(checkSegment('bun test', rules)).toBeNull();
  });

  test('allows bun run build', () => {
    expect(checkSegment('bun run build', rules)).toBeNull();
  });

  test('allows bunx package', () => {
    expect(checkSegment('bunx create-next-app', rules)).toBeNull();
  });

  test('allows uv run script.py', () => {
    expect(checkSegment('uv run script.py', rules)).toBeNull();
  });

  test('allows uv run with --with flags', () => {
    expect(checkSegment('uv run --with mlx-audio script.py', rules)).toBeNull();
  });

  test('allows node -v', () => {
    expect(checkSegment('node -v', rules)).toBeNull();
  });

  test('allows node --version', () => {
    expect(checkSegment('node --version', rules)).toBeNull();
  });

  test('allows python3 -c "print(1)"', () => {
    expect(checkSegment('python3 -c "print(1)"', rules)).toBeNull();
  });

  test('allows python3 -V', () => {
    expect(checkSegment('python3 -V', rules)).toBeNull();
  });

  test('allows python3 --version', () => {
    expect(checkSegment('python3 --version', rules)).toBeNull();
  });

  test('allows echo "use node for this"', () => {
    expect(checkSegment('echo "use node script.js"', rules)).toBeNull();
  });

  test('allows echo with single quotes containing node', () => {
    expect(checkSegment("echo 'node script.js'", rules)).toBeNull();
  });

  test('allows git commands', () => {
    expect(checkSegment('git add -A', rules)).toBeNull();
  });

  test('allows ls commands', () => {
    expect(checkSegment('ls -la', rules)).toBeNull();
  });

  test('allows comments', () => {
    expect(checkSegment('# node script.js', rules)).toBeNull();
  });

  test('allows unrelated commands', () => {
    expect(checkSegment('date -j -f "%Y-%m-%d" "2026-01-01" "+%A"', rules)).toBeNull();
  });
});

// ============================================================================
// Compound commands
// ============================================================================

describe('compound commands', () => {
  test('catches node in second segment of &&', () => {
    const segments = splitCommandSegments('cd /tmp && node script.js');
    const violations = segments.map(s => checkSegment(s, rules)).filter(Boolean);
    expect(violations.length).toBe(1);
    expect(violations[0]!.ruleId).toBe('node-to-bun');
  });

  test('catches npm in compound with ||', () => {
    const segments = splitCommandSegments('test -f package.json || npm install');
    const violations = segments.map(s => checkSegment(s, rules)).filter(Boolean);
    expect(violations.length).toBe(1);
    expect(violations[0]!.ruleId).toBe('npm-to-bun');
  });

  test('catches multiple violations', () => {
    const segments = splitCommandSegments('npm install && node build.js');
    const violations = segments.map(s => checkSegment(s, rules)).filter(Boolean);
    expect(violations.length).toBe(2);
  });

  test('allows all-correct compound', () => {
    const segments = splitCommandSegments('bun install && bun run build');
    const violations = segments.map(s => checkSegment(s, rules)).filter(Boolean);
    expect(violations.length).toBe(0);
  });
});

// ============================================================================
// Edge cases
// ============================================================================

describe('edge cases', () => {
  test('does not match "nodejs" as "node"', () => {
    // The \\b boundary should prevent matching "nodejs" for the node pattern
    // but "nodejs" isn't a real command anyway — this just validates the regex
    expect(checkSegment('echo nodejs', rules)).toBeNull();
  });

  test('does not match "python" in paths', () => {
    // "cat /usr/bin/python" — python not at word boundary start
    expect(checkSegment('cat /usr/lib/python3.11/site.py', rules)).toBeNull();
  });

  test('handles heredoc-style commands', () => {
    const cmd = 'git commit -m "$(cat <<\'EOF\'\nuse node for this\nEOF\n)"';
    // The node inside the heredoc is in quotes, should not trigger
    expect(checkSegment(cmd, rules)).toBeNull();
  });

  test('handles empty command', () => {
    expect(checkSegment('', rules)).toBeNull();
  });

  test('handles whitespace-only command', () => {
    expect(checkSegment('   ', rules)).toBeNull();
  });
});

// ============================================================================
// loadRules
// ============================================================================

describe('loadRules', () => {
  test('loads rules config successfully', () => {
    const config = loadRules();
    expect(config.version).toBe('1.0.0');
    expect(config.rules.length).toBeGreaterThanOrEqual(5);
  });

  test('all rules have required fields', () => {
    const config = loadRules();
    for (const rule of config.rules) {
      expect(rule.id).toBeDefined();
      expect(rule.pattern).toBeDefined();
      expect(rule.replacement).toBeDefined();
      expect(rule.message).toBeDefined();
    }
  });

  test('all rule patterns are valid regex', () => {
    const config = loadRules();
    for (const rule of config.rules) {
      expect(() => new RegExp(rule.pattern)).not.toThrow();
    }
  });
});

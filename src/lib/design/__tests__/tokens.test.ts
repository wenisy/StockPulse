/**
 * 守护测试：tokens.ts 中的 SEMANTIC_COLOR_KEYS 必须与 globals.css 中的 :root
 * （实际即 [data-theme="light"]）和 [data-theme="dark"] 两处 CSS 变量声明完全一致。
 */
import fs from 'fs';
import path from 'path';
import { SEMANTIC_COLOR_KEYS } from '../tokens';

const CSS_PATH = path.resolve(process.cwd(), 'src/app/globals.css');

const extractVarNames = (cssText: string, blockHeader: RegExp): string[] => {
  const match = cssText.match(blockHeader);
  if (!match) return [];
  const block = match[0];
  const names = Array.from(block.matchAll(/--([a-z-]+):/g)).map((m) => m[1]);
  return Array.from(new Set(names));
};

describe('design tokens 一致性', () => {
  const css = fs.readFileSync(CSS_PATH, 'utf-8');

  // 提取 [data-theme="light"] 和 [data-theme="dark"] 块
  const lightBlock =
    css.match(/:root,\s*\[data-theme="light"\][^{]*\{[\s\S]*?\n\}/)?.[0] ?? '';
  const darkBlock =
    css.match(/\.dark,\s*\[data-theme="dark"\][^{]*\{[\s\S]*?\n\}/)?.[0] ?? '';

  const lightVars = Array.from(lightBlock.matchAll(/--([a-z-]+):/g)).map((m) => m[1]);
  const darkVars = Array.from(darkBlock.matchAll(/--([a-z-]+):/g)).map((m) => m[1]);

  it('所有 SEMANTIC_COLOR_KEYS 在 light 主题中都有声明', () => {
    for (const key of SEMANTIC_COLOR_KEYS) {
      expect(lightVars).toContain(key);
    }
  });

  it('所有 SEMANTIC_COLOR_KEYS 在 dark 主题中都有声明', () => {
    for (const key of SEMANTIC_COLOR_KEYS) {
      expect(darkVars).toContain(key);
    }
  });

  it('light 和 dark 声明的语义色键集合一致', () => {
    const lightSemantic = lightVars.filter((v) =>
      (SEMANTIC_COLOR_KEYS as readonly string[]).includes(v),
    );
    const darkSemantic = darkVars.filter((v) =>
      (SEMANTIC_COLOR_KEYS as readonly string[]).includes(v),
    );
    expect(new Set(lightSemantic)).toEqual(new Set(darkSemantic));
  });
});

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "prefer-const": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // 以下规则降级为 warning：项目既有代码已存在违例，等未来重构时再修，
      // 此处保留警告以避免新代码引入相同问题。
      "react/no-unescaped-entities": "warn",
      "react/display-name": "warn",
      "no-use-before-define": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    // CommonJS 配置文件与脚本：允许 require()
    files: ["*.js", "*.cjs", "scripts/**/*.js", "test-*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // 纯函数领域层：禁止依赖 React/Next/hooks/components
    // 见 openspec/specs/portfolio-domain（前后端职责分工）与提案
    // extract-portfolio-pure-logic 的 portfolio-codebase-layout spec。
    files: ["src/lib/**/*.ts", "src/lib/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "next", "next/*"],
              message:
                "src/lib/** 必须保持纯函数无依赖。React/Next 相关代码请放在 src/hooks/ 或 src/components/。",
            },
            {
              group: ["@/hooks/*", "@/components/*"],
              message:
                "src/lib/** 不得依赖 hooks 或 components（依赖方向应为 components → hooks → lib）。",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [".next/**", "out/**", "node_modules/**", "coverage/**"],
  },
];

export default eslintConfig;



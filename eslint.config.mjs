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
    ignores: [".next/**", "out/**", "node_modules/**", "coverage/**"],
  },
];

export default eslintConfig;



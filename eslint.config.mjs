import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**", // Prisma 自动生成
    "prisma/seed.ts",   // 种子脚本，独立运行
  ]),
  {
    rules: {
      // Vibe-coding 阶段宽松规则
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/no-deprecated": "off",
      // React 19 严格规则：useEffect 中异步 setState 是常见模式
      // (数据获取骨架屏)，降级为 warning
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;

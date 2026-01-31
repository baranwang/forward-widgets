---
"@forward-widget/danmu-universe": patch
---

refactor: 优化简繁转换打包体积
- 调整打包策略，通过 Tree Shaking 在 Lite 版本完全移除 opencc-js 依赖
- 修正 package.json exports 配置，现在可以通过 `/lite` 子路径正确访问精简版

# 通用弹幕插件 (Danmu Universe)

[![NPM Version](https://img.shields.io/npm/v/@forward-widget/danmu-universe)](https://www.npmjs.com/package/@forward-widget/danmu-universe)
[![License](https://img.shields.io/npm/l/@forward-widget/danmu-universe)](https://github.com/baranwang/forward-widgets)

一个通用的弹幕聚合插件，支持从多个主流视频平台获取弹幕数据，为 Forward 生态系统提供跨平台的弹幕服务

## 支持的平台

- [x] 腾讯视频
- [x] 优酷视频
- [x] 爱奇艺
- [x] 哔哩哔哩
- [x] 人人视频
- [x] 芒果 TV


## 安装使用

### 一键安装

[![Forward Widget](https://img.shields.io/badge/dynamic/json?url=http%3A%2F%2Funpkg.com%2F%40forward-widget%2Fdanmu-universe%2Fpackage.json&query=%24.version&prefix=%E9%80%9A%E7%94%A8%E5%BC%B9%E5%B9%95%20v&style=flat-square&label=Forward%20Widget&labelColor=black)](https://gocy.pages.dev/#forward://widget?url=https%3A%2F%2Funpkg.com%2F%40forward-widget%2Fdanmu-universe)

### 手动安装

在Forward Widget的模块管理中导入以下URL：

#### 完整版

```
https://unpkg.com/@forward-widget/danmu-universe 
```

#### 精简版

```
https://unpkg.com/@forward-widget/danmu-universe/lite 
```

## 开发

项目自豪的使用 [forward-widget-libs](https://github.com/baranwang/forward-widget-libs) 开发工具链

欢迎社区贡献，如果你想为项目做出贡献可按照以下流程：

### 环境要求

- Node.js >= 24
- pnpm >= 9

### 安装依赖

仓库根目录

```bash
pnpm install
```

### 开发模式

项目目录

```bash
pnpm dev
```

### 构建

```bash
pnpm build
```

### 测试

本地测试需要用到 TMDB 的 API，参考  `.env.example` 创建 `.env` 文件，令牌需要到 [TMDB](https://www.themoviedb.org/settings/api) 获取

```bash
pnpm test
```

### 提交

在仓库根目录执行 `pnpm changeset` 创建 changeset 文件，同时使用标准的 Conventional Commits 提交代码

## 鸣谢

- [misaka_danmu_server](https://github.com/l429609201/misaka_danmu_server)
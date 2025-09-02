# 通用弹幕插件 (Danmu Universe)

[![NPM Version](https://img.shields.io/npm/v/@forward-widget/danmu-universe)](https://www.npmjs.com/package/@forward-widget/danmu-universe)
[![License](https://img.shields.io/npm/l/@forward-widget/danmu-universe)](https://github.com/baranwang/forward-widgets)

一个通用的弹幕聚合插件，支持从多个主流视频平台获取弹幕数据。通过统一的API接口，为Forward Widget生态系统提供跨平台的弹幕服务。

## 支持的平台

- 🎬 **腾讯视频** (Tencent Video)
- 📺 **优酷视频** (Youku)
- 🎭 **爱奇艺** (iQiyi)
- 🎨 **哔哩哔哩** (Bilibili)

## 功能特性

- ✨ **多平台支持**: 统一接口访问多个视频平台的弹幕数据
- 🔍 **智能搜索**: 基于TMDB ID和豆瓣ID进行内容匹配
- ⚡ **高性能**: 支持分段加载和时间切片的弹幕获取
- 🛡️ **类型安全**: 完整的TypeScript类型定义
- 🎯 **精确定位**: 支持按时间点获取特定时段的弹幕
- 📦 **轻量级**: 优化的构建输出，最小化依赖

## 安装使用

### Forward Widget 模块管理

在Forward Widget的模块管理中导入以下URL：

```
https://unpkg.com/@forward-widget/danmu-universe
```

## 开发

### 环境要求

- Node.js >= 24
- pnpm >= 9

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
pnpm build
```

### 测试

```bash
pnpm test
```

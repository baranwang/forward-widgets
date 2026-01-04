# @forward-widget/danmu-universe

## 0.14.3

### Patch Changes

- b69c89a: 修正腾讯视频剧集页码计算逻辑并更新测试用例

## 0.14.2

### Patch Changes

- 6ed9b75: 修复腾讯视频抢先看获取失败的问题

## 0.14.1

### Patch Changes

- 08eb8a3: 修复腾讯视频剧集分页加载失败的问题

## 0.14.0

### Minor Changes

- d787c78: Forward 已具备原生 Trakt，插件移除 Trakt 同步能力

## 0.13.2

### Patch Changes

- 7ff0151: 修复不支持 settimeout 的问题

## 0.13.1

### Patch Changes

- 16c00cd: trakt 同步增加幂等校验

## 0.13.0

### Minor Changes

- ba2dec5: 新增 Trakt 播放记录同步

## 0.12.0

### Minor Changes

- 9721040: 支持自定义豆瓣书影音档案评论

## 0.11.0

### Minor Changes

- 6e79974: 新增实验性功能：自动同步豆瓣观看状态。

  开启该功能后，播放电影时会自动标记为“看过”，播放剧集时会自动标记为“在看”。

## 0.10.1

### Patch Changes

- 6daa297: 修复未配置弹幕过滤时弹幕被全部过滤的问题

## 0.10.0

### Minor Changes

- 9ba3a4e: 新增弹幕内容过滤功能
- 9ba3a4e: 增加弹幕内容聚合开关

## 0.9.1

### Patch Changes

- cb0468f: 修复豆瓣解析错误的问题

## 0.9.0

### Minor Changes

- a1d4626: 重构媒体匹配逻辑

### Patch Changes

- a1d4626: 修复爱艺奇剧集数据解析错误的问题

## 0.8.0

### Minor Changes

- 6808b3a: 优化腾讯视频剧集搜索逻辑

### Patch Changes

- 157d0c5: 修复爱奇艺综艺获取数据失败的问题

## 0.7.0

### Minor Changes

- 4c71476: 新增 360 影视搜索功能（实验性）

## 0.6.1

### Patch Changes

- cf464fa: 修复芒果 TV 弹幕时间分片计算错误的问题

## 0.6.0

### Minor Changes

- a93cc6c: 增加芒果 TV 视频搜索能力

## 0.5.1

### Patch Changes

- 7c2bba8: 修复优酷在 1.3.7 之后的版本请求加载错误的问题

## 0.5.0

### Minor Changes

- 5746cb7: 优化缓存策略
- 5746cb7: 优化黑名单过滤逻辑

## 0.4.0

### Minor Changes

- 01e469e: 新增未匹配到资源提示开关

## 0.3.1

### Patch Changes

- 896f9d3: 修正开发环境下的动漫标题配置

## 0.3.0

### Minor Changes

- 7c3a5bb: 人人视频新增弹幕模式选择，支持精选弹幕模式

## 0.2.1

### Patch Changes

- a5c0a71: 增加未匹配到资源提示
- 4bbabb6: 修复爱奇艺 emoji 表情未解析的问题

## 0.2.0

### Minor Changes

- 3dfe79c: 新增人人视频弹幕搜索功能

## 0.1.1

### Patch Changes

- 8659042: 修复爱奇艺部分剧集数据解析失败的问题

## 0.1.0

### Minor Changes

- 5dd0e5b: 增加模糊匹配功能，优化豆瓣信息搜索逻辑

## 0.0.16

### Patch Changes

- 51e4790: 修复弹幕加载失败的问题

## 0.0.15

### Patch Changes

- 26025cc: 修复剧集 IMDB 识别错误的问题

## 0.0.14

### Patch Changes

- 46a8a7b: 修复多季剧集匹配错误的问题

## 0.0.13

### Patch Changes

- 2177622: 修复爱艺奇电影数据加载失败的问题

## 0.0.12

### Patch Changes

- 0fed184: 恢复弹幕中的 CID 字段

## 0.0.7

### Patch Changes

- c0cf87d: 修复优酷陈年老剧数据格式不同的兼容性问题

## 0.0.6

### Patch Changes

- 3f0c1ff: 更新优酷抓取器以支持指定集数的获取，并优化分页逻辑

## 0.0.5

### Patch Changes

- e76afad: 将 Bilibili 抓取器中的评论 ID 转换为字符串格式
- be4d9b2: 优化弹幕处理逻辑，调整各个抓取器的评论获取方式
- fe7dcd8: 修复优酷弹幕加载失败的问题

## 0.0.4

### Patch Changes

- 132ba25: 优化 ID 取值逻辑，增强插件的稳定性

## 0.0.3

### Patch Changes

- b17e26a: 增强存储解析错误处理，调整测试用例以适应新逻辑
- b17e26a: 优化抓取器逻辑，更新腾讯和哔哩哔哩抓取器的 ID 处理方式

## 0.0.2

### Patch Changes

- edb0a63: 增强存储清理逻辑并添加错误处理

## 0.0.1

### Patch Changes

- f360362: 修复哔哩哔哩弹幕加载失败的问题

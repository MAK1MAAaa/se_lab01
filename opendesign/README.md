# OpenDesign 附加展示

通过工程根的本机 HTTP 服务打开 `http://localhost:8289/opendesign/`。查看器读取 `manifest.json`，作品位于 `mockups/cli-showcase/`。

`index.html` 按 OpenDesign 插件的初始化流程下载自 [官方查看器源码](https://github.com/manalkaff/opendesign/blob/main/skills/opendesign/viewer.html)，其 CSS/JS 均为内联，无外部 CDN 依赖。作品与生成数据的说明见 [回放设计说明](mockups/cli-showcase/README.md)。

本目录为辅助展示，不是作业 CLI 的运行依赖。页面只回放已有命令状态；在项目根执行 `npm run demo:build` 可重新生成快照和新版 SVG。

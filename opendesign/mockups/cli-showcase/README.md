# CLI 回放展示设计说明

- 目的：用真实命令执行后的 SVG 快照，直观展示创建、移动、撤销、重做及保存。
- 风格：克制的工程演示；浅色纸面画布、深墨色终端、沿用蓝橙节点色彩。
- 范围：辅助展示，不替换 CLI，不增加图形类型、set 属性白名单或服务端接口。
- 数据：`timeline.json`、九张 `assets/*.svg` 和 `examples/flowchart-polished.svg` 均由 `npm run demo:build` 经现有 CommandRunner、Editor 和 History 生成。
- 字体：SVG 从 `examples/flowchart-template.svg` 读取字体、字号与文本锚点；后续只执行任务书支持的命令。箭头由三条 line 组合，未引入额外类型。
- 回放：页面按预录阶段切换，按钮不会向 CLI 发送新命令。移动节点时独立连接线不自动跟随，保持原作业语义。
- 验证：生成器检查最终 10 个元素、节点位置、文本、文件读回及保存后的 undo 屏障；页面交互另行检查。

直接复现 SVG：

```sh
npm run cli -- --script examples/flowchart-polished.commands
```

重建所有回放数据：

```sh
npm run demo:build
```

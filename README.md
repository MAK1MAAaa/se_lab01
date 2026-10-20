# SVG 编辑器 CLI · Lab1 Phase 1

TypeScript 面向对象实现，支持六种 SVG 元素、嵌套分组、文件读写、逐命令撤销和重做。架构、设计模式、实际迭代与验证记录见 [doc/README.md](doc/README.md)，原始任务见 [phase_cli_1.md](phase_cli_1.md)。

## 运行

需要 Node.js 22 或更新版本。在项目根执行：

```sh
npm ci
npm run cli
```

交互提示符为 svg>，输入 help 查看命令，Ctrl+D 结束。脚本回放不显示提示符；遇到错误仍继续后续命令，最终退出码为 1。

```sh
npm run cli -- --help
npm run cli -- --script examples/flowchart.commands
npm run check
```

流程图脚本保存到项目根的 examples/flowchart.svg，可用浏览器打开。外部 SVG 示例为 [examples/other.svg](examples/other.svg)。

## 使用示例

```text
init 800 600
create g scene
create rect r1 10 20 100 50 #4a90d9 in scene
create text t1 20 50 "开始节点" in scene
move scene 30 10
set r1 fill #f5a623
undo
redo
tree
show r1
save drawing.svg
```

以 # 开头的行是注释，带空格文字使用双引号。id 大小写敏感且文档内唯一，图形命令通过 id 定位。

| 命令 | 语法 |
| --- | --- |
| 新建、读写 | `init [w] [h]` · `read <file.svg>` · `save [file.svg]` |
| 画布 | `canvas [w] [h]` |
| 创建 | `create <type> <id> [params…] [in <containerId>]` |
| 编辑 | `delete <id>` · `move <id> <dx> <dy>` · `scale <id> <factor>` · `set <id> <attr> <value>` |
| 结构 | `group <newGid> <id1> <id2>…` · `ungroup <gid>` · `addto <gid> <id>` |
| 层叠 | `front <id>` · `back <id>` |
| 显示 | `tree [id]` · `show <id>` · `help` |
| 历史 | `undo` · `redo` |

| type | create 的 params |
| --- | --- |
| rect | `<x> <y> <w> <h> [fill]` |
| circle | `<cx> <cy> <r> [fill]` |
| ellipse | `<cx> <cy> <rx> <ry> [fill]` |
| line | `<x1> <y1> <x2> <y2> [stroke]` |
| text | `<x> <y> "content"` |
| g | 无 |

set 支持 fill/stroke/stroke-width、对应类型的几何属性，以及 text 的 text 内容。画布宽高、缩放因子须有限且为正；形状尺寸和 stroke-width 可为零。省略 fill/stroke 时遵循 SVG 默认值。

一次编辑对应一个 undo 单元；成功 init/read/save 或修改 canvas 后禁止撤销重做，直到下一次编辑。无参数 save 需要先读入或成功保存过路径，初次保存请指定文件名。错误以 error: 开头，失败命令不改变当前文档和历史。

## 实现边界

只支持 rect/circle/ellipse/line/text/g，不实现 box、插件加载、path、tspan 或完整 SVG/CSS。输入要求 SVG 命名空间；根尺寸支持无单位数值或 px。缺 id 自动补名并警告，未知元素和畸形输入报错。

transform、字体属性、根 viewBox 等可保留，几何操作使用局部坐标。group/addto/ungroup 不重算世界坐标或补偿父级样式，重挂后可能改变视觉效果；scale 不修改 font-size 等样式。group 在画布根末尾创建并按原树顺序收编；按任务约定，根级组禁止 ungroup。

npm run check 包含严格类型检查、行为测试与构建，最终结果及 Git 状态见 [工程记录](doc/README.md)。

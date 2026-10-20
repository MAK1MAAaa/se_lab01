# Phase 1 需求复核报告

复核日期：2026-10-20。依据 [任务原文](../phase_cli_1.md)、[架构与过程记录](README.md)、代码、行为测试和 Git 引用核对。原交付基准为 `fa00319`；本次工作树另修复默认保存路径与 XML CR 字符往返两项缺陷。六类图形、全部要求命令、OO/Composite/Command、两处分派、四段文档和原基准的分步提交/远程 final 均有证据支持；截止时间未提供，不能判断是否按期。

## 验收矩阵

“满足”指表中代码和已执行证据覆盖该要求，不表示穷尽所有输入或具有 100% 测试覆盖率。源码和测试路径均相对工程根；测试简称 E/C/S 分别对应 [editor.test.ts](../tests/editor.test.ts)、[cli.test.ts](../tests/cli.test.ts)、[svg-codec.test.ts](../tests/svg-codec.test.ts)。

| 要求 | 结论 | 文档章节 | 实现位置 | 验证证据 |
| --- | --- | --- | --- | --- |
| Markdown 提交文档及模块职责、PlantUML | 满足 | [模块划分与职责](README.md#模块划分与职责) | doc/README.md；src 四层目录 | 文件与图代码块实际存在，模块与源码目录对应 |
| Command 必须落地，说明其他模式 | 满足 | [设计模式如何落地](README.md#设计模式如何落地) | application/Command、EditCommand、commands；domain/Group | E：一命令撤销、分组/删除恢复、命令实例不可复用 |
| 依赖规则、变化点及不预留理由 | 满足 | [依赖方向规则](README.md#依赖方向规则)、[变化点假设](README.md#变化点假设) | 四层 import；SvgRepository 端口 | 42 个源文件、123 条内部导入，0 方向违规 |
| 过程记录、一致性两问与质量保证 | 满足 | [过程记录](README.md#过程记录)、[一致性自查](README.md#一致性自查)、[质量保证手段](README.md#质量保证手段) | 文档对应表格及测试集 | 记录已发现问题与修正；未虚构人工审阅或覆盖率 |
| TypeScript OO、封装、一类一文件 | 满足 | [模块划分](README.md#模块划分) | domain/Shape 与六类；application 命令类 | 静态核对类名/文件名，无多类文件或命名违规；严格类型检查见基准结果 |
| 仅命令与图形工厂按名分派，标注待重构 | 满足 | [依赖方向规则](README.md#依赖方向规则) | presentation/CommandParser；domain/ShapeFactory | 静态检索无额外 switch/type 名称比较分派；文档标注插件阶段重构 |
| REPL、svg>、注释、双引号和错误前缀 | 满足 | [根 README：运行](../README.md#运行) | presentation/Cli、Tokenizer、CommandRunner | C：交互/EOF、单行错误后继续；E：注释、颜色、引号内容 |
| 唯一且大小写敏感 id，缺 id 补名警告 | 满足 | [数据与 SVG 语义决策](README.md#数据与-svg-语义决策) | domain/SvgDocument；infrastructure/SvgCodec | E：大小写、重复 id、根 id；S：预留全部显式 id 后补名 |
| init/read/save，默认保存到读入路径 | 满足，已修复 | [保存路径决策](README.md#数据与-svg-语义决策) | application/Editor；commands/Init、Read、SaveCommand | E：original→copy→无参 save 仍写 original；首次成功 save 建默认、重新 read/init 与失败保存 |
| canvas 查询/修改、默认 800×600 | 满足 | [根 README：使用示例](../README.md#使用示例) | domain/SvgDocument；commands/Canvas、InitCommand | E：默认文档、尺寸修改、非法 resize 不变、查询保留 redo |
| 六类 create 与可选 in、默认样式 | 满足 | [根 README：参数表](../README.md#使用示例) | domain/ShapeFactory、六类；commands/CreateCommand | E：六类及几何展示、fill/stroke 缺省、in 必须为现有 g |
| Composite move/scale/set 与白名单 | 满足 | [模式](README.md#设计模式如何落地)、[语义决策](README.md#数据与-svg-语义决策) | domain/Shape、Group、TextShape；对应命令 | E：递归几何/线端点、text 内容、组样式、非正缩放/非法属性与溢出 |
| delete/group/ungroup/addto | 满足 | [数据与 SVG 语义决策](README.md#数据与-svg-语义决策) | domain/SvgDocument、Group；对应命令 | E：跨父 DFS 顺序、祖孙/循环拒绝、根级解组拒绝、嵌套就地提升、整树删除恢复 |
| front/back 同级层叠顺序 | 满足 | [数据与 SVG 语义决策](README.md#数据与-svg-语义决策) | SvgDocument.bringFront/sendBack；Front、BackCommand | E：只调整兄弟节点且 undo/redo 精确恢复 |
| tree/show/help 与摘要属性 | 满足 | [根 README：命令表](../README.md#使用示例) | application/TreeFormatter；Tree、Show、HelpCommand | E：树、父级、几何与文字；C：--help 不等待输入 |
| undo/redo 粒度、分支清空、IO 屏障 | 满足 | [设计模式如何落地](README.md#设计模式如何落地) | application/Editor、EditCommand、History | E：一次编辑一单元、新编辑清 redo、显示不入栈、成功 IO 屏障与失败保留历史 |
| 错误不改变状态，文件错误明确 | 满足 | [质量保证手段](README.md#质量保证手段) | Editor 副本事务；Shape 预校验；LocalSvgRepository | E：非法参数/结构/IO 不变；S：读写失败、原子替换与临时文件清理 |
| SVG save/read、文本与属性保留 | 满足，已补 CR 回归 | [语义决策](README.md#数据与-svg-语义决策)、[过程记录](README.md#过程记录) | infrastructure/SvgCodec | S：六类嵌套、Unicode/XML 转义、root/transform、CR/CRLF 及属性空白重复往返 |
| Git 分步、远端、最终标签 | 分步提交与标签保留；交付引用查 Git | [质量保证手段](README.md#质量保证手段) | .git；GitHub MAK1MAAaa/se_lab01 | 保留原 5 次提交和本次增量；原交付保存为 phase1-before-review，final 指向本次最后提交；用远端 refs 核对 |
| final 在截止前完成 | 无法核验 | 本报告结论 | 原任务只提截止要求，未给日期 | 原 final 时间为北京时间 2026-10-20 18:04:21；无法与未知截止比较 |

## 本轮修复与验证状态

1. 原实现每次成功 save 都切换默认路径，read original.svg → save copy.svg → save 会再次写副本。现保留读入路径；新文档第一次成功保存建立默认路径，之后保存副本不改变它；成功 read 重设，init 清空。新增两项应用回归。
2. 合法 text 中的 CR 字符引用原先可能被序列化成原始 CR，后续 XML 解析归一化成 LF。现保存 CR 的字符引用，同时保留属性中需引用的空白；新增一项 SVG 回归，验证内容及重复往返稳定。

本轮 `npm run check` 的严格类型检查、34 项行为测试和生产构建全部通过：22 项应用、4 项 CLI、8 项 SVG/文件测试。核心模块仍为 42 个源文件、123 条内部导入。原远端已核验，新增交付的最终引用以 `git ls-remote origin` 为准。

## 范围与限制

box/插件、完整 SVG/CSS、世界坐标补偿不属于本阶段；现有 transform 和父级继承样式重挂后可能改变视觉效果，详见架构文档。未做人工浏览器验收、覆盖率统计或截止合规认定。OpenDesign 蓝橙流程图与命令回放页属于附加展示，不替换 CLI，不影响本表 Phase 1 必需功能结论。九个状态均由原有命令生成，新版脚本可直接用 `npm run cli -- --script examples/flowchart-polished.commands` 复现。

---
layout: post
title: Slidev——为开发者打造的演示文稿工具
date: 2025-07-17
updated: 2025-07-17
tags: 
  - Slidev
categories: 小教程
cover: https://cdn.yuumi.link/images/slidev/slidev.png
excerpt: 🥺回来吧我的Slide🥺 ☀️我最骄傲的帮手☀️ ⚡历历在目的PPT⚡ 😭眼泪莫名在流淌😭
hide: true
---

在久远的过去，还在使用 Hexo 框架编写博客时，就被 [Slide](https://www.yuumi.link/posts/pageBuilding#%E5%B9%BB%E7%81%AF%E7%89%87) 这样简洁高效、便于展示代码的幻灯片，深深吸引（？）。更新到 [Valaxy](https://www.yuumi.link/posts/valaxy) 框架后，云游君卸载了主题中的Slide组件，而推荐大家使用更为强大的 [Slidev](https://cn.sli.dev/)。

究竟是怎样的 Slide 项目，甚至能成为大佬们框架开发的参考？[为什么选择Slidev？](https://cn.sli.dev/guide/why)这下不得不深入♂探索一下了。尽管我并没有很多演示文稿需要做，制作幻灯片的频率可以说是非常低，但是不能没有！

- 官方文档：[Slidev](https://cn.sli.dev/)
- 项目地址：[slidev](https://github.com/slidevjs/slidev)
- 项目演示：[Slidev-test](https://slides.yuumi.link/slidev-test/)

## 创建 Slidev

### 环境配置

首先需要安装 [Node.js](https://nodejs.org/en) 版本 ≥ `18.0`，推荐在 Linux 系统配置环境<span class="bg-$smc-c-text hover:bg-$va-c-bg transition">（因为 Node.js 在 Windows 下的版本控制太麻烦了（）</span>。

::: details 使用 Nodesource

使用 [Nodesource](https://deb.nodesource.com/) 快速安装（[选择版本快速安装](https://nodesource.com/products/distributions)）

::: code-group

```bash [curl]
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
```

```bash [apt]
sudo apt-get install -y nodejs
```

:::

::: details 使用 NVM node版本管理器

- [安装 nvm最新版本](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating) （目前为 `v0.40.3`）

	::: code-group
	
	```bash [curl]
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
	```

	```bash [wget]
	wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
	```
	
	:::
	
	重启终端，或使用以下命令激活 nvm：

	```bash
	source ~/.bashrc
	```

	验证安装：

	```bash
	nvm --version
	```

	如果安装成功，将输出nvm版本号。

- 使用 nvm 安装 Node.js

	列出可用的 Node.js 版本：

	```bash
	nvm list-remote
	```

	选择安装特定版本的 Node.js （如 `v22.17.0` ）：

	```bash
	nvm install 22.17.0
	```

	切换 Node.js 版本（如 `v22.17.0` ）：

	```bash
	nvm use 22.17.0
	```

	查看当前使用的 Node.js 版本：

	```bash
	nvm current
	```

- 其他常用命令

	列出已安装的 Node.js 版本：

	```bash
	nvm list
	```

	删除不想要的 Node.js 版本（如 `v22.17.0`）：

	```bash
	nvm uninstall 22.17.0
	```

	设置指定版本为默认版本（如 `v22.17.0`）：

	```bash
	nvm alias default 22.17.0
	```

:::

### 创建 Slidev 项目

在终端运行以下命令，以在当前文件夹创建 Slidev 项目。

::: code-group

```bash [npm]
npm init slidev@latest
```

```bash [pnpm]
pnpm create slidev
```

```bash [yarn]
yarn create slidev
```

:::

根据提示输入 Slidev  项目名；询问是否安装并启动，输入 `y`；按↑↓键选择包管理器（建议选择pnpm，快速且无冲突）。看到这样的提示后，浏览器打开链接能正常显示幻灯片，即为创建成功！

![install](https://cdn.yuumi.link/images/slidev/install.png)

![welcome](https://cdn.yuumi.link/images/slidev/welcome.png)

::: details pnpm: Ignored build scripts

为了防止恶意代码执行，pnpm会默认禁止依赖包在安装时自动执行构建脚本，因此我们需要手动选择包构建脚本。

![warning](https://cdn.yuumi.link/images/slidev/warning.png)

先按 Ctrl+C 退出当前运行程序，进入刚刚创建的项目文件夹（此处为slidev-test）。按 `a` 选择所有包，再按 `y` 确认即可。

![approve-builds](https://cdn.yuumi.link/images/slidev/approve-builds.png)

:::

### 基本命令

Slidev 有一个属于自己的命令行工具 [@slidev/cli](https://cn.sli.dev/builtin/cli#dev)，基本的操作都可以通过 `slidev` 命令完成。以下是一些常用的命令：

- `slidev` - 启动开发服务器。
- `slidev export` - 将幻灯片导出为 PDF、PPTX 或 PNG 文件，详见[导出](https://cn.sli.dev/guide/exporting)。
- `slidev build` - 将幻灯片构建为静态网页，详见[部署](https://cn.sli.dev/guide/hosting)。
- `slidev --help` - 显示帮助信息

创建 slidev 项目时，会在根目录自动创建 `./package.json` 文件。将 `slidev` 命令添加到 `./package.json` 的 `scripts` 字段中，就可以更方便地运行这些命令：

```json [package.json]
{
  "scripts": {
    "build": "slidev build",
    "dev": "slidev --open",
    "export": "slidev export"
  },
}
```

::: code-group

```bash  [npm]
npm run dev
npm run build
npm run export
```

```bash [pnpm]
pnpm dev
pnpm build
pnpm export
```

```bash [yarn]
yarn dev
yarn build
yarn export
```

:::

### VS Code 扩展

可以在 vscode 中添加 Slidev 的扩展，来更方便地开发、预览幻灯片。详情见：[VS Code扩展](https://cn.sli.dev/features/vscode-extension)。

![vsc-ex](https://cdn.yuumi.link/images/slidev/vsc-ex.png)

## 编辑幻灯片

Slidev 使用 Markdown 来编写幻灯片，主文件是根目录下的 `./slides.md`，支持基本的 Markdown 语法和功能。下面介绍一些我常用的 Slidev 配置和功能。

### 分隔幻灯片

在下一页幻灯片前需要添加上下两侧留有空行的 `---` 作为分隔符：

```markdown {5,11}
# Title

Hello, **Slidev**!

---

# Slide 2

第二页幻灯片

---

# Slide 3

第三页幻灯片
```

![add-slide](https://cdn.yuumi.link/images/slidev/add-slide.png)_分隔幻灯片效果_

### 幻灯片样式

可以在每页幻灯片的开头配置 YAML 格式的 Frontmatter，来设置这张幻灯片的格式。比较特殊的是，第一个 Frontmatter 称为 Headmatter，可以用来配置整个幻灯片。

Frontmatter 以分隔符开头、结尾，因此设置了 Frontmatter 后不需要再额外添加分隔符。

在 vscode 中，鼠标悬停在属性上可以看到相应的描述、文档和可选项。详细的配置细节可以看这里：[自定义](https://cn.sli.dev/custom/)。

- theme：[幻灯片主题](https://cn.sli.dev/guide/theme-addon#use-theme)
- layout：[幻灯片布局](https://cn.sli.dev/guide/layout)

```markdown {1-4,12-17,25}
---
theme: seriph
title: Welcome to Slidev
---

# 第一页

第一页的 frontmatter 也是整个演示文稿的 headmatter

幻灯片主题为 seriph，标题为 Welcome to Slidev

---
layout: center
background: /background-1.png
class: text-red
transition: fade-out
---

# 第二页

本页的布局是 `center`，背景是一张图片

除标题外的文字颜色为红色，以淡出的效果切换到下一页幻灯片

---

# 第三页

本页没有 frontmatter
```

![frontmatter](https://cdn.yuumi.link/images/slidev/frontmatter.png)_幻灯片配置效果_

### 代码块

在 Slidev 中可以高自由度的展示代码，如下使用 Markdown 语法来高亮代码块：

````markdown
```ts
console.log('Hello, World!')
```
````

![code](C:/Users/Yuumi/Downloads/slide/code.png)

更多功能需要使用 [Shiki](https://github.com/shikijs/shiki) 语法高亮器来达成。

::: details 如果没有安装Shiki，可以运行以下命令进行安装：

::: code-group

```bash [npm]
npm install -D shiki
```

```bash [pnpm]
pnpm add -D shiki
```

```bash [yarn]
yarn add -D shiki
```

:::

#### 行号



#### 代码块最大高度



#### 高亮代码行



#### monaco代码编辑器



#### 引入幻灯片



### 幻灯片动画



## 导出

导出为PDF



## 编译和部署

### 编译并部署



### 多子项目

将多个幻灯片放在一个项目中管理


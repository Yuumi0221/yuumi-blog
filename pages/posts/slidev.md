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

# 创建 Slidev

## 环境配置

首先需要安装 [Node.js](https://nodejs.org/en) 版本 ≥ `18.0`，推荐在 Linux 系统配置环境<span class="bg-$smc-c-text hover:bg-$va-c-bg transition">（因为 Node.js 在 Windows 下的版本控制太麻烦了（）</span>。

::: details 使用 Nodesource

使用 [Nodesource](https://deb.nodesource.com/) 快速安装（[选择版本快速安装](https://nodesource.com/products/distributions)）

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
```

```bash
sudo apt-get install -y nodejs
```

:::

::: details 使用 NVM node版本管理器

- [安装 nvm最新版本](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating) （目前为 `v0.40.3`）

	```bash
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
	```

	```bash
	wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
	```

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

## 创建 Slidev 项目

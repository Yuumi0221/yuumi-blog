---
layout: post
title: 超可爱！使用 Valaxy 搭建自己的博客
date: 2023-03-29
updated: 2023-06-01
tags: 
  - Blog
  - Valaxy
categories: 小教程
cover: https://cdn.yuumi.link/images/valaxy/valaxy.png
excerpt: 重磅更新！！！
---

::: warning BREAKING NEWS!!!

Yuumi's Blog 重磅更新！！！
已由 [Hexo](https://hexo.io/zh-cn/index.html) 转为 [Valaxy](https://valaxy.site/) 框架！！！

:::

::: details 前情提要

在[《从零开始的建博客生活》](https://www.yuumi.link/posts/pagebuilding)中也提到过，搭建博客最初了解到的就是 Hexo 这个框架。因为其搭建速度快、支持Markdown，还有超多[主题](https://hexo.io/themes/)来挑选，我直接就 `npm install` 了。在浏览 Hexo 主题橱窗的时候我一眼相中了 [Yun 主题](https://yun.yunyoujun.cn/)，挑来挑去最后还是决定用这个，于是这个博客便诞生了！

> 不用绞尽脑汁也能搭建一个看起来超清新可爱的博客，多是一件美事啊！

在对主题加工自定义时，总会出现这样那样的小问题。曾经不知道该怎么改代码的时候，我直接去 Yun 主题的 github 提了问题。万万没想到云游君回复超级快，瞬间解决了我的问题！我直接一个感谢大佬并加入粉丝群成为小云的忠实老粉（？）。

后来偶然间看到的群消息，云游君整了个新博客框架，可以直接热更新！也就是说，修改了文章或配置后，按一下保存键，更新就会直接显示在预览上，不需要重新构建！光是这一点就足够令人心动了，还有编辑时的类型注释提示、超快构建、高自由度定制等等。[为什么选 Valaxy？](https://valaxy.site/guide/why#Why%2520Valaxy)我想作者本人肯定更会夸！

因为自己的电脑不停犯病，在搭建 Valaxy 时我备受环境配置等等问题的折磨。这回遇到解决不了的问题也是直接去请教了云游君，我的博客在他的帮助下完美重生了！！🎉🎉🎉

:::

出于各种理由，我想记录下自己的迁移过程和踩过的坑。为了让编程零经验的小白也能看懂，我会努力写得很详细。不论是第一次搭建博客的小白，还是从 Hexo 迁移的大佬，都希望这篇文章能够帮到你！

- 官方文档：[Valaxy](https://valaxy.site/)
- 项目地址：[YunYouJun/valaxy](https://github.com/YunYouJun/valaxy)
- 云主题：[Valaxy-Theme-Yun](https://github.com/YunYouJun/valaxy/tree/main/packages/valaxy-theme-yun)



## [创建 Valaxy](https://valaxy.site/guide/getting-started#%25E5%2588%259B%25E5%25BB%25BA-valaxy-%25E9%25A1%25B9%25E7%259B%25AE)

### 环境配置

首先需要拥有 [Node.js](https://nodejs.org/en) 版本 16+ 的环境才可使用 Valaxy。可以在命令行中使用以下命令来查看 Node 版本：

```shell
node -v
```

::: details 小白看这里

怎么打开命令行？如果是 windows 用户，有几种办法：

1. 按下 win+R 键打开运行，输入“cmd”，回车打开
2. 打开“开始”菜单，搜索框中输入“cmd”，回车打开“命令提示符”
3. 双击资源管理器（文件夹）上面的地址栏，输入“cmd”，回车打开

怎么进入想创建项目的文件夹？以 D:\blog\valaxy 为例：

1. 命令行中输入 `d:` 回车
2. 输入 `cd D:\blog\valaxy` 回车

之后的命令操作均在命令行中完成

:::

### 创建 Valaxy 项目

进入博客文件夹（路径地址尽量全英文，不能有空格，不然你就有难了！），使用 `npm`、`pnpm` 或 `yarn` 命令来创建 Valaxy 项目。推荐使用 `pnpm` 命令，比较快：

```shell
# 安装pnpm
npm i -g pnpm
# 创建valaxy项目
pnpm create valaxy
```

![image-20230330165419875](https://cdn.yuumi.link/images/valaxy/image-20230330165419875.png)

按提示输入博客文件夹名，默认为 `valaxy-blog`。此处使用 `yuumi-blog` ：

![image-20230330165618631](https://cdn.yuumi.link/images/valaxy/image-20230330165618631.png)

提示创建了 yuumi-blog 的文件夹。询问是否安装，输入 `y`：

![image-20230330165726650](https://cdn.yuumi.link/images/valaxy/image-20230330165726650.png)

按上下方向键选择安装使用的代理，这里选择 pnpm，回车：

![image-20230330165930884](https://cdn.yuumi.link/images/valaxy/image-20230330165930884.png)

当当！非常快地创建好了！（有一些幽灵提示不用管）输入 `o` 自动打开预览网页：

![image-20230330170240741](https://cdn.yuumi.link/images/valaxy/image-20230330170240741.png)

输入 `e` 自动打开 vscode，就可以愉快地编辑啦！

::: details 小白看这里

什么是vscode？

[Visual Studio Code](https://code.visualstudio.com/)，超级方便的代码编辑器，建议<span class="bg-$smc-c-text hover:bg-$va-c-bg transition">人手一个</span>用它来编辑网站的配置。

:::

### 常用命令

如果出现了一些bug，可以考虑删除 node_modules 文件夹，再使用以下命令重新安装依赖：

```shell
pnpm install
```

编辑完保存后，在命令行按 ctrl+C 关闭运行。再次启动预览命令：

```shell
pnpm dev
```

升级命令（按空格选择，按上下键切换，按 A 全选，按回车开始更新）：

```shell
pnpm up --latest -i
```



## 编辑配置

### 目录结构

初次配置完后，基本上只需要在 `pages` 文件夹下进行工作，编写文章。

- `pages`: 所有页面 
	- `posts`: 博客文章，文件格式为markdown，推荐使用 [Typora](https://typora.io/) 或 VSCode 编辑
- `public`: 静态资源文件夹（如图片），可以直接在文章中引用
- `styles`: 覆盖主题样式，文件夹下的 index.xxx 文件将会被自动加载 
	- `index.ts`
	- `vars.scss`
- `components`: 自定义你的组件（将会被自动注册）
- `layouts`: 自定义布局 (譬如可以通过 `layout: xxx` 来使用 `layouts/xxx.vue` 布局)
- `locales`: 自定义国际化关键词
- `valaxy.config.ts`: 用户配置文件
- `site.config.ts`: 站点配置文件

### valaxy.config.ts

使用 VSCode 编辑时，将鼠标悬停在变量名上就可以查看注释，也可以参考 [krau 大佬的教程](https://krau.top/posts/hexo-migrate-to-valaxy#%E4%BF%AE%E6%94%B9%E9%85%8D%E7%BD%AE)，因此大部分内容就不做解释了，可以自己改一改看看预览网页的变化。这里只讲一些样例中没有提到的：

#### 图标

在 https://icones.js.org/ 可以查找你想要的图标，复制名字即可食用。

#### 主题配置

##### 顶部按钮

与回到主页相对的按钮也可以修改为别的页面。如修改为幻灯片 slides 页面：

```typescript [valaxy.config.ts]
	menu: {
      custom: {
        title: 'menu.slides',
        url: '/slides/',
        icon: 'i-ri-keynote-line'
      }
    },
```

- `menu.slides` 指在 `locales` 文件夹中设置的国际化关键词

	```yaml [locales\zh-CN.yml]
	menu:
	  slides: 幻灯片
	```

	```yaml [locales\en.yml]
	menu:
	  slides: Slides
	```

- `/slides/` 指新页面的文件路径，完整路径为"blog-name/pages/slides"，其中需要添加 `index.md` 文件，可以参考 pages 下其他文件夹进行编辑

##### 网站背景图片

```typescript [valaxy.config.ts]
	bg_image: {
      enable: true,
      url: "https://xxx.xxxx",	// 白日模式背景
      dark: "https://xxx.xxxx",	// 夜间模式背景
    },
```

##### 首页的中二语句

```typescript [valaxy.config.ts]
	say: {
      enable: true,
      api: "https://el-bot-api.vercel.app/api/words/young",
      hitokoto: {
        enable: true,
        api: "https://v1.hitokoto.cn/?c=k&c=d&c=i",
      },
    },
```

- [句子类型](https://developer.hitokoto.cn/sentence/#%E5%8F%A5%E5%AD%90%E7%B1%BB%E5%9E%8B-%E5%8F%82%E6%95%B0)：修改api连接后的 `c=*`

##### 主题色

```typescript [valaxy.config.ts]
	colors: {
      primary: "#D69B54",
    },
```

##### 鼠标点击特效

```typescript [valaxy.config.ts]
	fireworks: {
      enable: true,
      colors: ['#FFE57D', '#FFCD88', '#E6F4AD']
    },
```

##### 页脚

```typescript [valaxy.config.ts]
	footer: {
      since: 2021,
      icon: {
        enable: true,
        name: 'i-ri-heart-line',
        animated: true,
        color: '#d69b54',
        url: 'https://yuumi.link',	//图标链接
        title: '回到首页'		//鼠标悬停注释
      },
      beian: {
        enable: true,
        icp: 'xxxx',	// 备案
      },
    },
```

#### 插件

##### 评论区（Waline）

安装依赖

```shell
pnpm add valaxy-addon-waline
```

加载插件

```typescript [valaxy.config.ts]
import { defineValaxyConfig } from 'valaxy'
import { addonWaline } from "valaxy-addon-waline";

export default defineValaxyConfig({
  themeConfig: {
  // ...
  }
  addons: [
    addonComponents(),
    addonWaline({
      serverURL: "https://xxx.xxx",		// Waline服务链接
      locale: {
        placeholder: "填写qq邮箱或点击登录，可以展示个人头像",
      },
      comment: true,
      pageview: true
    }),
  ],
})
```

- Waline 部署和配置：见[官方文档](https://waline.js.org/)
- 评论迁移：在评论管理页面点击左上角 `管理`->`导入导出`->`导出`。导出文件后将旧链接全部修改成新链接（记得备份，以免出错），再导入管理页面即可

##### 相册

安装依赖

```shell
pnpm add valaxy-addon-lightgallery
```

加载插件

```typescript [valaxy.config.ts]
import { defineValaxyConfig } from 'valaxy'
import { addonLightGallery } from 'valaxy-addon-lightgallery'

export default defineValaxyConfig({
  addons: [
    addonLightGallery(),
  ],
})
```

编辑相册

- 在主题设置的 `pages` 或 `menu` 中添加相册页面，如：

	```typescript [valaxy.config.ts]
		pages: [
	      {
	        name: '相册',
	        url: '/albums/',
	        icon: 'i-ri-gallery-line',
	        color: '#43abee',
	      },
	    ],
	```

- pages 文件夹中新建相册文件夹 albums，在其中新建 `index.md` 添加相簿：

	```markdown [pages\albums\index.md]
	---
	layout: albums
	title: 相册
	icon: i-ri-gallery-line
	nav: false		# 关闭页面导航
	comment: false	# 关闭评论
	toc: false		# 关闭文章目录
	aside: false	# 关闭目录边栏
	albums:			# 相簿
	  - caption: 天空
	    url: /albums/sky
	    cover: https://cdn.yuumi.link/albums/sky/夕阳夜都市.jpg
	    desc: 心驰神往的地方
	  - caption: 绿色
	    url: /albums/green
	    cover: https://cdn.yuumi.link/albums/green/绿叶丛中蝶.png
	    desc: 自然怡人
	---
	
	```

- 在 albums 文件夹中新建相簿，如 `sky.md`，在其中添加照片：

	```markdown [pages\albums\sky.md]
	---
	title: 天空
	layout: gallery
	nav: false
	toc: false
	aside: false
	photos:			# 照片
	  - caption: 去往天国的电梯
	    src: https://cdn.yuumi.link/albums/sky/去往天国的电梯.jpg
	    desc: 在城市里也能抬头看到这样的景象
	  - caption: 夕阳夜都市
	    src: https://cdn.yuumi.link/albums/sky/夕阳夜都市.jpg
	    desc: 
	---
	
	```



### site.config.ts

#### 站长信息

```typescript [site.config.ts]
  url: 'https://yuumi.link',
  favicon: "https://cdn.yuumi.link/images/settings/yuumi.svg",	// 网页图标链接
  lang: 'zh-CN',
  title: "-Yuumi's Blog-",
  subtitle: '続きを鳴らそう——',
  description: '描述',
  author: {
    name: 'Yuumi',
    avatar: "https://cdn.yuumi.link/images/settings/favicon.png",	//头像链接
    status: {
      emoji: '💛'	// 头像旁边的emoji
    },
  },
```

#### 搜索

```typescript [site.config.ts]
  search: {
    enable: true,
    type: 'fuse',	//"algolia"或"engine"或"fuse"，代码有注释
  },
```

### 自定义配置

在 `styles` 目录下创建 `index.ts`，在其中引入其他样式文件 `vars.scss` ：

```typescript [styles\index.ts]
import './vars.scss'
```

```scss [styles\vars.scss]
:root {
    // 文章框的底色
    --va-c-bg-light: rgba(255, 255, 255, 0.8);
}

// 页眉页脚渐变色
.yun-page-header-gradient {
    background: linear-gradient(to right,rgba(255, 237, 170, 0.2) 0,rgba(255, 254, 173, 0.2) 100%);
}
.yun-footer-gradient {
    height: 130px;
    background: linear-gradient(to right,rgba(255, 237, 170, 0.2) 0,rgba(255, 254, 173, 0.2) 100%);
}

// 夜间模式
html.dark{
    --va-c-bg-light:rgba(5, 16, 29, 0.8);
    .yun-page-header-gradient {
        background: linear-gradient(to right,rgba(0, 0, 0, 0.2) 0,rgba(0, 0, 0, 0.2) 100%);
    }
    .yun-footer-gradient {
        height: 130px;
        background: linear-gradient(to right,rgba(0, 0, 0, 0.2) 0,rgba(0, 0, 0, 0.2) 100%);
    }
}

// 首页大字两边的背景
.char-left {
    border-right:0px solid rgba(255,255,255, 0)
}
.char-right {
    border-left:0px solid rgba(255,255,255, 0)
}
```



## 编辑文章

### 新建文章

```shell
pnpm valaxy new <title>
```

也可以在项目的 `package.json` 中配置快捷脚本：

```json [package.json]
{
  "scripts": {
    "new": "valaxy new",
  }
}
```

之后就可以通过 `pnpm new post-title` 在 `posts` 文件夹下新建一个名为 `post-title` 的文章。

### 迁移文章

对比原来的md文件和 `/pages/posts` 下的文件进行修改，然后移入 `/pages/posts` 即可。

由于我的文章和页面都很少（）所以用 VSCode 的全局关键字替换功能就唰地改完了。如果文章较多可以试试看krau大佬的[批量修改 frontmatter](https://krau.top/posts/hexo-migrate-to-valaxy#%E8%BF%81%E7%A7%BB%E6%96%87%E7%AB%A0)脚本。



## [部署](https://valaxy.site/guide/deploy#Deployment)

### 自行部署

使用以下命令构建打包：

```shell
npm run build
```

将 `dist` 文件夹下的内容部署到自己的服务器上。

### 第三方部署

#### GitHub Pages

在 [Github](https://github.com/) 新建名为 “github名.github.io” 的代码仓库，将项目上传至仓库的 main 分支。如果上传源代码分支不为 main，则需要修改 `.github\workflows\gh-pages.yml` 中的 `on.push.branches`。

```yaml
on:
  push:
    branches:
      # 项目源代码所在的分支
      - main
```

打开代码仓库 `Settings` -> `Pages`，将 Branch 设置为 gh-pages，/(root)

![image-20230330173144398](https://cdn.yuumi.link/images/valaxy/image-20230330173144398.png)

打开 `Settings`-> `Action` -> `General` -> `Workflow permissions`，选择 `read and write permissions`。

再点击仓库的 Action 选项卡，即可查看是否成功部署。网站域名为此仓库名：github名.github.io。

#### Vercel

将项目上传至 Github 后，打开 [Vercel](https://vercel.com) 点击 `Add new` -> `Project`，授权并选择该项目。 `Framework Preset` 选择 [Vite](https://cn.vitejs.dev/)，点击 `Deploy`，等待创建完毕。

在 Vercel 项目的 `Deployments` 可以查看是否成功部署。 `Setting`->`Domains` 设置域名。建议设置其他域名，因为vercel的域名在国内被dns污染了，大多无法访问。

#### 其他

不太清楚了！建议看原指南内的部署教程。

## 大功告成！

快去给自己的主页宣传一波吧！目前 Valaxy 只有 [Yun](https://github.com/YunYouJun/valaxy/tree/main/packages/valaxy-theme-yun) 和[文档](https://github.com/YunYouJun/valaxy/tree/main/packages/valaxy-theme-press)两个主题，期待大佬们的新作品！

感谢你看到这里，如果能对你有帮助的话就太好了！<span class="bg-$smc-c-text hover:bg-$va-c-bg transition">（如果能来听听我的歌的话就更好了）</span>


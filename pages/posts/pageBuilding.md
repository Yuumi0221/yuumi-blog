---
layout: post
title: 从零开始的建博客生活
date: 2021-09-29
updated: 2023-03-30
tags: 
  - Hexo
  - Blog
categories: 小日记
cover: https://yun.yunyoujun.cn/logo.gif
excerpt: 心血来潮地肝出了自己的博客主页！（是废话连篇的日记，慎看！！）
---

:::warning 2023.3.30 关于博客的更新！
[超可爱！使用 Valaxy 搭建自己的博客](https://www.yuumi.link/posts/valaxy)
:::

没想到就连我这样的前端小白，也可以跟着使用说明一步步完成我的博客主页。我要在最最开头就点名点赞[云游君](https://www.yunyoujun.cn/)大佬的[yun主题](https://yun.yunyoujun.cn/)！！使用指南非常详细，顺便因此收藏了许多资源网站，非常快乐www

> 事实证明，兴趣、热枕，足矣。

## 萌芽 2021.09.24

查资料的时候偶然间翻到了学长的博客，做得很有高级杂志的感觉，觉得好酷，再加上老师上课时也提到了做网站的事，我就心血来潮，想做一个自己的网站！

先用github的服务器、Hexo框架搭建了一个空白啥也没有的主页，再改成NexT的主题，一下子看起来就不一样了！

<img src="https://cdn.yuumi.link/images/pageBuilding/next.png" alt="next" style="zoom:130%;" />_执行hexo指令时跳出的超酷NexT主题Logo_

<img src="https://cdn.yuumi.link/images/pageBuilding/next1.png" alt="next1" style="zoom: 67%;" />_测试用的第一个page_

NexT的简约风真的很好看，很喜欢！但是转眼我就看到一条评论——

![next2](https://cdn.yuumi.link/images/pageBuilding/next2.png)

呃——

外加朋友们都说喜欢yun主题，特别是还有说“其他主题都看起来好正式，像广告”（草）。在研究了好久yun主题的文档之后，我毅然决然！选择了它！虽然是大半夜在床上挑选主题的，但是我也意识到了这个主题肯定配置起来很复杂的的情况。可是为了变得好看，我就多学一学多肝一肝吧www

网站在此，点击这个Yuumi直达！（笑死，就是本站)

<div style="text-align: center"><a href="https://yuumi.link/ "><img src="https://cdn.yuumi.link/images/pageBuilding/yuumi.png" alt="yuumi" style="transform:scale(0.67);"/></a></div>

看到了好多大佬的杰作和开发过程，真的大受鼓舞（？）我在想能不能添加一个`简洁模式`按键，来实现同一个博客拥有两个主题，这样该多快乐呀！然而搜了半天好像没有人有过这样的想法，我也就先保留了吧w等以后自己写好了！

<div class="warning">

> TODO：
>
> 可交互按键切换博客主题

</div>


## 成型 2021.09.25

更新！！

如上所述，更改了主题——yun主题！我并不是全程跟着配置指南从头到尾一步步来做的，而是先把最重要的配置给做完，再逐步补充其他小功能。这样的话网站一下子就成型了！高兴得我连翻三个跟头！

不得不说，真的是太好玩了！！<span class="bg-$smc-c-text hover:bg-$va-c-bg transition">下床之后牙也没刷脸也没洗，</span>不吃不喝竟然搞网站搞了几个小时，只能说不愧是我（）

基本功能差不多都完成啦！把需要关联的页面也全部都安排好了，就只差评论功能没有完成了。不过。。。我似乎是有点太上头了，就像玩游戏一样想一口气打通关，做这个网站也是想一口气把它做完，让它彻底变成我自己的网站。只能说是大佬太牛，仅仅做一点点配置就可以达到想要的效果，真的太快乐了！！成就感满满！

没想到这一搞搞到了凌晨三点😵‍💫应该克制克制自己的！！！💤💤💤

## 成熟 2021.09.26

好的，我又来更新了！

- 多彩引用标签及其颜色设计

  > primary
  
  ::: zh-CN

  通过对 `markdownIt` 进行配置，你可以自由设置自定义块区域的文字以及图标及图标的颜色。（这段话可以中英文转换）

  :::

  ::: en

  By configuring `markdownIt`, you can set the text and icon (and its color) for
  custom block.

  :::

  ::: tip

  tip

  :::

  ::: warning

  warning

  :::

  ::: danger

  danger

  :::

  ::: info

  info

  :::

  ::: details Click to expand

  details

  :::
  
- [algolia搜索](https://www.algolia.com/)

  可是在火狐浏览器上访问会有不显示背景模糊的bug！！应该是火狐不支持哪个css的属性的原因，就暂时搁置一下吧。


- 免费CDN：jsDelivr+Github 的使用方法：

  比如我要的资源在github里路径为：
  https://github.com/Yuumi0221/Yuumi0221.github.io/blob/masterhttps://cdn.yuumi.link/images/settings/favicon.png

  则对应CDN为：https://cdn.jsdelivr.net/gh/Yuumi0221/Yuumi0221.github.iohttps://cdn.yuumi.link/images/settings/favicon.png

  再加入配置的url里就好啦！

- 评论功能

  不知道为什么waline没有办法适配夜间模式，很难受呜呜，于是我去[discussions](https://github.com/YunYouJun/hexo-theme-yun/discussions/172)请教了一下大佬。没想到。。刚写完这些话，大佬就给我回复了：

<img src="https://cdn.yuumi.link/images/pageBuilding/question.png" alt="question"/>

<img src="https://cdn.yuumi.link/images/pageBuilding/reply.png" alt="reply"/>

原来，大佬早就考虑周到更新完了啊！！于是我紧跟大佬脚步，赶紧把东西给更新了！但是随之而来的问题是，之前我有修改过大佬的配置代码，虽然也就是一些颜色参数，但还是需要一个个重新修改，着实有点麻烦😵‍💫为了防止自己忘记，把修改内容都记录在了notion里。有机会的话也学着做一个代码合并功能吧！

唔姆！更新了最新版主题之后，就只差评论区头像还没有安排啦！一些细节方面的小问题还没有解决的，就继续写在TODO里吧。

<div class="warning">

> TODO：
>
> 火狐浏览器搜索背景模糊不显示问题

</div>

## 完成 2021.09.27

修改了博客的各种颜色设置，为了防止自己忘记还是记录下来：

```css
// color
$light = #fafbfc;
$dark = #303133;
$gray = #999999;
$red = #db2828;
$light-red = #dc706d;
$orange = #f2711c;
$light-orange = #d69b54;
$yellow = #FF8718;
$green = #21ba45;
$light-green = #a2bd2c;
$blue = #0078E7;
$gray-blue = #7f91c8;
$indigo = #515bd4;
$purple = #8e71c1;
$indigo = #6200ee;
$light-blue = #7ec6e3;
$light-gray = #CCCCCC;
$colors ?= {
  primary: $light-orange,
  inverse: $purple,
  success: $light-green,
  warning: $orange,
  danger: $light-red,
  info: $light-blue,
  link: $gray-blue
};
```
### 获取评论者头像

今天<span class="bg-$smc-c-text hover:bg-$va-c-bg transition">在上课的时候</span>完成了获取评论人头像的功能！

虽说waline的官网上写道：

> **已过时**
> 
> 
> 建议配合最新版本的服务端，通过服务端的 `AVATAR_PROXY` 配置。

然而并没有找到`AVATAR_PROXY`应该怎么配置。。。这一部分可能又需要询问大佬了呜呜呜。总之我先按照旧版的配置方法来做：登录[libravatar](https://www.libravatar.org/)或者来添加头像，只要注册的邮箱和评论的邮箱一致，就可以获取到头像信息啦！评论的时候要记得留下邮箱欧。如果不喜欢libravatar也可以用[gravatar](http://cn.gravatar.com/)，不过用这个的话要多一步登录的过程。

### 回复邮箱提醒

另外我还想把回复邮箱提醒功能给整上，然而。。。。。。。。。。

配置SMTP需要163邮箱的SMTP密码，而163邮箱绑定的是我以前的手机号，要改绑手机号居然还需要提交修复申请等等一通操作。修复申请的网页页面全是广告，竟然还强制要求下载网易大神app？！怪不得app评论全是一星，哼！申请完了之后他给我发了个短信:

> 如需加速修复进度，可点击：（链接）获取修复加速！

？？？？？？？？？网易是真的想钱想疯了吧？？？？？？？？？？？？？？？？

然后他告诉我，因资料不足修复失败？？？？？？？？？？？？？？？？？？我真的怒火上来了！！！再申请一遍，再不过爷就换邮箱了！！！

于是乎收到了消息：

![离谱短信](https://cdn.yuumi.link/images/pageBuilding/短信.jpg)

哈哈，爬吧，爷去用outlook了，撒由那拉

![血压.jpg](https://cdn.yuumi.link/emotes/血压.jpg)

于是我开始了outlook邮箱换绑之旅——把做网页相关的所有注册邮箱全部换掉，其他的之后再说。。。以及还没有设置的内容：

- `MAIL_SUBJECT`: 自定义评论回复邮件标题
- `MAIL_TEMPLATE`: 自定义评论回复邮件内容
- `MAIL_SUBJECT_ADMIN`: 自定义新评论通知邮件标题
- `MAIL_TEMPLATE_ADMIN`: 自定义新评论通知邮件内容

然而test了一下，好像依旧收不到邮件。。。。。哎，倦了，不搞这个邮箱了呜呜呜呜，不和你打了啦！

### 幻灯片

又翻了翻云游君的[使用指南](https://yun.yunyoujun.cn/guide/#%E5%BF%AB%E9%80%9F%E5%BC%80%E5%A7%8B)，发现还有个没有搞的Slide幻灯片。出于好奇点了开来，着实惊了一下：竟然还有这样的幻灯片？！甚至自带演讲功能！太酷了！！于是我就非常想将其加入我的主页中！

然而，添加幻灯片很简单，想要一个整理幻灯片的页面的话。。。

> 至于想要 Slides 的列表嘛，自己建个 `source/slides/index.md` 在里面列吧。
> 

于是我的修改代码之旅又要开始了。

起初，我是希望能把幻灯片页面也做成归档的样式，像这样：

![归档](https://cdn.yuumi.link/images/pageBuilding/归档.png)

然而残酷的现实再一次抚平了我的棱角——大佬的代码好像根本没有设计归档这个模板啊！也就是说不会出现第二个归档了。怪不得云游君在使用指南里也就写了两三句话。。。

变成归档的希望破灭了，那么只好看看别的模板能不能用上，总不能就是一个普通页面吧！那要做的好看的话对我来说难度有点太大了orzzz（说到底还是我太菜了呜呜呜）。于是我把目光移向了相册！

然后又出现了搞笑的问题：没有办法改标题！而且还会出现“共有x个相册”的固定副标题。几经周折<span class="bg-$smc-c-text hover:bg-$va-c-bg transition">（甚至一度将type改成了友链的样子）</span>，终于找到了代码中设置标题和副标题的地方！我直接将他们注释掉！

```jsx
//else if (page.type === "albums") {
//  page.title = __("title.album");
//}
```

```jsx
//.page-subtitle= _p('counter.albums', page.albums.length)
```

大功告成！就是委屈了真正的相册没有办法统计相册个数了 😟

![把宿舍群头像的图片用来测试了](https://cdn.yuumi.link/images/pageBuilding/silide.png)_把宿舍群头像的图片用来测试了_

打算把国庆之后要交的数据可视化作业就放在这里，到时候直接甩个链接过去，也太酷了吧！！

这下我的博客大概算是彻底完工了！....吧？

## 2021.09.28（接下来是bug时间）

今天在上计算机图形学的时候，可爱多带了一本把每次实验都讲得很清楚的书，甚至实验内容都是一模一样的！就在我惊讶的时候，她告诉我这就是上课老师写的书。欧，怪不得哦！由于我认识的学姐学长们大多没上过这门课，或者没买过书，所以我还是想找一下这本书的电子书。找书时一时起兴：我要不在博客里存档一下搜书网站？说干就干！

翻来了之前知乎收藏的帖子（其实要不是室友看了眼我的知乎，我都不记得我还收藏过这个），开始存档那些看起来比较大的搜书网站。

防止每次写md都要搜索，就在这里记录一下html语法

```html
<center>这一行需要居中</center>
<p align="left">左对齐</p>
<p align="right">右对齐</p>
<font face="黑体">我是黑体字</font>
<font size=10>字体大小为10</font>
<font color=red>颜色是红色</font>
<!-- 多个属性-->
<p style="text-align:left;">一部分左对齐<span style="float:right;">另一部分右对齐</span></p>
<font size=10 color=red>字体大小为10且颜色是红色</font>
```

搞定！

当我以为自己已经搞定了的时候，一预览发现图片的大小居然调整失效？！一番折腾之后发现，原来是火狐浏览器不能显示图片的缩放，而其他浏览器都可以。。。呜呜，亏我这么喜欢火狐，怎么频频令我失望嘛！想去给火狐发反馈邮件了😔

然而当我又以为一切都搞定的时候——鼠标移动到链接后出现的下划线颜色改不掉！！为什么！！！主题色明明已经改掉了呀，为什么这些地方的主题色仍然没有变！！！

然后发现貌似是文档的问题。。。不知道为啥，只有about是点链接主题色没有变的。。。算了算了，这些小细节问题就先保留了吧！

可是还有！我的代码copy按钮呢！！刚每次发布的时候还有的，过了一段时间按钮就会消失，这是为什么？？？

奇怪的bug越来越多了！！

## 2021.09.29

将bug或者待优化的部分标红了，才发现居然还有这么多未完成的部分。我现在着实像一个改bug机器：发现bug——F12查问题——vscode搜索、尝试修改——本地运行检查成果。于是今天又修改了一处小细节：

```css
padding: 1rem 1rem 1rem 1rem;
```

可是我现在最难受的依然是代码段的copy功能离奇失踪事件！！！好想把这个问题给解决掉呀！！！可是我翻遍了所有带copy的代码，都没有找到可能起冲突的地方，配置明明也都是true，凭什么不显示嘛😭最离谱的是，如果在copy部分进行了修改，再运行预览的话一开始会出现copy按钮，复制出来也是正确的。可过了一会儿再刷新，竟然就无了？？？这是什么bug啊！！

害！算啦！我先给我的博客加一点内容吧，那就把这篇做主页的心路历程放进我的博客里吧！

给图片加超链接的HTML语法：在一个`<a>`标签中加上一个`<img>`标签内容，即可让该`<img>`拥有一个超链接：

```html
<a href="https://yuumi0221.github.io/ ">
		<img src="/images/pageBuilding/yuumi.png" alt="yuumi" style="zoom: 15%;" />
</a>
```

可是令人伤心的是，火狐浏览器图片不能缩放，其他浏览器又显示不出来这个带链接的图片，怎么会这样呜呜呜！结果。。把缩放的`style="zoom: 15%;"`给删掉竟然就可以显示了。这，这个缩放怎么次次都给我找麻烦嘛！

好了好了，更新完了第一部分，该去写作业啦！

（顺带一提，在写这一段的时候我写着写着睡着了，第二天早上起来一看。。。

![诡异逗号.jpg](https://cdn.yuumi.link/images/pageBuilding/诡异逗号.jpg)

直接笑嘻了给我，可真牛啊！

搜索得知，貌似是只有ie浏览器才会支持`style="zoom:67%;"`，因此在火狐浏览器并不能看到缩放后图片的样子，而是无视了这一条，直接呈现未缩放的状态。要在各个浏览器上都显示缩放的话需要使用css3的transform属性：`style="transform:scale(0.67);"`

然而这个属性也有一点让人难过的地方，那就是图片还是会占原图大小的位置。图片本身变小了，但其他地方就被空出来了。

![被缩小到50%的图片](https://cdn.yuumi.link/images/pageBuilding/搞笑缩放.png)_被缩小到50%的图片_

就像这样，空一大————块。看来搜索不显示背景模糊也是火狐不支持的原因。这下子又有新的问题在等着我了呀。

今天更新了一下搭建博客的文章，感觉自己的博客离完善越来越近了，就很开心。尽管现在几乎没有什么人来看我的博客，但我也希望我能在这世界上留下一些我的印记。

> これは僕が生きた証

## 2021.10.08

今天在学长的帮助下解决了一大堆莫名其妙的问题（其实最想问的问题并没有解决，而是解决了在改变方向解决问题的过程中冒出的一大堆新问题），其中最搞笑的莫过于HTML页面被Hexo自动渲染后形成的离奇套娃事件——

![套娃](https://cdn.yuumi.link/images/pageBuilding/让爷康康.png)

虽然是bug，但是[echart实例](https://hexo.fluid-dev.com/posts/hexo-echarts/)

↑我也不知道当时我在写什么，就这样吧（）

不知道为什么，在配置文件中设置了渲染跳过也没办法改变。。只好在每一个不需要渲染的html前都加一句这个了

```html
layout: false
```

## 2022.11.15

好久没有更新这篇文章了，之前的各种bug现在大多都已经迎刃而解了。yun主题也进行了超级大更新，使用npm包进行安装了！这篇废话连篇的搭建博客心路历程也就此告一段落吧，相信之后还会有更大的更新在等着我的！

------

***完结***


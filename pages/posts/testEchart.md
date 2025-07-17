---
layout: post
title: 将EChart图表嵌入Hexo博客中
date: 2021-10-08
updated: 2023-03-29
tags: 
   - ECharts
   - HTML
   - Hexo
categories: 小教程
---

上课学了如何载入文件并用EChart模板制作动态可交互图表，于是便想将其收入囊中！如果图表也可以做完一键复制粘贴，那岂不是爽飞了？！果然偷懒是人类进步的源动力<span class="bg-$smc-c-text hover:bg-$va-c-bg transition">，所以大佬们快快加油让我多偷偷懒吧</span>！！

<div class="primary">

> 人总是能在不知不觉间感受到意想不到的乐趣，正如现在面对无数DDL仍在快乐玩儿图表的我——

</div>

<!-- more -->

:::danger 紧急更新！！！
由于本博客已由Hexo框架更改为Valaxy框架，因此应用于Hexo的插件暂时无法使用，预览暂时无法查看！！
:::

上着课突发奇想，或许我可以把图表引入我的博客里？毕竟可视化那真是一个大好东西，直观易懂还好玩儿！像大佬们一样把自己各种语言的代码量做成一张饼图就很有意思，而且可以交互，还自带丝滑的动画，真的是绝了！

虽然我暂时还只用过EChart图表，但将别的图标嵌入博客的步骤也大同小异（特别是使用第二种方法）。若之后用到别的图表有不一样的操作，会再编辑的。

不过，只有在Hexo实现的内容，因为别的完全没有接触过😴

> 预览暂时无法查看

## 通过EChart插件直接嵌入

不需要自己手搓完整的HTML，方便快捷！

### 安装插件

[KChen](https://kchen.cc/2016/11/05/echarts-in-hexo/)大佬加工开发的Hexo的[ECharts插件](https://github.com/kchen0x/hexo-tag-echarts3)已经收录于[Hexo官方插件页](https://hexo.io/plugins/)中，因此我们只需在Hexo文件夹执行 `npm` 安装命令：

```bash
$ npm install hexo-tag-echarts3 --save
```

在 `hexo-tag-echarts3` 插件的 `README.md` 文件中我们可以看到用法：在markdown文章中直接将EChart所生成图表的 `option` 部分粘贴到`tag`中间就可以了：

:::danger 
每一句`% %`外需要加`{ }`，由于博客渲染原因`{ }`不显示，请自行添加！
:::

```javascript
% echarts 400 '85%' %
...（option代码内容）
% endecharts %
```

其中 `echarts` 是标签名，不需要更改，`400` 是图表容器的高度，`85%` 是图表容器的相对宽度。而在 `tag` 之间的部分，则是需要自己填充的图表数据了。

来举个例子：嵌入ECharts的[堆叠面积图](https://echarts.apache.org/examples/zh/editor.html?c=area-stack)模板试试。打开模板可以看到左边的 `option` 部分代码，直接粘贴到 `tag` 中间即可：

```javascript
% echarts 400 '85%' %

option = {
  title: {
    text: 'Stacked Area Chart'
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      label: {
        backgroundColor: '#6a7985'
      }
    }
  },
  legend: {
    data: ['Email', 'Union Ads', 'Video Ads', 'Direct', 'Search Engine']
  },
  toolbox: {
    feature: {
      saveAsImage: {}
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: [
    {
      type: 'category',
      boundaryGap: false,
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    }
  ],
  yAxis: [
    {
      type: 'value'
    }
  ],
  series: [
    {
      name: 'Email',
      type: 'line',
      stack: 'Total',
      areaStyle: {},
      emphasis: {
        focus: 'series'
      },
      data: [120, 132, 101, 134, 90, 230, 210]
    },
    {
      name: 'Union Ads',
      type: 'line',
      stack: 'Total',
      areaStyle: {},
      emphasis: {
        focus: 'series'
      },
      data: [220, 182, 191, 234, 290, 330, 310]
    },
    {
      name: 'Video Ads',
      type: 'line',
      stack: 'Total',
      areaStyle: {},
      emphasis: {
        focus: 'series'
      },
      data: [150, 232, 201, 154, 190, 330, 410]
    },
    {
      name: 'Direct',
      type: 'line',
      stack: 'Total',
      areaStyle: {},
      emphasis: {
        focus: 'series'
      },
      data: [320, 332, 301, 334, 390, 330, 320]
    },
    {
      name: 'Search Engine',
      type: 'line',
      stack: 'Total',
      label: {
        show: true,
        position: 'top'
      },
      areaStyle: {},
      emphasis: {
        focus: 'series'
      },
      data: [820, 932, 901, 934, 1290, 1330, 1320]
    }
  ]
};

% endecharts %
```

上面的代码所渲染出来的ECharts图表效果如下：

> 预览暂时无法查看

是不是非常方便！

<div class="warning">

>若不能正确绘制图表，则需要修改 node_modules/hexo-tag-echarts/echarts-template.html 文件：

</div>

```html
<div id="<%- id %>" style="width: <%- width %>;height: <%- height %>px;margin: 0 auto"></div>
<script type="text/javascript">
	...
</script>

将上面的部分 1、2 行之间添加一行，改成下面的代码：

<div id="<%- id %>" style="width: <%- width %>;height: <%- height %>px;margin: 0 auto"></div>
<script src="http://echarts.baidu.com/dist/echarts.common.min.js"></script>
<script type="text/javascript">
	...
</script>
```

### ~~(添加定义的变量和函数)~~  现在不需要了！！

#### 使用script

有时代码中的数据和函数定义会放在option外，此时我们需要通过script将其引入：

```javascript
<script>
...（定义的变量和函数）
</script>

% echarts 400 '85%' %
...（option代码内容）
% endecharts %
```

#### 修改模板文件

如果你懒得多打这几个字，可以试试[aiData](https://aidata.ink/2019/03/01/3/)大佬这个一劳永逸的方法。

打开 node_modules/hexo-tag-echarts/echarts-template.html 和 node_modules\hexo-tag-echarts3/template.html 文件，将里面的内容全部注释掉后添加代码：

```html
<!--
注释掉的代码
-->
<div id="<%- id %>" style="width: <%- width %>;height: <%- height %>px;margin: 0 auto"></div>
<%= option %>
```

再打开 node_modules/hexo-tag-echarts/index.js 和 node_modules\hexo-tag-echarts3//index.js 文件，将 `return _.template(template)` 部分注释掉后添加代码：

```javascript
  /*
  注释掉的代码
  */
  return _.template(template)({
    id: args[0] || chart,
    option: options,
    height: args[1] || 400,
    width: args[2] || '85%'
  });
```

这样，我们嵌入图表时的 `tag` 也需要进行修改：

```javascript
% echarts chart1 400 '85%' %
...
% endecharts %
```

`tag` 增加了一个参数：表格ID，需要与代码中的表格ID对应一致。用将数据放在option外的[旭日图使用视觉编码](https://echarts.apache.org/examples/zh/editor.html?c=sunburst-visualMap)图来举个例子：

```javascript
% echarts chart3 400 '85%' %
<script src="https://cdn.staticfile.org/echarts/4.3.0/echarts.min.js"></script>
<script type="text/javascript">
var chartDom = document.getElementById('chart3');
var myChart = echarts.init(chartDom);
var option;
var data = [
  {
    name: 'Grandpa',
    children: [
      {
        name: 'Uncle Leo',
        value: 15,
        children: [
          {
            name: 'Cousin Jack',
            value: 2
          },
          {
            name: 'Cousin Mary',
            value: 5,
            children: [
              {
                name: 'Jackson',
                value: 2
              }
            ]
          },
          {
            name: 'Cousin Ben',
            value: 4
          }
        ]
      },
      {
        name: 'Aunt Jane',
        children: [
          {
            name: 'Cousin Kate',
            value: 4
          }
        ]
      },
      {
        name: 'Father',
        value: 10,
        children: [
          {
            name: 'Me',
            value: 5,
            itemStyle: {
              color: 'red'
            }
          },
          {
            name: 'Brother Peter',
            value: 1
          }
        ]
      }
    ]
  },
  {
    name: 'Mike',
    children: [
      {
        name: 'Uncle Dan',
        children: [
          {
            name: 'Cousin Lucy',
            value: 3
          },
          {
            name: 'Cousin Luck',
            value: 4,
            children: [
              {
                name: 'Nephew',
                value: 2
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'Nancy',
    children: [
      {
        name: 'Uncle Nike',
        children: [
          {
            name: 'Cousin Betty',
            value: 1
          },
          {
            name: 'Cousin Jenny',
            value: 2
          }
        ]
      }
    ]
  }
];
option = {
  visualMap: {
    type: 'continuous',
    min: 0,
    max: 10,
    inRange: {
      color: ['#2F93C8', '#AEC48F', '#FFDB5C', '#F98862']
    }
  },
  series: {
    type: 'sunburst',
    data: data,
    radius: [0, '90%'],
    label: {
      rotate: 'radial'
    }
  }
};
option && myChart.setOption(option);
</script>
% endecharts %
```

在ECharts页面中点击左侧的完整代码，即可看到所有变量和函数，全都要复制到 `tag` 中哦。效果如下：

> 预览暂时无法查看

## 使用iframe嵌入HTML

如果说你已经准备好了自己写的HTML，那么你也不用慌张！可以通过HTML内联框架元素iframe，将另一个HTML页面嵌入到当前页面中。

iframe的使用格式如下：

```html
<iframe id=""
    title=""
    width=""
    height=""
    src=""
    ...
        >
</iframe>
```

当然还有更多属性可以进行操作，详情见[iframe教程](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/iframe)。要添加本地的HTML，只要把文件地址填入属性 `src` 的引号内就行。

如果照着上面的操作，一预览便会发现大问题：自己写的HTML文件被Hexo主题渲染啦！！<span class="bg-$smc-c-text hover:bg-$va-c-bg transition">（可以进行套娃游戏，着实是很有意思）</span>

### 修改配置文件防渲染

打开Hexo目录下的 _config.yml 文件，ctrl+F 查找到 `skip_render` 字段，添加你不想渲染的文件或文件夹。如：

```yaml
skip_render: 
  - README.md	#单个文件
  - test1/*		#单个文件夹下全部文件
  - test1/*.html	#单个文件夹下指定类型文件
  - test2/**		#单个文件夹下全部文件以及子目录
```

因此我们可以在source文件夹下添加一个html文件夹，把html都放进去，再在配置中设置就完事了。

```yaml
skip_render: 
  - html/**
```

<div class="warning">

>做完上述的这些之后，记得使用 `hexo clean`，然后再使用 `hexo s` 重新查看，根据我的测试，如果你不运行 `hexo clean`，那么对 `skip_render` 的设置是不会生效的。

</div>

### 不渲染单个文件

直接在单个markdown或HTML文件的最上面添加：

```
---
layout: false
---
```

这是官方解决方案，我通过这种方法也成功避免了HTML被渲染。但我在搜索资料时发现该方法有可能会出现部分渲染的情况。

### 插件防止渲染

[Hongwei Qin](http://qinhongwei.com/2014/11/18/如何防止hexo渲染某个文件夹/)大佬整理了三种防渲染方案，这里就介绍他的终极方案——使用 `hexo-processor-copyassets` 插件！

这是一个 Hexo 的文件处理插件，能自定义 `source` 中的指定文件或文件夹，在执行 `generate` 命令的时候能直接复制到 `public` 文件夹中而不经过渲染。

#### 安装

```bash
$ npm install hexo-processor-copyassets --save
```

#### 配置插件

同样在 `_config.yml` 中配置这个插件，例如:

```yaml
copyAssets: project  #表示 project 文件夹中的文件不被渲染，直接复制到 public 文件夹。
```

或者

```yaml
copyAssets: CNAME,project,resource/img #可以指定文件和文件夹，用 "," 号隔开
```

经测试，这个方法确实牛！和方法一一样只需要配置一下就行，方便且有效。

举个上课做的图表例子。在markdown文章中添加：

```html
<iframe id="graph1"
	title="graph1"
	src="/html/slideTestEchart/slide_graph.html" 
	height="500px" 
	width="100%" 
	scrolling="auto" 
	frameborder="0">
</iframe>
```

效果如下：

<iframe id="graph1"
	title="graph1"
	src="https://cdn.yuumi.link/html/slideTestEchart/slide_graph.html" 
	height="500px" 
	width="100%" 
	scrolling="auto" 
	frameborder="0">
</iframe>


## 需载入外部文件的图表

不会了，这回是真的不会了😰，也没有搜到相应教程，只能说是才疏学浅了呜呜呜。等到学会了再来更新x

## 一些ECharts小技巧

非常诚实地告诉大家，这些都是从大佬们的博客里看来的😁，诶嘿嘿嘿x

### 快速生成ECharts图表

如果只是做一些简单的图表插入博客，那其实还有更快捷的编辑方法：[百度·图说](https://tushuo.baidu.com/)。不瞒大家说，因为还没有自己使用过，所以先不做详细介绍了，大家就先看[大佬博客](https://kchen.cc/2016/11/05/echarts-in-hexo/#%E5%A6%82%E4%BD%95%E7%94%A8%E5%A5%BD-ECharts)吧！等用了再来写使用感想（？）

### ECharts参数

- title：标题组件，包含主标题和副标题。
- legend：图例组件。
- tooltip：提示框组件。
- toolbox：工具栏。内置有导出图片，数据视图，动态类型切换，数据区域缩放，重置五个工具。
- xAxis、yAxis：直角坐标系 grid 中的 x 轴、y轴。

### ECharts实例

因为我懒得搞了，所以见[pxxyyz](https://xiejilu.com/2020/06/20/hexo-echarts/#%E5%AE%9E%E4%BE%8B)大佬做的实例吧！（溜）

## 参考

- [在 Hexo 中插入 ECharts 动态图表](https://kchen.cc/2016/11/05/echarts-in-hexo/)

- [在Hexo中嵌入动态图表Echarts和Google Charts](https://aidata.ink/2019/03/01/3/)

- [使用 ECharts 插件绘制炫酷图表](https://xiejilu.com/2020/06/20/hexo-echarts/)

- [如何防止hexo渲染某个文件夹](http://qinhongwei.com/2014/11/18/如何防止hexo渲染某个文件夹/)

- [Hexo内嵌网页踩坑记录](https://nonlinearthink.github.io/hexo/hexo-iframe/)

  

------

如果你觉得这篇文章对你有帮助的话……

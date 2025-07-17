---
layout: post
title: 图片像素颜色的可视化
date: 2021-10-12
updated: 2021-10-12
tags: 
  - JavaScript
  - HTML
  - ECharts
categories: 小作业
excerpt: 课堂小作业。又是妄想一夜学会JS和HTML的一天
---

## 课程作业

基于已完成的练习，实现一个图片颜色的可视化页面，基本功能要求如下：

1. 对图片中的颜色进行聚类，类的数量K可在代码中指定（聚类算法可使用k-means等）；

2. 需可视化的信息包含2个维度：

   （1）聚类中心的颜色或颜色均值；

   （2）某类里颜色的数量。

3. 选择一种EChart可视化样式对聚类结果进行展示。

## 进阶功能（不强制要求）

1. 可交互式选择不同的图片；

2. 可切换可视化样式（例如，可在饼图柱状图等图表间切换）；

3. 其他功能。

## 已完成内容

- 选择本地图片文件
- 输入k值，聚类获取图片主颜色及其颜色数量
- 输入1或2，得到饼图或柱状图

## 完成效果

<iframe id="graph1"
	title="graph1"
	src="https://cdn.yuumi.link/html/getColor/getColor.html" 
	height="1000px" 
	width="100%" 
	scrolling="auto" 
	frameborder="0">
</iframe>

## 待完善内容

- 界面美化（再说吧……）
- 算得太慢，K-means算法待优化
- 开局随机取点，聚类效果因图和k值而异，如何使结果趋于稳定？
- 夜间模式还没做

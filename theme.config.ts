import { $t } from 'valaxy'
import { defineThemeConfig } from 'valaxy-theme-yun'

export default defineThemeConfig({
  // type: 'strato',
  type: 'nimbo',
  // colors: {
  //   primary: 'red',
  // },
  // bg_image: {},

  banner: {
    enable: true,
    title: ['Yuumi', '的', '烟', '波', '之', '路'],
    cloud: {
      enable: true,
    },
  },

  // notice: {
  //   enable: true,
  //   content: '公告测试',
  // },

  nav: [
    { text: $t('menu.posts'), link: '/posts/', icon: 'i-ri-article-line' },
    { text: $t('menu.moments'), link: '/moments/', icon: 'i-ri-chat-1-line' },
    { text: $t('menu.projects'), link: '/projects', icon: 'i-ri-code-s-slash-line' },
    { text: $t('menu.anime'), link: '/girls/', icon: 'i-ri-movie-line' },
    { text: $t('menu.albums'), link: '/albums', icon: 'i-ri-gallery-line' },
    { text: $t('menu.links'), link: '/links/', icon: 'i-ri-open-arm-line' },
  ],

  pages: [
    {
      name: $t('menu.moments'),
      url: '/moments/',
      icon: 'i-ri-chat-1-line',
      color: '#f1a532',
    },
    {
      name: $t('menu.projects'),
      url: '/projects/',
      icon: 'i-ri-code-s-slash-line',
      color: '#ff6cb1',
    },
    {
      name: $t('menu.anime'),
      url: '/anime/',
      icon: 'i-ri-movie-line',
      color: '#737de5',
    },
    {
      name: $t('menu.albums'),
      url: '/albums/',
      icon: 'i-ri-gallery-line',
      color: '#43abee',
    },
    {
      name: $t('menu.links'),
      url: '/links/',
      icon: 'i-ri-open-arm-line',
      color: '#4bbea4',
    },
  ],

  // sidebar: {
  //   '/yun/': [
  //     {
  //       text: 'Theme Yun',
  //       items: [
  //         { text: 'Overview', link: '/yun/' },
  //       ],
  //     },
  //   ],
  //   '/examples/': [
  //     {
  //       text: 'Examples',
  //       items: [
  //         { text: 'Sites', link: '/examples/sites' },
  //       ],
  //     },
  //   ],
  // },

  bg_image: {
    enable: true,
    url: "https://cdn.yuumi.link/images/settings/background.png",
    dark: "https://cdn.yuumi.link/images/settings/bgdark.jpg",
    opacity: 1
  },

  say: {
    enable: true,
    api: "https://el-bot-api.vercel.app/api/words/young",
    hitokoto: {
      enable: true,
      api: "https://v1.hitokoto.cn/?c=k&c=d&c=i",
    },
  },

  colors: {
    primary: "#D69B54",
  },

  fireworks: {
    enable: true,
    colors: ['#FFE57D', '#FFCD88', '#E6F4AD']
  },

  footer: {
    since: 2021,
    icon: {
      enable: true,
      name: 'i-ri-heart-line',
      animated: true,
      color: '#d69b54',
      url: 'https://yuumi.link',
      title: '回到首页'
    },
    powered: true,
    beian: {
      enable: true,
      icp: '沪ICP备2026002379号',
      police:'沪公网安备31010502007663号',
    },
  },
})

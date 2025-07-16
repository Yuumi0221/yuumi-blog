import { $t, defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
  url: 'https://www.yuumi.link',
  favicon: "https://cdn.yuumi.link/images/settings/yuumi.svg",
  lang: 'zh-CN',
  title: '-Yuumi\'s Blog-',
  subtitle: $t('siteConfig.subtitle'),
  
  author: {
    name: 'Yuumi',
    avatar: "https://cdn.yuumi.link/images/settings/favicon.png",
    status: {
      emoji: '💛',
      message: $t('siteConfig.author.message'),
    },
  },
  description: '',
  social: [
    {
      name: $t('siteConfig.social.rednote'),
      link: 'https://www.xiaohongshu.com/user/profile/5f6abe560000000001002329',
      icon: 'i-simple-icons-xiaohongshu',
      color: '#da465aff',
    },
    {
      name: $t('siteConfig.social.music163'),
      link: 'http://music.163.com/artist?id=30377410&userid=436730182',
      icon: 'i-ri-netease-cloud-music-line',
      color: '#ca3636ff',
    },
    {
      name: $t('siteConfig.social.bilibili'),
      link: 'https://space.bilibili.com/7498906',
      icon: 'i-ri-bilibili-line',
      color: '#fa97b3ff',
    },
    {
      name: $t('siteConfig.social.youtube'),
      link: 'https://www.youtube.com/@yuumihoshino1836',
      icon: 'i-ri-youtube-line',
      color: '#e03759ff',
    },
    {
      name: $t('siteConfig.social.twitter'),
      link: 'https://x.com/Yuumi12118924',
      icon: 'i-ri-twitter-x-line',
      color: '#3c6886ff',
    },
    {
      name: 'GitHub',
      link: 'https://github.com/Yuumi0221',
      icon: 'i-ri-github-line',
      color: '#9b9b9b',
    },
    {
      name: 'Notion',
      link: 'https://yuumis.notion.site',
      icon: 'i-ri-notion-fill',
      color: '#717171',
    },
    {
      name: $t('siteConfig.social.email'),
      link: 'mailto:yuumi0221@163.com',
      icon: 'i-ri-mail-line',
      color: '#71aac1ff',
    },
    {
      name: 'RSS',
      link: '/atom.xml',
      icon: 'i-ri-rss-line',
      color: 'orange',
    },
    // {
    //   name: $t('siteConfig.social.weibo'),
    //   link: 'https://weibo.com/u/3075122387',
    //   icon: 'i-ri-weibo-line',
    //   color: '#E6162D',
    // },
    // {
    //   name: 'Pixiv',
    //   link: 'https://www.pixiv.net/users/10168567',
    //   icon: 'i-arcticons:pixiv',
    //   color: '#0096FA',
    // },
    // {
    //   name: $t('siteConfig.social.zhihu'),
    //   link: 'https://www.zhihu.com/people/yuumi-81',
    //   icon: 'i-ri-zhihu-line',
    //   color: '#0084FF',
    // },
  ],

  search: {
    enable: true,
    type: 'fuse'
  },

  fuse: {
    options: {
      keys: ['title', 'excerpt', 'content'],
      /**
       * @default 0.6
       * @see https://www.fusejs.io/api/options.html#threshold
       * 设置匹配阈值，越低越精确
       */
      threshold: 0,
      /**
       * @default false
       * @see https://www.fusejs.io/api/options.html#ignoreLocation
       * 忽略位置
       * 这对于搜索文档全文内容有用，若无需全文搜索，则无需设置此项
       */
      ignoreLocation: true,
    },
  },

  sponsor: {
    enable: true,
    description: '如果你喜欢的话……',
    methods: [
      {
        name: $t('siteConfig.sponsor.alipay'),
        url: 'https://cdn.yuumi.link/images/settings/alipay.jpg',
        color: '#00A3EE',
        icon: 'i-ri-alipay-line',
      },
      {
        name: $t('siteConfig.sponsor.wechatpay'),
        url: 'https://cdn.yuumi.link/images/settings/wechatpay.png',
        color: '#2DC100',
        icon: 'i-ri-wechat-pay-line',
      },
      {
        name: $t('siteConfig.sponsor.qqpay'),
        url: 'https://cdn.yuumi.link/images/settings/qqpay.png',
        color: '#12B7F5',
        icon: 'i-ri-qq-line',
      },
    ],
  },

  comment: {
    enable: true,
  },

  mediumZoom: {
    enable: true,
  },

  statistics: {
    enable: true,
  },
})

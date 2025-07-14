import { defineValaxyConfig } from 'valaxy'
// import { defineConfig } from 'valaxy'
import type { UserThemeConfig } from 'valaxy-theme-yun'
import { addonWaline } from "valaxy-addon-waline"
// import { addonComponents } from "valaxy-addon-components"
import { addonLightGallery } from 'valaxy-addon-lightgallery'
import { addonBangumi } from 'valaxy-addon-bangumi'
import { addonFace } from 'valaxy-addon-face'

// add icons what you will need
const safelist = [
  'i-ri-home-line',
]

/**
 * User Config
 */
export default defineValaxyConfig<UserThemeConfig>({
  // site config see site.config.ts

  theme: 'yun',

  themeConfig: {
    banner: {
      enable: true,
      title: ['Yuumi', '的', '烟', '波', '之', '路'],
      cloud: {
        enable: true,
      },
    },

    pages: [
      {
        name: '追番列表',
        url: '/anime/',
        icon: 'i-ri-movie-line',
        color: '#737de5',
      },
      {
        name: '相册',
        url: '/albums/',
        icon: 'i-ri-gallery-line',
        color: '#43abee',
      },
      {
        name: '友链',
        url: '/links/',
        icon: 'i-ri-open-arm-line',
        color: '#4bbea4',
      },
    ],

    // menu: {
    //   custom: {
    //     title: 'menu.slides',
    //     url: '/slides/',
    //     icon: 'i-ri-keynote-line'
    //   }
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
        enable: false,
        icp: 'xxxx',
      },
    },
    
  },

  groupIcons: {
    customIcon:{
      nodejs: 'vscode-icons:file-type-node',
      playwright: 'vscode-icons:file-type-playwright',
      typedoc: 'vscode-icons:file-type-typedoc',
      eslint: 'vscode-icons:file-type-eslint',
    },
  },

  addons: [
    // addonComponents(),
    addonWaline({
      serverURL: "https://comments.yuumi.link",
      locale: {
        placeholder: "填写qq邮箱或点击登录，可以展示个人头像~详情请见【留言板】板块",
      },
      comment: true,
      pageview: true,
      highlighter: true,
      texRenderer: true,
      reaction: [],
      emoji: [
        '//unpkg.com/@waline/emojis@1.2.0/bmoji',
        '//unpkg.com/@waline/emojis@1.2.0/tieba',
        '//unpkg.com/@waline/emojis@1.2.0/qq',
      ],
    }),
    addonLightGallery(),
    addonBangumi({
      api: 'https://bilibilibgm.yuumi.link/api',
      bilibiliUid: '7498906',
      bgmUid: 'yuumi',
      bilibiliEnabled: true,
      bgmEnabled: true,
      customCss: `
        :host {
          --bbc-text-base-color: #4c4948;
          --bbc-label-color: #8eab64;
          --bbc-primary-color: #d69b54;
        }
      `,
    }),
    addonFace({
      path: 'https://cdn.yuumi.link/emotes/',
    }),
  ],
  
  features: {
      katex: true
  },

  unocss: { safelist },

  
})

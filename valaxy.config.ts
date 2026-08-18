import { defineValaxyConfig } from 'valaxy'
import type { UserThemeConfig } from 'valaxy-theme-yun'
import { addonWaline } from "valaxy-addon-waline"
// import { addonComponents } from "valaxy-addon-components"
import { addonLightGallery } from 'valaxy-addon-lightgallery'
import { addonBangumi } from 'valaxy-addon-bangumi'
import { addonFace } from 'valaxy-addon-face'
import { addonMeting } from 'valaxy-addon-meting'
import { addonMoments } from 'valaxy-addon-moments'

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
      ],
    }),
    addonLightGallery(),
    addonBangumi({
      api: 'https://bilibilibgm.yuumi.link/api',
      bilibiliUid: '7498906',
      bgmUid: 'yuumi',
      bilibiliEnabled: false,
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
    addonMeting({
      global: false,
    }),
    addonMoments({
      title: '小随想',
      description: '',
      initialCount: 10,
      batchSize: 10,
      likes: {
        enabled: true,
        endpoint: '/api/moments-like',
      },
    }),
  ],
  
  features: {
      katex: true
  },

  unocss: { safelist },

  
})

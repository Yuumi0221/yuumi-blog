<script setup lang="ts">
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/vue'
import { useFrontmatter, useSiteConfig } from 'valaxy'
import { defineAsyncComponent } from 'vue'

const MusicLibrary = defineAsyncComponent(() => import('../components/music/MusicLibrary.vue'))

const frontmatter = useFrontmatter()
const siteConfig = useSiteConfig()

useSchemaOrg(defineWebPage({
  '@type': 'CollectionPage',
  'name': String(frontmatter.value.title || 'Yuumi Music Library'),
  'image': frontmatter.value.cover,
}))
</script>

<template>
  <YunLayoutWrapper>
    <main class="music-page">
      <MusicLibrary />
      <YunComment
        v-if="siteConfig.comment.enable && frontmatter.comment !== false"
        class="music-page__comments"
      />
    </main>
  </YunLayoutWrapper>
</template>

<style scoped>
.music-page {
  width: 100%;
  min-width: 0;
}

.music-page__comments {
  width: min(94vw, 56rem);
  margin: 1.25rem auto 0;
}
</style>

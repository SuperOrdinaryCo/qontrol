<template>
  <div
    v-if="(localData && visible) || localVisible"
    class="absolute z-50 max-w-sm p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg border border-gray-700"
    :style="{ left: x + 'px', top: y + 'px' }"
    @mouseenter.stop="show"
    @mouseleave.stop="hide"
  >
    <div class="font-semibold mb-2">Job Data Preview</div>
    <pre class="whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{{ formattedData }}</pre>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'

interface Props {
  visible: boolean
  x: number
  y: number
  jobData: any
}

const props = defineProps<Props>()
const localVisible = ref(false)
const localData = ref()

watch(() => props.jobData, (newData) => {
  if (newData) {
    localData.value = newData
  }
}, { immediate: true })

const show = () => {
  localVisible.value = true
}

const hide = () => {
  localData.value = null
  localVisible.value = false
}

const formattedData = computed(() => {
  const data = localData.value

  if (!data) return ''

  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
})
</script>

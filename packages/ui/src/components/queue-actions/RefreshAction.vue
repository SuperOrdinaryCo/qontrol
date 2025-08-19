<script setup lang="ts">
import {ArrowPathIcon} from '@heroicons/vue/24/outline';

type Props = {
  loading: boolean;
}

defineProps<Props>()

</script>

<template>
  <button :disabled="loading" class="btn-secondary flex items-center">
    <ArrowPathIcon class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" />
    Refresh
  </button>
</template>

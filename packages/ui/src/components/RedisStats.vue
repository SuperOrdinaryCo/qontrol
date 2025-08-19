<script setup lang="ts">
import {CircleStackIcon} from '@heroicons/vue/24/outline';
import {ref} from 'vue';
import RedisStatsModal from '@/components/RedisStatsModal.vue';

// Redis stats modal state
const showRedisStats = ref(false)
</script>

<template>
  <div>
    <!-- Redis Stats Button -->
    <button
        @click="showRedisStats = true"
        class="btn-secondary flex items-center"
    >
      <CircleStackIcon class="w-4 h-4 mr-2" />
      Redis Stats
    </button>

    <!-- Redis Stats Modal -->
    <RedisStatsModal :is-open="showRedisStats" @close="showRedisStats = false" />
  </div>
</template>

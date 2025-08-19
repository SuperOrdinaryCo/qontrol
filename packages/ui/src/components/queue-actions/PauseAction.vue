<script setup lang="ts">
import {ref} from 'vue';
import {PauseIcon, PlayIcon} from '@heroicons/vue/24/outline';
import {QueueInfo} from '@/types';
import {useQueuesStore} from '@/stores/queues.ts';

const props = defineProps<{
  queueInfo: QueueInfo
  queueName: string;
}>()

// Queue pause/resume state
const pausingQueue = ref(false)

const queuesStore = useQueuesStore()

async function toggleQueuePause() {
  const queueInfo = props.queueInfo;
  const queueName = props.queueName;

  if (!queueInfo || pausingQueue.value) return

  try {
    pausingQueue.value = true

    if (queueInfo.isPaused) {
      // Resume the queue
      await queuesStore.resumeQueue(queueName)
      console.log(`Queue ${queueName} resumed successfully`)
    } else {
      // Pause the queue
      await queuesStore.pauseQueue(queueName)
      console.log(`Queue ${queueName} paused successfully`)
    }

    // Refresh queue info to get updated status
    await queuesStore.fetchQueue(queueName)
  } catch (error) {
    console.error('Failed to toggle queue pause:', error)
    alert(`Failed to ${queueInfo.isPaused ? 'resume' : 'pause'} queue. Please try again.`)
  } finally {
    pausingQueue.value = false
  }
}
</script>

<template>
  <button
      @click="toggleQueuePause"
      :disabled="pausingQueue"
      :class="[
            'btn-secondary flex items-center',
            queueInfo.isPaused
              ? 'text-green-600 hover:text-green-700 border-green-300 hover:border-green-400'
              : 'text-orange-600 hover:text-orange-500 border-orange-300 hover:border-orange-400'
          ]"
  >
    <component
        :is="queueInfo.isPaused ? PlayIcon : PauseIcon"
        class="w-4 h-4 mr-2"
        :class="{ 'animate-pulse': pausingQueue }"
    />
    {{ pausingQueue ? 'Processing...' : (queueInfo.isPaused ? 'Resume' : 'Pause') }}
  </button>
</template>

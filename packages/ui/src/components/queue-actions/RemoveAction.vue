<script setup lang="ts">
import {ref} from 'vue';
import {NoSymbolIcon} from '@heroicons/vue/24/outline';
import {useQueuesStore} from '@/stores/queues.ts';
import {useConfirmStore} from '@/stores/confirm.ts';

const props = defineProps<{
  queueName: string;
}>()

const emit = defineEmits<{
  removed: [boolean];
}>()

const queuesStore = useQueuesStore()
const confirmStore = useConfirmStore()

// Queue removing state
const removingQueue = ref(false)

async function performRemoveAction() {
  try {
    removingQueue.value = true

    // Use the selected state directly for cleaning
    await queuesStore.obliterateQueue(props.queueName)
    console.log(`Cleaned ${props.queueName} queue`)

    emit('removed', true)
  } catch (error) {
    console.error(`Failed to remove ${props.queueName} queue:`, error)
  } finally {
    removingQueue.value = false
    confirmStore.show(false)
    confirmStore.clear()
  }
}

function showCleanDialog() {
  // Set up confirmation dialog based on action
  confirmStore.updateData({
    title: `Remove ${props.queueName} Queue`,
    message: `Are you sure you want to remove "${props.queueName}"?`,
    details: `This will permanently remove "${props.queueName}" queue. This action cannot be undone.`,
  })

  confirmStore.confirm(() => {
    performRemoveAction()
  })

  confirmStore.show(true)
}
</script>

<template>
  <button
      @click="showCleanDialog()"
      :disabled="removingQueue"
      class="btn-danger  flex items-center hover:text-red-500 border-red-300 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <NoSymbolIcon class="w-4 h-4 mr-2" :class="{ 'animate-pulse': removingQueue }" />
    {{ removingQueue ? 'Removing...' : `Remove` }}
  </button>
</template>

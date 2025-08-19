<script setup lang="ts">
import {computed, ref} from 'vue';
import {TrashIcon} from '@heroicons/vue/24/outline';
import {useQueuesStore} from '@/stores/queues.ts';
import {useConfirmStore} from '@/stores/confirm.ts';

const props = defineProps<{
  queueState: string
  queueName: string;
}>()

const emit = defineEmits<{
  cleaned: [boolean];
}>()

const queuesStore = useQueuesStore()
const confirmStore = useConfirmStore()

// Queue cleaning state
const cleaningQueue = ref(false)
const cleanAction = ref<string | null>(null)

const canCleanSelectedState = computed(() => {
  // Only allow cleaning certain states that make sense
  const cleanableStates = ['completed', 'wait', 'waiting', 'active', 'paused', 'prioritized', 'delayed', 'failed']
  return cleanableStates.includes(props.queueState)
})

async function performCleanAction() {
  if (!cleanAction.value) return

  try {
    const queueName = props.queueName;

    cleaningQueue.value = true

    // Use the selected state directly for cleaning
    const result = await queuesStore.cleanQueue(queueName, { type: cleanAction.value as any })
    console.log(`Cleaned ${result.cleaned} ${cleanAction.value} jobs`)

    // Refresh queue info and jobs after cleaning
    await queuesStore.fetchQueue(queueName)
    emit('cleaned', true)
  } catch (error) {
    console.error(`Failed to clean ${cleanAction.value} jobs:`, error)
    alert(`Failed to clean ${cleanAction.value} jobs. Please try again.`)
  } finally {
    cleaningQueue.value = false
    cleanAction.value = null
    confirmStore.show(false)
    confirmStore.clear()
  }
}

function showCleanDialog(action: string) {
  cleanAction.value = action

  // Set up confirmation dialog based on action
  confirmStore.updateData({
    title: `Clean ${action.charAt(0).toUpperCase() + action.slice(1)} Jobs`,
    message: `Are you sure you want to clean all ${action} jobs from queue "${props.queueName}"?`,
    details: `This will permanently remove all ${action} jobs from the queue. This action cannot be undone.`,
  })

  confirmStore.confirm(() => {
    performCleanAction()
  })

  confirmStore.show(true)
}
</script>

<template>
  <button
      @click="showCleanDialog(queueState)"
      :disabled="cleaningQueue || !canCleanSelectedState"
      class="btn-secondary flex items-center text-red-600 hover:text-red-500 border-red-300 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <TrashIcon class="w-4 h-4 mr-2" :class="{ 'animate-pulse': cleaningQueue }" />
    {{ cleaningQueue ? 'Cleaning...' : `Clean ${queueState}` }}
  </button>
</template>

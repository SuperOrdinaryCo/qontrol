<script setup lang="ts">
const sortOrder = defineModel({
  required: true,
  default: 'desc',
  validator: (value: string) => ['desc', 'asc'].includes(value),
})
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Order</label>
    <select
        v-model="sortOrder"
        class="block w-28 py-3 px-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200 sm:text-sm"
    >
      <option value="desc">Desc</option>
      <option value="asc">Asc</option>
    </select>
  </div>
</template>

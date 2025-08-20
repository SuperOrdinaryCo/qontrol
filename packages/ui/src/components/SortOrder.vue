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
        class="input-field px-3"
    >
      <option value="desc">Desc</option>
      <option value="asc">Asc</option>
    </select>
  </div>
</template>

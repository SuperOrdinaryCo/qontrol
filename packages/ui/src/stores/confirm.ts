import {defineStore} from 'pinia';
import {reactive, ref} from 'vue';

export const useConfirmStore = defineStore('confirm', () => {
  const isOpen = ref(false);
  const loading = ref(false);

  const toggle = () => {
    isOpen.value = !isOpen.value
  };
  const setLoading = (value: boolean) => {
    loading.value = value
  };
  const show = (value: boolean) => {
    isOpen.value = value
  };

  const defaultData = {
    title: 'Confirm Action',
    message: '',
    details: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  };
  const data = reactive({
    ...defaultData,
  })

  const updateData = (payload: Partial<typeof defaultData> = {}) => {
    data.title = payload.title || defaultData.title;
    data.message = payload.message || '';
    data.details = payload.details || '';
    data.confirmText = payload.confirmText || defaultData.confirmText;
    data.cancelText = payload.cancelText || defaultData.cancelText;
  }

  const confirmAction = ref<() => void>(() => {});
  const confirm = (action: () => void) => {
    confirmAction.value = action;
  }
  const cancelAction = ref<() => void>(() => {
    isOpen.value = false;
    loading.value = false;
    updateData();
    confirmAction.value = () => {};
  });
  const cancel = (action: () => void) => {
    cancelAction.value = action;
  }

  const clear = () => {
    updateData()
    confirmAction.value = () => {};
    cancelAction.value = () => {};
  }

  return {
    isOpen,
    toggle,
    show,
    loading,
    setLoading,
    data,
    updateData,
    confirmAction,
    confirm,
    cancelAction,
    cancel,
    clear,
  }
})

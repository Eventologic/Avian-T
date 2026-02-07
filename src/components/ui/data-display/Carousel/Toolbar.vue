<script setup lang="ts">
import {
  XMarkIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";
import IconButton from "@src/components/ui/inputs/IconButton.vue";

const props = defineProps<{
  handleCloseCarousel: () => void;
  handleIncreaseZoom: () => void;
  handleDecreaseZoom: () => void;
  isImage: boolean;
}>();
</script>

<template>
  <div class="w-full flex justify-end mb-5">
    <!--decrease zoom-->
    <IconButton
      title="Decrease zoom"
      v-show="props.isImage"
      aria-label="Decrease zoom"
      class="mr-5"
      @click="props.handleDecreaseZoom()"
    >
      <MagnifyingGlassMinusIcon
        class="w-6 h-6 text-white opacity-80 hover:opacity-100"
      />
    </IconButton>

    <!--increase zoom-->
    <IconButton
      title="Increase zoom"
      v-show="props.isImage"
      aria-label="Increase zoom"
      class="mr-5"
      @click="props.handleIncreaseZoom()"
    >
      <MagnifyingGlassPlusIcon
        class="w-6 h-6 text-white opacity-80 hover:opacity-100"
      />
    </IconButton>

    <!--delete media-->
    <IconButton
      aria-label="Delete attachment"
      class="mr-5"
      title="Delete attachment"
    >
      <TrashIcon class="w-6 h-6 text-white opacity-80 hover:opacity-100" />
    </IconButton>

    <!--close carousel-->
    <IconButton
      title="Close carousel"
      aria-label="Close carousel"
      @click="props.handleCloseCarousel()"
    >
      <XMarkIcon class="w-6 h-6 text-white opacity-80 hover:opacity-100" />
    </IconButton>
  </div>
</template>

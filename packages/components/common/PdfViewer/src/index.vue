<script setup lang="ts" name="PdfViewer">
import PdfViewer from "./PdfViewer.vue";

defineOptions({ name: "PdfViewerControl" });
</script>

<template>
  <PdfViewer v-bind="$attrs" />
</template>

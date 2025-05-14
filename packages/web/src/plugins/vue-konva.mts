// Import Vue Konva plugin
import VueKonva from 'vue-konva';
import type { App } from 'vue';

// Export a function to register Vue Konva
export function registerVueKonva(app: App): void {
  // @ts-expect-error - Vue Konva types don't match perfectly with Plugin type
  app.use(VueKonva);
} 
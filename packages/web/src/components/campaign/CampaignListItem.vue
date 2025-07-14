<script setup lang="ts">
import type { ICampaign } from '@dungeon-lab/shared/types/index.mjs';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/vue/24/outline';

defineProps<{ campaign: ICampaign }>();
defineEmits(['view', 'edit', 'delete']);
</script>

<template>
  <tr class="hover:bg-stone-100 dark:hover:bg-stone-600 transition-all duration-200">
    <td class="px-6 py-5">
      <div class="cursor-pointer hover:text-dragon transition-colors group" @click="$emit('view', campaign)">
        <div class="font-semibold text-onyx dark:text-parchment text-lg group-hover:text-dragon">{{ campaign.name }}</div>
        <div class="text-sm text-ash dark:text-stone-300 mt-1" v-if="campaign.description">
          {{ campaign.description }}
        </div>
      </div>
    </td>
    <td class="px-6 py-5 text-sm font-medium text-arcane dark:text-secondary-400">{{ campaign.gameSystemId }}</td>
    <td class="px-6 py-5">
      <span
        :class="{
          'px-3 py-1 text-xs font-bold rounded-full shadow-sm border': true,
          'bg-success-100 text-success-800 border-success-300': campaign.status === 'active',
          'bg-accent-100 text-accent-800 border-accent-300': campaign.status === 'paused',
          'bg-stone-200 text-stone-700 border-stone-300 dark:bg-stone-600 dark:text-stone-200 dark:border-stone-500':
            campaign.status === 'completed' || campaign.status === 'archived',
        }"
      >
        {{ campaign.status === 'active' ? '🟢 ' + campaign.status : 
           campaign.status === 'paused' ? '⏸️ ' + campaign.status : 
           '📁 ' + campaign.status }}
      </span>
    </td>
    <td class="px-6 py-5 text-sm text-ash dark:text-stone-300 font-medium">
      {{ (campaign as any).createdAt ? new Date((campaign as any).createdAt).toLocaleDateString() : '' }}
    </td>
    <td class="px-6 py-5 text-right space-x-1">
      <button 
        v-if="campaign.id" 
        class="inline-flex items-center p-2 rounded-md text-arcane hover:text-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-900 focus:outline-none transition-all duration-200 shadow-sm" 
        @click="$emit('view', campaign)" 
        title="View Campaign"
      >
        <EyeIcon class="w-5 h-5" />
      </button>
      <button 
        v-if="campaign.id" 
        class="inline-flex items-center p-2 rounded-md text-gold hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900 focus:outline-none transition-all duration-200 shadow-sm" 
        @click="$emit('edit', campaign.id)" 
        title="Edit Campaign"
      >
        <PencilIcon class="w-5 h-5" />
      </button>
      <button 
        v-if="campaign.id" 
        class="inline-flex items-center p-2 rounded-md text-dragon hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900 focus:outline-none transition-all duration-200 shadow-sm" 
        @click="$emit('delete', campaign)" 
        title="Delete Campaign"
      >
        <TrashIcon class="w-5 h-5" />
      </button>
    </td>
  </tr>
</template> 
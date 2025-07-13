<script setup lang="ts">
import type { ICampaign } from '@dungeon-lab/shared/types/index.mjs';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/vue/24/outline';

defineProps<{ campaign: ICampaign }>();
defineEmits(['view', 'edit', 'delete']);
</script>

<template>
  <tr class="hover:bg-gray-50">
    <td class="px-6 py-4">
      <div class="cursor-pointer hover:text-blue-600 transition-colors" @click="$emit('view', campaign)">
        <div class="font-medium text-gray-900">{{ campaign.name }}</div>
        <div class="text-sm text-gray-500" v-if="campaign.description">
          {{ campaign.description }}
        </div>
      </div>
    </td>
    <td class="px-6 py-4 text-sm text-gray-500">{{ campaign.gameSystemId }}</td>
    <td class="px-6 py-4">
      <span
        :class="{
          'px-2 py-1 text-xs font-medium rounded-full': true,
          'bg-green-100 text-green-800': campaign.status === 'active',
          'bg-yellow-100 text-yellow-800': campaign.status === 'paused',
          'bg-gray-100 text-gray-800':
            campaign.status === 'completed' || campaign.status === 'archived',
        }"
      >
        {{ campaign.status }}
      </span>
    </td>
    <td class="px-6 py-4 text-sm text-gray-500">
      {{ (campaign as any).createdAt ? new Date((campaign as any).createdAt).toLocaleDateString() : '' }}
    </td>
    <td class="px-6 py-4 text-right space-x-2">
      <button v-if="campaign.id" class="inline-flex items-center p-2 text-blue-600 hover:text-blue-900 focus:outline-none" @click="$emit('view', campaign)" title="View Campaign">
        <EyeIcon class="w-5 h-5" />
      </button>
      <button v-if="campaign.id" class="inline-flex items-center p-2 text-gray-600 hover:text-gray-900 focus:outline-none" @click="$emit('edit', campaign.id)" title="Edit Campaign">
        <PencilIcon class="w-5 h-5" />
      </button>
      <button v-if="campaign.id" class="inline-flex items-center p-2 text-red-600 hover:text-red-900 focus:outline-none" @click="$emit('delete', campaign)" title="Delete Campaign">
        <TrashIcon class="w-5 h-5" />
      </button>
    </td>
  </tr>
</template> 
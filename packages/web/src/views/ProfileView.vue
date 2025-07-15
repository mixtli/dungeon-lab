<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store.mts';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
const editing = ref(false);
const isSaving = ref(false);
const error = ref<string | null>(null);

// Editable fields
const form = ref({
  displayName: user.value?.displayName || '',
  profile: {
    biography: user.value?.profile?.biography || '',
    website: user.value?.profile?.website || '',
    twitter: user.value?.profile?.twitter || '',
    github: user.value?.profile?.github || '',
    linkedin: user.value?.profile?.linkedin || '',
    discord: user.value?.profile?.discord || '',
    location: user.value?.profile?.location || ''
  }
});

function startEdit() {
  editing.value = true;
  error.value = null;
  // Reset form to current user values
  form.value = {
    displayName: user.value?.displayName || '',
    profile: {
      biography: user.value?.profile?.biography || '',
      website: user.value?.profile?.website || '',
      twitter: user.value?.profile?.twitter || '',
      github: user.value?.profile?.github || '',
      linkedin: user.value?.profile?.linkedin || '',
      discord: user.value?.profile?.discord || '',
      location: user.value?.profile?.location || ''
    }
  };
}

function cancelEdit() {
  editing.value = false;
  error.value = null;
}

async function saveProfile() {
  if (!user.value) return;
  isSaving.value = true;
  error.value = null;
  try {
    const response = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: form.value.displayName,
        profile: { ...form.value.profile }
      })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to update profile.');
    }
    await authStore.fetchUser(); // Refresh user in store
    editing.value = false;
  } catch (err: unknown) {
    if (err instanceof Error) {
      error.value = err.message || 'Failed to update profile.';
    } else {
      error.value = 'Failed to update profile.';
    }
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6 text-dragon">Profile</h1>
    <div class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-dragon dark:text-gold">User Information</h2>
        <button v-if="!editing" @click="startEdit" class="btn btn-primary">Edit</button>
      </div>
      <form v-if="editing" @submit.prevent="saveProfile" class="space-y-6">
        <div>
          <label class="block text-sm font-medium mb-1">Display Name</label>
          <input v-model="form.displayName" type="text" class="input" maxlength="100" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Biography</label>
          <textarea v-model="form.profile.biography" class="input" rows="3" maxlength="1000" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Website</label>
            <input v-model="form.profile.website" type="url" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Location</label>
            <input v-model="form.profile.location" type="text" class="input" maxlength="100" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Twitter</label>
            <input v-model="form.profile.twitter" type="url" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">GitHub</label>
            <input v-model="form.profile.github" type="url" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">LinkedIn</label>
            <input v-model="form.profile.linkedin" type="url" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Discord</label>
            <input v-model="form.profile.discord" type="text" class="input" />
          </div>
        </div>
        <div class="flex gap-2 mt-6">
          <button type="submit" class="btn btn-success" :disabled="isSaving">Save</button>
          <button type="button" class="btn btn-secondary" @click="cancelEdit" :disabled="isSaving">Cancel</button>
        </div>
        <p v-if="error" class="text-red-600 mt-2">{{ error }}</p>
      </form>
      <div v-else>
        <div class="mb-4">
          <span class="font-medium">Display Name:</span>
          <span class="ml-2">{{ user?.displayName || user?.username }}</span>
        </div>
        <div class="mb-4">
          <span class="font-medium">Biography:</span>
          <span class="ml-2 text-ash dark:text-parchment">{{ user?.profile?.biography || '—' }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span class="font-medium">Website:</span>
            <span class="ml-2"><a v-if="user?.profile?.website" :href="user.profile.website" target="_blank" class="text-blue-600 dark:text-blue-400 underline">{{ user.profile.website }}</a><span v-else>—</span></span>
          </div>
          <div>
            <span class="font-medium">Location:</span>
            <span class="ml-2">{{ user?.profile?.location || '—' }}</span>
          </div>
          <div>
            <span class="font-medium">Twitter:</span>
            <span class="ml-2"><a v-if="user?.profile?.twitter" :href="user.profile.twitter" target="_blank" class="text-blue-600 dark:text-blue-400 underline">{{ user.profile.twitter }}</a><span v-else>—</span></span>
          </div>
          <div>
            <span class="font-medium">GitHub:</span>
            <span class="ml-2"><a v-if="user?.profile?.github" :href="user.profile.github" target="_blank" class="text-blue-600 dark:text-blue-400 underline">{{ user.profile.github }}</a><span v-else>—</span></span>
          </div>
          <div>
            <span class="font-medium">LinkedIn:</span>
            <span class="ml-2"><a v-if="user?.profile?.linkedin" :href="user.profile.linkedin" target="_blank" class="text-blue-600 dark:text-blue-400 underline">{{ user.profile.linkedin }}</a><span v-else>—</span></span>
          </div>
          <div>
            <span class="font-medium">Discord:</span>
            <span class="ml-2">{{ user?.profile?.discord || '—' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input {
  @apply block w-full px-3 py-2 bg-parchment dark:bg-stone-600 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-onyx dark:text-parchment;
}
.btn {
  @apply px-4 py-2 rounded-md font-semibold shadow-sm transition-all duration-200;
}
.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}
.btn-success {
  @apply bg-green-600 text-white hover:bg-green-700;
}
.btn-secondary {
  @apply bg-stone-300 text-onyx hover:bg-stone-400 dark:bg-stone-600 dark:text-parchment dark:hover:bg-stone-700;
}
</style> 
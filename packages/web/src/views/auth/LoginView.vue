<script setup lang="ts">
import LoginForm from '@/components/auth/LoginForm.vue';
</script>

<template>
  <div class="login-view">
    <div class="auth-container">
      <div class="auth-card">
        <LoginForm />
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  min-height: calc(100vh - 64px - 64px); /* Subtract header and footer height */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background-color: rgb(243 244 246); /* bg-gray-100 */
}

.auth-container {
  width: 100%;
  max-width: 480px;
}

.auth-card {
  background-color: rgb(255 255 255); /* bg-white */
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.auth-view {
  background-color: rgb(243 244 246); /* bg-gray-100 */
}

.auth-content {
  background-color: rgb(255 255 255); /* bg-white */
}
</style>

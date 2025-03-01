<script setup lang="ts">
import RegisterForm from '@/components/auth/RegisterForm.vue';
</script>

<template>
  <div class="register-view">
    <div class="auth-container">
      <div class="auth-card">
        <RegisterForm />
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-view {
  min-height: calc(100vh - 64px - 64px); /* Subtract header and footer height */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background-color: var(--el-fill-color-light);
}

.auth-container {
  width: 100%;
  max-width: 480px;
}

.auth-card {
  background-color: var(--el-bg-color);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
</style> 
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const form = reactive({
  email: '',
  password: '',
});

const isSubmitting = ref(false);
const formRef = ref();

const rules = {
  email: [
    { required: true, message: 'Please enter your email', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email address', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Please enter your password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' },
  ],
};

async function handleSubmit() {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;
    
    isSubmitting.value = true;
    
    try {
      const success = await authStore.login(form);
      
      if (success) {
        ElMessage.success('Login successful!');
        router.push({ name: 'home' });
      } else {
        ElMessage.error(authStore.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      ElMessage.error('An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
    } finally {
      isSubmitting.value = false;
    }
  });
}
</script>

<template>
  <div class="login-form">
    <h2 class="text-2xl font-bold mb-6">Login to Your Account</h2>
    
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Email" prop="email">
        <el-input 
          v-model="form.email" 
          placeholder="Enter your email"
          type="email"
          autocomplete="email"
        />
      </el-form-item>
      
      <el-form-item label="Password" prop="password">
        <el-input 
          v-model="form.password" 
          placeholder="Enter your password"
          type="password"
          autocomplete="current-password"
          show-password
        />
      </el-form-item>
      
      <div class="flex justify-between items-center mb-4">
        <el-checkbox>Remember me</el-checkbox>
        <router-link 
          to="/auth/forgot-password" 
          class="text-blue-600 hover:text-blue-800 text-sm"
        >
          Forgot Password?
        </router-link>
      </div>
      
      <el-button 
        type="primary" 
        native-type="submit"
        :loading="isSubmitting"
        class="w-full"
      >
        Login
      </el-button>
      
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300 dark:border-gray-700"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
        </div>
      </div>
      
      <el-button 
        @click="authStore.loginWithGoogle()"
        class="w-full flex justify-center items-center"
      >
        <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/>
          <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          <path d="M1 12c0-1.34.25-2.61.67-3.77L2.17 7.1c-.43 1.16-.67 2.43-.67 3.77 0 1.34.25 2.61.67 3.77l3.66-2.84c-.43-1.16-.67-2.43-.67-3.77z" fill="#FBBC05"/>
          <path d="M12 18.46c-2.86 0-5.29-1.93-6.16-4.53l-3.66 2.84c1.81 3.6 5.52 6.07 9.82 6.07 2.97 0 5.45-1.09 7.36-2.87l-3.15-3.15c-1.15 1.08-2.59 1.64-4.21 1.64z" fill="#34A853"/>
          <path d="M22.54 12c0-.68-.06-1.34-.17-1.97h-9.87v3.95h5.53c-.24 1.28-.97 2.36-2.07 3.08l3.15 3.15c1.84-1.72 2.9-4.26 2.9-7.21z" fill="#4285F4"/>
        </svg>
        Sign in with Google
      </el-button>
      
      <div class="mt-4 text-center">
        <p>
          Don't have an account?
          <router-link 
            to="/auth/register" 
            class="text-blue-600 hover:text-blue-800 ml-1"
          >
            Register
          </router-link>
        </p>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: var(--el-bg-color);
}
</style> 
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  displayName: '',
});

const isSubmitting = ref(false);
const formRef = ref();

const validatePass = (_rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('Please enter your password'));
  } else if (value.length < 6) {
    callback(new Error('Password must be at least 6 characters'));
  } else {
    if (form.confirmPassword !== '') {
      if (formRef.value) {
        formRef.value.validateField('confirmPassword');
      }
    }
    callback();
  }
};

const validateConfirmPass = (_rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('Please confirm your password'));
  } else if (value !== form.password) {
    callback(new Error('Passwords do not match'));
  } else {
    callback();
  }
};

const rules = {
  username: [
    { required: true, message: 'Please enter a username', trigger: 'blur' },
    { min: 3, message: 'Username must be at least 3 characters', trigger: 'blur' },
  ],
  email: [
    { required: true, message: 'Please enter your email', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email address', trigger: 'blur' },
  ],
  password: [
    { validator: validatePass, trigger: 'blur' },
  ],
  confirmPassword: [
    { validator: validateConfirmPass, trigger: 'blur' },
  ],
};

async function handleSubmit() {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;
    
    isSubmitting.value = true;
    
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registerData } = form;
      
      const success = await authStore.register(registerData);
      
      if (success) {
        ElMessage.success('Registration successful!');
        router.push({ name: 'home' });
      } else {
        ElMessage.error(authStore.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      ElMessage.error('An unexpected error occurred. Please try again.');
      console.error('Registration error:', error);
    } finally {
      isSubmitting.value = false;
    }
  });
}
</script>

<template>
  <div class="register-form">
    <h2 class="text-2xl font-bold mb-6">Create an Account</h2>
    
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Username" prop="username">
        <el-input 
          v-model="form.username" 
          placeholder="Choose a username"
          autocomplete="username"
        />
      </el-form-item>
      
      <el-form-item label="Email" prop="email">
        <el-input 
          v-model="form.email" 
          placeholder="Enter your email"
          type="email"
          autocomplete="email"
        />
      </el-form-item>
      
      <el-form-item label="Display Name (optional)">
        <el-input 
          v-model="form.displayName" 
          placeholder="Enter your display name"
          autocomplete="name"
        />
      </el-form-item>
      
      <el-form-item label="Password" prop="password">
        <el-input 
          v-model="form.password" 
          placeholder="Create a password"
          type="password"
          autocomplete="new-password"
          show-password
        />
      </el-form-item>
      
      <el-form-item label="Confirm Password" prop="confirmPassword">
        <el-input 
          v-model="form.confirmPassword" 
          placeholder="Confirm your password"
          type="password"
          autocomplete="new-password"
          show-password
        />
      </el-form-item>
      
      <el-button 
        type="primary" 
        native-type="submit"
        :loading="isSubmitting"
        class="w-full"
      >
        Register
      </el-button>
      
      <div class="mt-4 text-center">
        <p>
          Already have an account?
          <router-link 
            to="/auth/login" 
            class="text-blue-600 hover:text-blue-800 ml-1"
          >
            Login
          </router-link>
        </p>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.register-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: var(--el-bg-color);
}
</style> 
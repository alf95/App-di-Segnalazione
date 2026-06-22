import { useAuthStore } from '@/stores/authStore';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return {
    user,
    isAuthenticated: Boolean(user),
    logout: clearAuth,
  };
};

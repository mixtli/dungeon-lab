import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const STORAGE_KEY = 'mobile-actors-last-opened';

const lastOpenedActorId = ref<string | null>(
  localStorage.getItem(STORAGE_KEY)
);

export function useMobileActorsState() {
  const router = useRouter();

  const setLastOpenedActor = (actorId: string) => {
    lastOpenedActorId.value = actorId;
    localStorage.setItem(STORAGE_KEY, actorId);
  };

  const clearLastOpenedActor = () => {
    lastOpenedActorId.value = null;
    localStorage.removeItem(STORAGE_KEY);
  };

  const getLastOpenedActor = () => {
    return lastOpenedActorId.value;
  };

  const hasLastOpenedActor = computed(() => {
    return lastOpenedActorId.value !== null;
  });

  const navigateToActorsTab = () => {
    const lastActorId = getLastOpenedActor();
    
    if (lastActorId) {
      router.push({
        name: 'mobile-actor-sheet',
        params: { id: lastActorId }
      });
    } else {
      router.push({ name: 'mobile-actors' });
    }
  };

  return {
    setLastOpenedActor,
    clearLastOpenedActor,
    getLastOpenedActor,
    hasLastOpenedActor,
    navigateToActorsTab
  };
}
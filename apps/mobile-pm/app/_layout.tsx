import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout() {
  // `undefined` means the token has not been read yet.
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem('manara_access_token')
      .then(setToken)
      .catch(() => setToken(null));
  }, []);

  // The redirect has to wait for the Stack below to mount — router.replace() is
  // a no-op while no navigator exists, which previously left the app on a blank
  // screen with the sign-in route never reached.
  useEffect(() => {
    if (token === undefined) return;
    if (!token) router.replace('/auth/login');
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </QueryClientProvider>
  );
}

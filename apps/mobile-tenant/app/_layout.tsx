import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import messaging from '@react-native-firebase/messaging';
import { tenantApi } from '../lib/api';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

async function registerFcmToken() {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (enabled) {
      const fcmToken = await messaging().getToken();
      await tenantApi.registerPushToken(fcmToken, 'FCM');
    }
  } catch {
    // FCM registration is best-effort
  }
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('manara_access_token').then((token) => {
      if (!token) {
        router.replace('/auth/login');
      } else {
        registerFcmToken();
      }
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="ticket/[id]" options={{ headerShown: true, title: 'Request Details', headerBackTitle: 'Back' }} />
      </Stack>
    </QueryClientProvider>
  );
}

import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LicenseProvider, useLicense } from '../context/LicenseContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { CartProvider } from '../context/CartContext';
import { OfflineProvider } from '../context/OfflineContext';
import { PrinterProvider } from '../context/PrinterContext';
import { RegisterProvider } from '../context/RegisterContext';

const queryClient = new QueryClient();

function RootLayoutNav() {
    const { session, loading: authLoading } = useAuth();
    const { isActivated, daysLeft, loading: licenseLoading } = useLicense();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (authLoading || licenseLoading) return;

        const inLoginPage = segments[0] === 'login';
        const inActivatePage = segments[0] === 'activate';

        // 1. If trial expired and not activated, force activation page
        if (!isActivated && daysLeft === 0 && !inActivatePage) {
            router.replace('/activate');
            return;
        }

        // 2. Normal Auth logic
        if (!session && !inLoginPage && !inActivatePage) {
            router.replace('/login');
        } else if (session && inLoginPage) {
            router.replace('/');
        }
    }, [session, authLoading, licenseLoading, segments, isActivated, daysLeft]);

    if (authLoading || licenseLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
        </Stack>
    );
}

// ...

import { useKeepAwake } from 'expo-keep-awake';

// ...

export default function Layout() {
    useKeepAwake();

    return (
        <OfflineProvider>
            <LicenseProvider>
                <AuthProvider>
                    <RegisterProvider>
                        <PrinterProvider>
                            <CartProvider>
                                <RootLayoutNav />
                            </CartProvider>
                        </PrinterProvider>
                    </RegisterProvider>
                </AuthProvider>
            </LicenseProvider>
        </OfflineProvider>
    );
}

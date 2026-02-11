import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LicenseProvider, useLicense } from '../context/LicenseContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { View, ActivityIndicator, LogBox } from 'react-native';

// Ignore all log notifications for a cleaner demo experience
LogBox.ignoreAllLogs(true);
import { CartProvider } from '../context/CartContext';
import { OfflineProvider } from '../context/OfflineContext';
import { PrinterProvider } from '../context/PrinterContext';
import { RegisterProvider } from '../context/RegisterContext';
import { StoreProvider } from '../context/StoreContext';

const queryClient = new QueryClient();

import { ConfirmationModal } from '../components/ConfirmationModal';

function RootLayoutNav() {
    const { session, loading: authLoading, isSessionHijacked, signOut, clearSessionHijack } = useAuth();
    const { isActivated, daysLeft, loading: licenseLoading } = useLicense();

    console.log('[RootLayoutNav] render - isSessionHijacked:', isSessionHijacked);

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

    const handleHijackClose = async () => {
        await signOut();
        clearSessionHijack();
    };

    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
            </Stack>

            <ConfirmationModal
                visible={isSessionHijacked}
                title="Sesi Berakhir"
                message="Akun anda sudah login di perangkat lain. Silakan login kembali jika ini adalah Anda."
                confirmText="Tutup"
                cancelText={null}
                onConfirm={handleHijackClose}
                onCancel={handleHijackClose}
                type="warning"
            />
        </>
    );
}

// ...

import { useKeepAwake } from 'expo-keep-awake';

export default function Layout() {
    useKeepAwake();

    return (
        <OfflineProvider>
            <LicenseProvider>
                <AuthProvider>
                    <RegisterProvider>
                        <PrinterProvider>
                            <StoreProvider>
                                <CartProvider>
                                    <RootLayoutNav />
                                </CartProvider>
                            </StoreProvider>
                        </PrinterProvider>
                    </RegisterProvider>
                </AuthProvider>
            </LicenseProvider>
        </OfflineProvider>
    );
}

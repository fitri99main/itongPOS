import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, Switch, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Settings, Plus, Users, Square, Menu, X, LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import tw from 'twrnc';
import { NetworkStatus } from './NetworkStatus';
import { useOffline } from '../context/OfflineContext';
import { useStore } from '../context/StoreContext';
import { useRegister } from '../context/RegisterContext';
import { ConfirmationModal } from './ConfirmationModal';

export function HeaderModern() {
    const router = useRouter();
    const { user, role, profile, signOut } = useAuth();
    const { isOnline, isManualOffline, setManualOffline } = useOffline();
    const insets = useSafeAreaInsets();
    const { settings } = useStore();
    const { activeRegister } = useRegister();
    const { width } = useWindowDimensions();

    // State for Mobile Menu
    const [showMenu, setShowMenu] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
        confirmText: 'OK',
        cancelText: null as string | null,
        onConfirm: () => { }
    });

    // Responsive scaling
    const storeNameSize = width > 600 ? 'text-3xl' : 'text-2xl';
    const appNameSize = width > 600 ? 'text-sm' : 'text-xs';

    // App Name is static as per request
    const appName = 'itongPOS';

    const toggleOfflineMode = async (value: boolean) => {
        if (role === 'admin' && value === true) {
            // Optional: Prevent admin from going offline?
            // For now, allow it but maybe warn? 
            // The user said "admin selalu online" so let's just HIDE it for admin or disable it.
            // Let's hide it for Admin to be safe as requested.
            return;
        }
        await setManualOffline(value);
    };

    // Only show toggle for Cashier
    const showOfflineToggle = role === 'kasir' || role === 'cashier';


    const handleSignOut = () => {
        setShowMenu(false);

        // CHECK REGISTER STATUS
        if (activeRegister && activeRegister.status === 'open') {
            setModalConfig({
                title: 'Kasir Belum Ditutup',
                message: 'Anda harus menutup kasir dan mengakhiri shift sebelum keluar dari akun demi keamanan data.',
                type: 'warning',
                confirmText: 'Tutup Kasir Sekarang',
                cancelText: 'Batal',
                onConfirm: () => {
                    setShowModal(false);
                    router.push('/register/close');
                }
            });
            setShowModal(true);
            return;
        }

        // Standard logout confirmation
        setModalConfig({
            title: 'Keluar Akun',
            message: 'Apakah Anda yakin ingin keluar dari akun?',
            type: 'danger',
            confirmText: 'Keluar Akun',
            cancelText: 'Tetap Di Sini',
            onConfirm: async () => {
                setShowModal(false);
                await signOut();
            }
        });
        setShowModal(true);
    };

    const isAuthorized = role === 'admin' || role === 'kasir' || role === 'cashier';

    return (
        <View style={{ paddingTop: insets.top, backgroundColor: 'white', zIndex: 100 }}>
            <View style={tw`flex-row items-center justify-between px-5 py-4`}>
                {/* Removed border-b, added more padding for specious feel */}
                <View style={[tw`flex-row items-center`, { gap: width > 800 ? 12 : 6 }]}>
                    <View>
                        <Text style={tw`font-extrabold ${storeNameSize} text-slate-800 tracking-tight`} numberOfLines={1}>{settings.storeName}</Text>
                        <View style={tw`flex-row items-center gap-2`}>
                            <Text style={tw`font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase ${appNameSize}`}>{appName}</Text>
                            <NetworkStatus />
                        </View>
                        <View style={tw`flex-row items-center gap-1.5 mt-0.5`}>
                            {(!isOnline || role === 'admin') && (
                                <View style={[
                                    tw`w-2 h-2 rounded-full`,
                                    !isOnline ? tw`bg-red-500` : tw`bg-green-500`
                                ]} />
                            )}
                            <Text style={[
                                tw`text-[10px] font-bold`,
                                !isOnline ? tw`text-red-600` : tw`text-gray-400`
                            ]}>
                                {!isOnline ? 'DISCONNECTED' : (profile?.full_name?.toUpperCase() || (role === 'admin' ? 'ADMIN' : 'KASIR'))}
                                {isOnline && role === 'admin' && <Text style={tw`text-green-600`}> • ONLINE</Text>}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Right Side Actions */}
                <View style={[tw`flex-row items-center`, { gap: width > 800 ? 12 : 8 }]}>

                    {/* Manual Offline Toggle (Cashier Only) */}
                    {showOfflineToggle && (
                        <View style={tw`flex-row items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100`}>
                            <View style={[
                                tw`w-2 h-2 rounded-full`,
                                isManualOffline ? tw`bg-red-500` : tw`bg-green-500`
                            ]} />
                            {width > 600 && (
                                <Text style={tw`text-xs font-semibold text-gray-600`}>
                                    {isManualOffline ? 'Mode Offline' : 'Online'}
                                </Text>
                            )}
                            <Switch
                                value={isManualOffline}
                                onValueChange={toggleOfflineMode}
                                trackColor={{ false: '#cbd5e1', true: '#ef4444' }}
                                thumbColor={isManualOffline ? '#fff' : '#f8fafc'}
                                style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                            />
                        </View>
                    )}

                    {/* Navigation Icons (Responsive) */}
                    {width >= 600 ? (
                        /* Tablet / Desktop: Show All Icons */
                        <View style={[tw`flex-row items-center`, { gap: width > 800 ? 8 : 4 }]}>
                            <Link href="/customers" asChild>
                                <TouchableOpacity style={tw`p-2 rounded-full bg-slate-50 active:bg-slate-100`}>
                                    <Users size={width > 800 ? 22 : 20} color="#475569" />
                                </TouchableOpacity>
                            </Link>
                            <Link href="/tables" asChild>
                                <TouchableOpacity style={tw`p-2 rounded-full bg-slate-50 active:bg-slate-100`}>
                                    <Square size={width > 800 ? 22 : 20} color="#475569" />
                                </TouchableOpacity>
                            </Link>
                            <Link href="/products" asChild>
                                <TouchableOpacity style={tw`p-2 rounded-full bg-slate-50 active:bg-slate-100`}>
                                    <Plus size={width > 800 ? 22 : 20} color="#475569" />
                                </TouchableOpacity>
                            </Link>
                            <Link href="/profile" asChild>
                                <TouchableOpacity style={tw`p-2 rounded-full bg-slate-50 active:bg-slate-100 ml-1`}>
                                    <Settings size={width > 800 ? 22 : 20} color="#1e293b" />
                                </TouchableOpacity>
                            </Link>
                        </View>
                    ) : (
                        /* Mobile: Show Menu Button */
                        <TouchableOpacity
                            onPress={() => setShowMenu(!showMenu)}
                            style={tw`p-2 bg-slate-100 rounded-full`}
                        >
                            {showMenu ? <X size={24} color="#334155" /> : <Menu size={24} color="#334155" />}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Mobile Dropdown Menu */}
            {showMenu && width < 600 && (
                <View style={[
                    tw`absolute top-full right-4 bg-white rounded-xl shadow-xl border border-gray-100 p-4 min-w-[200px]`,
                    { elevation: 5, zIndex: 1000 }
                ]}>
                    <View style={tw`gap-2`}>
                        <Link href="/customers" asChild>
                            <TouchableOpacity style={tw`p-3 rounded-lg bg-slate-50 active:bg-slate-100 flex-row items-center gap-3`} onPress={() => setShowMenu(false)}>
                                <Users size={20} color="#475569" />
                                <Text style={tw`text-base font-medium text-slate-700`}>Pelanggan</Text>
                            </TouchableOpacity>
                        </Link>
                        <Link href="/tables" asChild>
                            <TouchableOpacity style={tw`p-3 rounded-lg bg-slate-50 active:bg-slate-100 flex-row items-center gap-3`} onPress={() => setShowMenu(false)}>
                                <Square size={20} color="#475569" />
                                <Text style={tw`text-base font-medium text-slate-700`}>Meja</Text>
                            </TouchableOpacity>
                        </Link>
                        <Link href="/products" asChild>
                            <TouchableOpacity style={tw`p-3 rounded-lg bg-slate-50 active:bg-slate-100 flex-row items-center gap-3`} onPress={() => setShowMenu(false)}>
                                <Plus size={20} color="#475569" />
                                <Text style={tw`text-base font-medium text-slate-700`}>Produk</Text>
                            </TouchableOpacity>
                        </Link>
                        <Link href="/profile" asChild>
                            <TouchableOpacity style={tw`p-3 rounded-lg bg-slate-50 active:bg-slate-100 flex-row items-center gap-3`} onPress={() => setShowMenu(false)}>
                                <Settings size={20} color="#1e293b" />
                                <Text style={tw`text-base font-medium text-slate-700`}>Pengaturan</Text>
                            </TouchableOpacity>
                        </Link>
                        <TouchableOpacity
                            style={tw`p-3 rounded-lg bg-gray-50 active:bg-gray-100 flex-row items-center gap-3`}
                            onPress={handleSignOut}
                        >
                            <LogOut size={20} color="#64748b" />
                            <Text style={tw`text-base font-medium text-slate-700`}>Keluar Akun (Log Out)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <ConfirmationModal
                visible={showModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                confirmText={modalConfig.confirmText}
                cancelText={modalConfig.cancelText}
                onConfirm={modalConfig.onConfirm}
                onCancel={() => setShowModal(false)}
            />
        </View>
    );
}

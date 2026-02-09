import { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, Lock, Eye, EyeOff } from 'lucide-react-native';
import tw from 'twrnc';
import { supabase } from '../lib/supabase';
import { ConfirmationModal } from './ConfirmationModal';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: string;
    permissions?: any;
}

interface EditUserModalProps {
    visible: boolean;
    user: Profile | null;
    onClose: () => void;
    onSave: () => void;
}

export function EditUserModal({ visible, user, onClose, onSave }: EditUserModalProps) {
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
    const [permissions, setPermissions] = useState<any>({
        history: true,
        reports: false,
        products: false,
        store: false,
        users: false,
        purchases: true
    });
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    // Notification State
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning'
    });

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setRole((user.role as 'admin' | 'cashier') || 'cashier');
            if (user.permissions) {
                setPermissions(user.permissions);
            } else {
                // Default perms if none exist
                setPermissions({
                    history: true,
                    reports: false,
                    products: false,
                    store: false,
                    users: false,
                    purchases: true
                });
            }
            setPassword(''); // Reset password field
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Update Profile (Name, Role, Permissions)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    role,
                    permissions: role === 'admin' ? null : permissions
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 2. Update Password (if provided)
            if (password) {
                if (password.length < 6) {
                    throw new Error('Password baru minimal 6 karakter');
                }
                const { error: passwordError } = await supabase.rpc('update_user_password', {
                    target_user_id: user.id,
                    new_password: password
                });

                if (passwordError) throw passwordError;
            }

            setModalConfig({
                title: 'Sukses',
                message: 'Data pengguna berhasil diperbarui.',
                type: 'success'
            });
            setShowModal(true);
        } catch (error: any) {
            setModalConfig({
                title: 'Gagal',
                message: error.message || 'Gagal menyimpan perubahan.',
                type: 'danger'
            });
            setShowModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleModalConfirm = () => {
        setShowModal(false);
        if (modalConfig.type === 'success') {
            onSave();
            onClose();
        }
    };

    return (
        <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                <View style={tw`bg-white w-full max-w-sm rounded-xl p-6`}>
                    <View style={tw`flex-row justify-between items-center mb-4`}>
                        <Text style={tw`text-lg font-bold text-gray-900`}>Edit Pengguna</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Email</Text>
                    <TextInput
                        value={user?.email}
                        editable={false}
                        style={tw`border border-gray-200 rounded-lg p-3 bg-gray-50 text-gray-500 mb-4`}
                    />

                    <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Nama Lengkap</Text>
                    <TextInput
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Nama Lengkap"
                        style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
                    />

                    <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Password Baru (Opsional)</Text>
                    <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-3 mb-4`}>
                        <Lock size={18} color="#9ca3af" />
                        <TextInput
                            style={tw`flex-1 p-3 ml-1`}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Isi untuk ganti password"
                            secureTextEntry={!isPasswordVisible}
                        />
                        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                            {isPasswordVisible ? (
                                <EyeOff size={20} color="#6b7280" />
                            ) : (
                                <Eye size={20} color="#6b7280" />
                            )}
                        </TouchableOpacity>
                    </View>

                    {role === 'cashier' && (
                        <View style={tw`mb-4`}>
                            <Text style={tw`text-sm font-bold text-gray-700 mb-3`}>Izin Akses Kasir</Text>
                            <View style={tw`flex-row flex-wrap gap-2`}>
                                {[
                                    { id: 'history', label: 'Riwayat' },
                                    { id: 'reports', label: 'Laporan' },
                                    { id: 'products', label: 'Produk' },
                                    { id: 'store', label: 'Toko' },
                                    { id: 'users', label: 'User' },
                                    { id: 'purchases', label: 'Stok' },
                                ].map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => setPermissions({ ...permissions, [item.id]: !permissions[item.id] })}
                                        style={[
                                            tw`flex-row items-center gap-1.5 px-3 py-2 rounded-lg border`,
                                            permissions[item.id] ? tw`bg-blue-50 border-blue-200` : tw`bg-gray-50 border-gray-200`
                                        ]}
                                    >
                                        <View style={[tw`w-4 h-4 rounded border items-center justify-center`, permissions[item.id] ? tw`bg-blue-600 border-blue-600` : tw`bg-white border-gray-300`]}>
                                            {permissions[item.id] && <Text style={tw`text-[10px] text-white font-bold`}>✓</Text>}
                                        </View>
                                        <Text style={[tw`text-xs font-medium`, permissions[item.id] ? tw`text-blue-700` : tw`text-gray-500`]}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Peran (Role)</Text>
                    <View style={tw`flex-row gap-3 mb-6`}>
                        <TouchableOpacity
                            onPress={() => setRole('cashier')}
                            style={[
                                tw`flex-1 py-2 px-3 rounded-lg border flex-row items-center justify-center gap-2`,
                                role === 'cashier' ? tw`bg-blue-50 border-blue-500` : tw`bg-white border-gray-200`
                            ]}
                        >
                            <View style={[tw`w-4 h-4 rounded-full border items-center justify-center`, role === 'cashier' ? tw`border-blue-600` : tw`border-gray-300`]}>
                                {role === 'cashier' && <View style={tw`w-2 h-2 rounded-full bg-blue-600`} />}
                            </View>
                            <Text style={[tw`font-medium text-sm`, role === 'cashier' ? tw`text-blue-700` : tw`text-gray-600`]}>Kasir</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setRole('admin')}
                            style={[
                                tw`flex-1 py-2 px-3 rounded-lg border flex-row items-center justify-center gap-2`,
                                role === 'admin' ? tw`bg-blue-50 border-blue-500` : tw`bg-white border-gray-200`
                            ]}
                        >
                            <View style={[tw`w-4 h-4 rounded-full border items-center justify-center`, role === 'admin' ? tw`border-blue-600` : tw`border-gray-300`]}>
                                {role === 'admin' && <View style={tw`w-2 h-2 rounded-full bg-blue-600`} />}
                            </View>
                            <Text style={[tw`font-medium text-sm`, role === 'admin' ? tw`text-blue-700` : tw`text-gray-600`]}>Admin</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        style={tw`bg-blue-600 py-3 rounded-lg flex-row justify-center items-center`}
                    >
                        {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={tw`text-white font-bold`}>Simpan Perubahan</Text>}
                    </TouchableOpacity>
                </View>

                {/* Internal Notification Modal */}
                <ConfirmationModal
                    visible={showModal}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                    confirmText="OK"
                    cancelText={null}
                    onConfirm={handleModalConfirm}
                    onCancel={() => { }}
                />
            </View>
        </Modal>
    );
}

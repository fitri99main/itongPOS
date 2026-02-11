import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform, SafeAreaView, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { useLicense } from '../context/LicenseContext';
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react-native';
import tw from 'twrnc';
import { ConfirmationModal } from '../components/ConfirmationModal';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
    const { signIn, signUp } = useAuth();
    const { isActivated, daysLeft } = useLicense();
    const router = useRouter();
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalConfig, setStatusModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
        confirmText: 'OK',
        onConfirm: () => setShowStatusModal(false)
    });

    // Reset password visibility when switching modes
    useEffect(() => {
        setShowPassword(false);
    }, [isLogin]);

    const handleSubmit = async () => {
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await signIn(email, password);
                if (error) {
                    setStatusModalConfig({
                        title: 'Login Gagal',
                        message: error.message,
                        type: 'danger',
                        confirmText: 'Coba Lagi',
                        onConfirm: () => setShowStatusModal(false)
                    });
                    setShowStatusModal(true);
                }
            } else {
                const { error } = await signUp(email, password);
                if (error) {
                    setStatusModalConfig({
                        title: 'Registrasi Gagal',
                        message: error.message,
                        type: 'danger',
                        confirmText: 'Coba Lagi',
                        onConfirm: () => setShowStatusModal(false)
                    });
                    setShowStatusModal(true);
                } else {
                    setStatusModalConfig({
                        title: 'Registrasi Berhasil!',
                        message: 'Silakan cek email untuk verifikasi akun.',
                        type: 'success',
                        confirmText: 'Siap!',
                        onConfirm: () => {
                            setShowStatusModal(false);
                            setIsLogin(true);
                        }
                    });
                    setShowStatusModal(true);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={tw`flex-1`}
            >
                <ScrollView
                    contentContainerStyle={tw`flex-grow justify-center px-6 py-10`}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={tw`w-full max-w-sm mx-auto`}>
                        {/* Header Section */}
                        <View style={tw`mb-8 items-center`}>
                            <View style={tw`bg-black w-28 h-28 rounded-full shadow-xl items-center justify-center overflow-hidden border-2 border-slate-800 mb-2`}>
                                <Image
                                    source={require('../assets/login-logo.png')}
                                    style={tw`w-20 h-20`}
                                    resizeMode="contain"
                                />
                            </View>
                            {!isLogin && (
                                <Text style={tw`text-3xl font-black text-slate-800 tracking-tight`}>
                                    Buat Akun
                                </Text>
                            )}
                            {isLogin && (
                                <Text style={tw`text-3xl font-black text-slate-800 tracking-tight mb-1`}>
                                    itongPOS
                                </Text>
                            )}
                            <Text style={tw`text-base text-slate-500 text-center px-4`}>
                                {isLogin ? 'solusi smart kasir anda' : 'Mulai perjalanan bisnis Anda hari ini.'}
                            </Text>
                        </View>

                        {/* Card Container */}
                        <View style={tw`bg-white rounded-[40px] p-8 shadow-2xl shadow-slate-200 border-2 border-black`}>
                            {/* Form Section */}
                            <View style={tw`gap-6`}>
                                {/* Identifier Input */}
                                <View>
                                    <Text style={tw`text-slate-800 font-bold mb-2 ml-1 text-sm`}>Username atau Email</Text>
                                    <View style={[
                                        tw`flex-row items-center bg-slate-50 border-2 rounded-3xl px-5 h-16`,
                                        focusedField === 'email' ? tw`border-blue-500 bg-white` : tw`border-slate-100`
                                    ]}>
                                        <Mail size={18} color={focusedField === 'email' ? "#3b82f6" : "#94a3b8"} />
                                        <TextInput
                                            placeholder="Username atau Email"
                                            placeholderTextColor="#94a3b8"
                                            value={email}
                                            onFocus={() => setFocusedField('email')}
                                            onBlur={() => setFocusedField(null)}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            style={tw`flex-1 h-full ml-3 text-slate-900 text-base font-semibold`}
                                        />
                                    </View>
                                </View>

                                {/* Password Input */}
                                <View>
                                    <Text style={tw`text-slate-800 font-bold mb-2 ml-1 text-sm`}>Kata Sandi</Text>
                                    <View style={[
                                        tw`flex-row items-center bg-slate-50 border-2 rounded-3xl px-5 h-16`,
                                        focusedField === 'password' ? tw`border-blue-500 bg-white` : tw`border-slate-100`
                                    ]}>
                                        <Lock size={18} color={focusedField === 'password' ? "#3b82f6" : "#94a3b8"} />
                                        <TextInput
                                            placeholder="••••••••"
                                            placeholderTextColor="#94a3b8"
                                            value={password}
                                            onFocus={() => setFocusedField('password')}
                                            onBlur={() => setFocusedField(null)}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                            style={tw`flex-1 h-full ml-3 text-slate-900 text-base font-semibold`}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            {showPassword ? (
                                                <EyeOff size={18} color="#3b82f6" />
                                            ) : (
                                                <Eye size={18} color="#94a3b8" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {isLogin && (
                                    <TouchableOpacity style={tw`self-end px-1`}>
                                        <Text style={tw`text-blue-600 font-bold text-xs`}>Lupa Password?</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Action Button */}
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                    style={tw`bg-black h-16 rounded-3xl items-center justify-center flex-row shadow-lg shadow-slate-300 mt-2`}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Text style={tw`text-white font-black text-lg mr-2 uppercase tracking-wide`}>
                                                {isLogin ? 'Masuk' : 'Daftar'}
                                            </Text>
                                            <ArrowRight size={20} color="white" strokeWidth={3} />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Footer / Toggle */}
                            <View style={tw`mt-8 flex-row justify-center items-center gap-1.5`}>
                                <Text style={tw`text-slate-400 font-medium text-xs`}>
                                    {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
                                </Text>
                                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                                    <Text style={tw`text-blue-600 font-extrabold text-xs`}>
                                        {isLogin ? 'Daftar Sekarang' : 'Masuk Sekarang'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* License Status Indicator */}
                        <View style={tw`mt-12 items-center`}>
                            <TouchableOpacity
                                onPress={() => router.push('/activate')}
                                style={tw`flex-row items-center bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100`}
                            >
                                <View style={tw`w-2 h-2 rounded-full ${isActivated ? 'bg-green-500' : (daysLeft > 0 ? 'bg-blue-500' : 'bg-red-500')} mr-2.5`} />
                                {isActivated ? (
                                    <View style={tw`flex-row items-center`}>
                                        <ShieldCheck size={14} color="#16a34a" />
                                        <Text style={tw`text-slate-800 text-[10px] font-black ml-1.5 uppercase tracking-widest`}>FULL VERSION</Text>
                                    </View>
                                ) : (
                                    <View style={tw`flex-row items-center`}>
                                        <ShieldAlert size={14} color={daysLeft > 0 ? "#2563eb" : "#dc2626"} />
                                        <Text style={[
                                            tw`text-[10px] font-black ml-1.5 uppercase tracking-widest`,
                                            daysLeft > 0 ? tw`text-black` : tw`text-red-600`
                                        ]}>
                                            TRIAL: {daysLeft} HARI LAGI
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <ConfirmationModal
                visible={showStatusModal}
                title={statusModalConfig.title}
                message={statusModalConfig.message}
                type={statusModalConfig.type}
                confirmText={statusModalConfig.confirmText}
                cancelText={null}
                onConfirm={statusModalConfig.onConfirm}
                onCancel={() => setShowStatusModal(false)}
            />
        </SafeAreaView>
    );
}

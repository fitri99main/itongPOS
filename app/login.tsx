import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform, SafeAreaView, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { useLicense } from '../context/LicenseContext';
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react-native';
import tw from 'twrnc';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { signIn, signUp } = useAuth();
    const { isActivated, daysLeft } = useLicense();
    const router = useRouter();

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
                    Alert.alert('Login gagal', error.message);
                }
            } else {
                const { error } = await signUp(email, password);
                if (error) {
                    Alert.alert('Registrasi gagal', error.message);
                } else {
                    Alert.alert('Registrasi berhasil!', 'Silakan cek email untuk verifikasi akun.');
                    setIsLogin(true);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={tw`flex-1`}
            >
                <ScrollView
                    contentContainerStyle={tw`flex-grow justify-center px-6`}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={tw`w-full max-w-sm mx-auto`}>
                        {/* Header Section */}
                        <View style={tw`mb-10`}>
                            <View style={tw`self-center mb-6 bg-black p-4 rounded-2xl shadow-sm`}>
                                <Image
                                    source={require('../assets/login-logo.png')}
                                    style={tw`w-48 h-32`}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={tw`text-4xl font-bold text-gray-300 tracking-tight mb-2`}>
                                {isLogin ? 'Bismillah, Silehah masok...' : 'Buat Akun,'}
                            </Text>
                            <Text style={tw`text-lg text-gray-500`}>
                                {isLogin ? '' : 'Mulai perjalanan bisnis Anda hari ini.'}
                            </Text>
                        </View>

                        {/* Form Section */}
                        <View style={tw`gap-5`}>
                            {/* Identifier Input */}
                            <View>
                                <Text style={tw`text-gray-700 font-medium mb-2 ml-1`}>Username atau Email</Text>
                                <View style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14`}>
                                    <Mail size={20} color="#9ca3af" />
                                    <TextInput
                                        placeholder="Username, Nama Lengkap, atau Email"
                                        placeholderTextColor="#9ca3af"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        style={tw`flex-1 ml-3 text-gray-900 text-base`}
                                    />
                                </View>
                            </View>

                            {/* Password Input */}
                            <View>
                                <Text style={tw`text-gray-700 font-medium mb-2 ml-1`}>Password</Text>
                                <View style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14`}>
                                    <Lock size={20} color="#9ca3af" />
                                    <TextInput
                                        placeholder="••••••••"
                                        placeholderTextColor="#9ca3af"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        style={tw`flex-1 ml-3 text-gray-900 text-base`}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        style={tw`p-2`}
                                    >
                                        {showPassword ? (
                                            <EyeOff size={20} color="#3b82f6" />
                                        ) : (
                                            <Eye size={20} color="#9ca3af" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Forgot Password Link (Visual Only for now) */}
                            {isLogin && (
                                <TouchableOpacity style={tw`self-end`}>
                                    <Text style={tw`text-blue-600 font-medium text-sm`}>Lupa Password?</Text>
                                </TouchableOpacity>
                            )}

                            {/* Action Button */}
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={loading}
                                style={tw`bg-blue-600 h-14 rounded-2xl items-center justify-center flex-row shadow-lg shadow-blue-200 mt-2`}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={tw`text-white font-bold text-lg mr-2`}>
                                            {isLogin ? 'Masuk Sekarang' : 'Daftar Akun'}
                                        </Text>
                                        <ArrowRight size={20} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Footer / Toggle */}
                        <View style={tw`mt-10 flex-row justify-center items-center gap-1`}>
                            <Text style={tw`text-gray-500`}>
                                {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
                            </Text>
                            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                                <Text style={tw`text-blue-600 font-bold`}>
                                    {isLogin ? 'Daftar disini' : 'Masuk disini'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* License Status Indicator */}
                        <View style={tw`mt-12 items-center`}>
                            <TouchableOpacity
                                onPress={() => router.push('/activate')}
                                style={tw`flex-row items-center bg-gray-50 px-4 py-2 rounded-full border border-gray-100`}
                            >
                                {isActivated ? (
                                    <>
                                        <ShieldCheck size={14} color="#16a34a" />
                                        <Text style={tw`text-green-700 text-[10px] font-bold ml-1.5 uppercase tracking-wider`}>Versi Full Teraktivasi</Text>
                                    </>
                                ) : (
                                    <>
                                        <ShieldAlert size={14} color={daysLeft > 0 ? "#2563eb" : "#dc2626"} />
                                        <Text style={[
                                            tw`text-[10px] font-bold ml-1.5 uppercase tracking-wider`,
                                            daysLeft > 0 ? tw`text-blue-700` : tw`text-red-700`
                                        ]}>
                                            Mode Trial: {daysLeft} Hari Lagi
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

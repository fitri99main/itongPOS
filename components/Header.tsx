import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Store, Settings, Plus, Users, Square } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import tw from 'twrnc';
import { NetworkStatus } from './NetworkStatus';

export function Header() {
    const { signOut } = useAuth();
    const insets = useSafeAreaInsets();

    return (
        <View style={{ paddingTop: insets.top, backgroundColor: 'white' }}>
            <View style={tw`flex-row items-center justify-between border-b border-gray-200 px-4 py-3 shadow-sm`}>
                <View style={tw`flex-row items-center gap-3`}>
                    <View style={tw`flex-row items-center`}>
                        <View>
                            <Text style={tw`font-bold text-lg text-gray-900`}>WUDKopi</Text>
                            <Text style={tw`text-xs text-gray-500`}>kasir</Text>
                        </View>
                        <NetworkStatus />
                    </View>
                </View>

                <View style={tw`flex-row items-center gap-3`}>
                    <Link href="/customers" asChild>
                        <TouchableOpacity
                            style={tw`p-2 rounded-xl bg-purple-50 border border-purple-100 mr-2`}
                        >
                            <Users size={20} color="#9333ea" />
                        </TouchableOpacity>
                    </Link>
                    <Link href="/tables" asChild>
                        <TouchableOpacity
                            style={tw`p-2 rounded-xl bg-orange-50 border border-orange-100 mr-2`}
                        >
                            <Square size={20} color="#f97316" />
                        </TouchableOpacity>
                    </Link>
                    <Link href="/products" asChild>
                        <TouchableOpacity
                            style={tw`p-2 rounded-xl bg-blue-50 border border-blue-100 mr-2`}
                        >
                            <Plus size={20} color="#2563eb" />
                        </TouchableOpacity>
                    </Link>
                    <Link href="/profile" asChild>
                        <TouchableOpacity
                            style={tw`p-2 rounded-xl bg-gray-100`}
                        >
                            <Settings size={20} color="#374151" />
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </View>
    );
}

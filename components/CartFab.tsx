import { TouchableOpacity, View, Text } from 'react-native';
import { ShoppingCart, ShoppingBag } from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { useRouter } from 'expo-router';
import tw from 'twrnc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function CartFab() {
    const { itemCount, total } = useCart();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Hide if empty
    if (itemCount === 0) return null;

    return (
        <View style={[
            tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 elevation-10`,
            { paddingBottom: insets.bottom + 16, paddingTop: 16, paddingHorizontal: 16 }
        ]}>
            <TouchableOpacity
                style={tw`bg-gray-900 rounded-xl p-4 flex-row items-center justify-between shadow-lg`}
                activeOpacity={0.8}
                onPress={() => router.push('/cart')}
            >
                {/* Left: Count */}
                <View style={tw`flex-row items-center gap-3`}>
                    <View style={tw`bg-gray-800 rounded-lg h-10 w-10 items-center justify-center`}>
                        <Text style={tw`text-white font-bold text-lg`}>{itemCount}</Text>
                    </View>
                    <View>
                        <Text style={tw`text-gray-400 text-xs`}>Total</Text>
                        <Text style={tw`text-white font-bold text-lg`}>
                            Rp {total.toLocaleString('id-ID')}
                        </Text>
                    </View>
                </View>

                {/* Right: Icon */}
                <View style={tw`flex-row items-center gap-2`}>
                    <Text style={tw`text-white font-bold`}>Bayar</Text>
                    <ShoppingBag size={20} color="white" />
                </View>
            </TouchableOpacity>
        </View>
    );
}

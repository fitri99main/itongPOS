import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { Plus } from 'lucide-react-native';
import tw from 'twrnc';

export function ProductCardModern({ product }: { product: Product }) {
    const { addItem } = useCart();

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => addItem(product)}
            style={[tw`bg-white rounded-xl shadow-sm mb-3 mx-1 flex-1 overflow-hidden elevation-1`]}
        >
            <View style={tw`h-28 bg-slate-50 relative items-center justify-center`}>
                {product.image_url ? (
                    <Image source={{ uri: product.image_url }} style={tw`w-full h-full`} resizeMode="cover" />
                ) : (
                    <View style={tw`w-full h-full items-center justify-center bg-slate-100`}>
                        <Text style={tw`text-xl font-black text-slate-300 opacity-50`}>
                            {product.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                        </Text>
                    </View>
                )}
                {/* Floating Add Button */}
                <View style={tw`absolute bottom-1 right-1 bg-gray-900 rounded-full p-1.5 shadow-lg elevation-4`}>
                    <Plus size={14} color="white" strokeWidth={3} />
                </View>
            </View>

            <View style={tw`p-2`}>
                <Text style={tw`font-bold text-slate-800 text-[10px] mb-0.5 leading-tight`} numberOfLines={2}>
                    {product.name}
                </Text>
                <Text style={tw`text-blue-600 font-extrabold text-[10px]`}>
                    Rp {product.price.toLocaleString('id-ID')}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

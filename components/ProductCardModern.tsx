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
            style={tw`bg-white rounded-2xl shadow-sm mb-4 mx-1.5 w-[30%] overflow-hidden elevation-2`}
        >
            <View style={tw`h-32 bg-slate-50 relative items-center justify-center`}>
                {product.image_url ? (
                    <Image source={{ uri: product.image_url }} style={tw`w-full h-full`} resizeMode="cover" />
                ) : (
                    <View style={tw`w-full h-full items-center justify-center bg-slate-100`}>
                        <Text style={tw`text-3xl font-black text-slate-300 opacity-50`}>
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
                <View style={tw`absolute bottom-2 right-2 bg-blue-600 rounded-full p-2 shadow-lg elevation-4`}>
                    <Plus size={16} color="white" strokeWidth={3} />
                </View>
            </View>

            <View style={tw`p-3`}>
                <Text style={tw`font-bold text-slate-800 text-sm mb-1 leading-tight`} numberOfLines={2}>
                    {product.name}
                </Text>
                <Text style={tw`text-blue-600 font-extrabold text-sm`}>
                    Rp {product.price.toLocaleString('id-ID')}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

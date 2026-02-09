import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { Plus } from 'lucide-react-native';
import tw from 'twrnc';

export function ProductCard({ product }: { product: Product }) {
    const { addItem } = useCart();

    return (
        <View style={tw`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-3 mx-1 w-[31%]`}>
            <View style={tw`h-32 bg-gray-100 items-center justify-center`}>
                {product.image_url ? (
                    <Image source={{ uri: product.image_url }} style={tw`w-full h-full`} resizeMode="cover" />
                ) : (
                    <View style={tw`w-full h-full bg-gray-200 items-center justify-center`}>
                        <Text style={tw`text-4xl font-bold text-gray-400`}>
                            {product.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            <View style={tw`p-3`}>
                <Text style={tw`font-semibold text-gray-900 text-sm mb-1`} numberOfLines={2}>
                    {product.name}
                </Text>
                <Text style={tw`text-blue-600 font-bold text-sm mb-2`}>
                    Rp {product.price.toLocaleString('id-ID')}
                </Text>

                <TouchableOpacity
                    onPress={() => addItem(product)}
                    style={tw`bg-blue-600 rounded-lg py-2 flex-row justify-center items-center gap-1 active:opacity-80`}
                >
                    <Plus size={16} color="white" />
                    <Text style={tw`text-white text-xs font-bold`}>Tambah</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

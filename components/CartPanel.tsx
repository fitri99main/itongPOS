import { View, Text, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react-native';
import tw from 'twrnc';
import { ActionButtons } from './ActionButtons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export function CartPanel() {
    const { items, updateQuantity, removeItem, total, subtotal, discount, clearCart } = useCart();
    const insets = useSafeAreaInsets();
    const router = useRouter(); // Need to import useRouter inside CartPanel if not there

    const handleCheckout = () => {
        router.push('/checkout/payment');
    };

    if (items.length === 0) {
        return (
            <View style={[tw`flex-1 bg-white items-center justify-center p-4 border-l border-gray-200`, { paddingTop: insets.top }]}>
                <View style={tw`bg-gray-100 p-6 rounded-full mb-4`}>
                    <ShoppingBag size={48} color="#9ca3af" />
                </View>
                <Text style={tw`text-xl font-bold text-gray-900 mb-2`}>Keranjang Kosong</Text>
                <Text style={tw`text-gray-500 text-center mb-6`}>
                    Pilih produk di sebelah kiri.
                </Text>
            </View>
        );
    }

    return (
        <View style={[tw`flex-1 bg-gray-50 border-l border-gray-200`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm`}>
                <Text style={tw`text-lg font-bold text-gray-900`}>Keranjang Belanja</Text>
            </View>

            {/* Cart Items */}
            <FlatList
                data={items}
                keyExtractor={(item) => item.product.id}
                contentContainerStyle={tw`p-4 pb-48`}
                renderItem={({ item }) => (
                    <View style={tw`bg-white p-3 rounded-xl mb-3 shadow-sm flex-row gap-3 border border-gray-100`}>
                        {/* Image */}
                        <View style={tw`h-16 w-16 bg-gray-100 rounded-lg overflow-hidden`}>
                            {item.product.image_url ? (
                                <Image source={{ uri: item.product.image_url }} style={tw`w-full h-full`} resizeMode="cover" />
                            ) : (
                                <View style={tw`w-full h-full items-center justify-center`}>
                                    <Text style={tw`text-xl text-gray-400`}>{item.product.name.charAt(0)}</Text>
                                </View>
                            )}
                        </View>

                        {/* Info */}
                        <View style={tw`flex-1 justify-between py-1`}>
                            <View>
                                <Text style={tw`font-semibold text-gray-900 text-sm`} numberOfLines={1}>
                                    {item.product.name}
                                </Text>
                                <Text style={tw`text-blue-600 font-bold text-sm mt-1`}>
                                    Rp {item.product.price.toLocaleString('id-ID')}
                                </Text>
                            </View>

                            {/* Controls */}
                            <View style={tw`flex-row items-center justify-between mt-2`}>
                                <View style={tw`flex-row items-center gap-2 bg-gray-50 rounded-lg p-1`}>
                                    <TouchableOpacity
                                        onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                                        style={tw`bg-white p-1 rounded-md shadow-sm border border-gray-200`}
                                    >
                                        <Minus size={14} color="#374151" />
                                    </TouchableOpacity>

                                    <Text style={tw`font-semibold text-gray-900 w-5 text-center text-xs`}>
                                        {item.quantity}
                                    </Text>

                                    <TouchableOpacity
                                        onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                                        style={tw`bg-white p-1 rounded-md shadow-sm border border-gray-200`}
                                    >
                                        <Plus size={14} color="#374151" />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={() => removeItem(item.product.id)}
                                    style={tw`p-1.5`}
                                >
                                    <Trash2 size={16} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            />

            {/* Footer Area */}
            <View style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10 pb-24`}>
                {/* Action Buttons */}
                <ActionButtons />

                {/* Totals */}
                <View style={tw`px-4 pb-2`}>
                    {discount > 0 && (
                        <View style={tw`flex-row justify-between mb-2`}>
                            <Text style={tw`text-gray-500`}>Subtotal</Text>
                            <Text style={tw`text-gray-900`}>Rp {subtotal.toLocaleString('id-ID')}</Text>
                        </View>
                    )}

                    {discount > 0 && (
                        <View style={tw`flex-row justify-between mb-2`}>
                            <Text style={tw`text-green-600`}>Diskon</Text>
                            <Text style={tw`text-green-600 font-bold`}>- Rp {discount.toLocaleString('id-ID')}</Text>
                        </View>
                    )}

                    <View style={tw`flex-row justify-between mb-4`}>
                        <Text style={tw`text-gray-500 font-medium`}>Total Tagihan</Text>
                        <Text style={tw`text-xl font-bold text-gray-900`}>
                            Rp {total.toLocaleString('id-ID')}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleCheckout}
                        style={tw`bg-blue-600 py-3 rounded-xl items-center shadow-md active:bg-blue-700`}
                    >
                        <Text style={tw`text-white font-bold text-lg`}>Bayar Sekarang</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

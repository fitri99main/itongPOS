import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useCart } from '../context/CartContext';
import { Calculator, X, Plus } from 'lucide-react-native';
import tw from 'twrnc';

export function ManualItemModal() {
    const { addCustomItem } = useCart();
    const [visible, setVisible] = useState(false);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    const handleSubmit = () => {
        if (!name || !price) {
            Alert.alert('Error', 'Mohon isi nama dan harga item');
            return;
        }

        const priceNum = parseInt(price.replace(/[^0-9]/g, ''));
        if (isNaN(priceNum) || priceNum <= 0) {
            Alert.alert('Error', 'Harga tidak valid');
            return;
        }

        addCustomItem(name, priceNum);
        setVisible(false);
        setName('');
        setPrice('');
        Alert.alert('Sukses', 'Item manual ditambahkan ke keranjang');
    };

    return (
        <View style={tw`flex-1`}>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                style={tw`flex-1 flex-row items-center justify-center bg-orange-100 px-1 py-3 rounded-xl border border-orange-200`}
            >
                <Calculator size={16} color="#ea580c" />
                <Text style={tw`ml-1 font-bold text-orange-700 text-[10px]`}>Manual</Text>
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                    <View style={tw`bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl`}>
                        <View style={tw`flex-row justify-between items-center mb-6`}>
                            <Text style={tw`text-xl font-bold text-gray-900`}>Input Manual</Text>
                            <TouchableOpacity onPress={() => setVisible(false)} style={tw`bg-gray-100 p-2 rounded-full`}>
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={tw`gap-4`}>
                            <View>
                                <Text style={tw`text-gray-600 mb-1 font-medium`}>Nama Item</Text>
                                <TextInput
                                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg text-gray-900`}
                                    placeholder=""
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            <View>
                                <Text style={tw`text-gray-600 mb-1 font-medium`}>Harga (Rp)</Text>
                                <TextInput
                                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg text-gray-900`}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={price}
                                    onChangeText={setPrice}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={tw`bg-orange-600 py-3 rounded-xl items-center mt-2 shadow-sm`}
                            >
                                <Text style={tw`text-white font-bold text-lg`}>Tambahkan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

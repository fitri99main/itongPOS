import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Customer } from '../types';
import { useCart } from '../context/CartContext';
import { Users, X, Search, UserCheck } from 'lucide-react-native';
import tw from 'twrnc';

export function CustomerSelector() {
    const { customer, setCustomer } = useCart();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (modalVisible) {
            fetchCustomers();
        }
    }, [modalVisible]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');
            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (selectedCustomer: Customer | null) => {
        setCustomer(selectedCustomer);
        setModalVisible(false);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
    );

    return (
        <View style={tw`flex-1`}>
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={tw`flex-1 flex-row items-center justify-center bg-purple-50 border border-purple-100 px-1 py-3 rounded-xl`}
            >
                <Users size={16} color="#9333ea" />
                <Text style={tw`ml-1 font-bold text-purple-700 text-[10px]`} numberOfLines={1}>
                    {customer ? customer.name.split(' ')[0] : 'Guest'}
                </Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                    <View style={tw`bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl h-[80%]`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <Text style={tw`text-lg font-bold text-gray-900`}>Pilih Pelanggan</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        <View style={tw`bg-gray-100 px-3 py-2 rounded-xl mb-4 flex-row items-center`}>
                            <Search size={18} color="#9ca3af" />
                            <TextInput
                                placeholder="Cari nama..."
                                style={tw`flex-1 ml-2 text-gray-900`}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#9333ea" />
                        ) : (
                            <FlatList
                                data={filteredCustomers}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={tw`pb-4`}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleSelect(item)}
                                        style={[
                                            tw`flex-row items-center p-3 rounded-xl mb-2 border`,
                                            customer?.id === item.id
                                                ? tw`bg-purple-50 border-purple-200`
                                                : tw`bg-white border-gray-100`
                                        ]}
                                    >
                                        <View style={tw`h-10 w-10 bg-gray-100 rounded-full items-center justify-center mr-3`}>
                                            <Text style={tw`font-bold text-gray-500`}>
                                                {item.name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={tw`flex-1`}>
                                            <Text style={[tw`font-bold`, customer?.id === item.id ? tw`text-purple-700` : tw`text-gray-900`]}>
                                                {item.name}
                                            </Text>
                                            <Text style={tw`text-xs text-gray-400`}>{item.phone || 'No Phone'}</Text>
                                        </View>
                                        {customer?.id === item.id && (
                                            <UserCheck size={20} color="#9333ea" />
                                        )}
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={tw`text-center text-gray-400 py-4`}>
                                        Tidak ada data pelanggan.
                                    </Text>
                                }
                            />
                        )}

                        <TouchableOpacity
                            onPress={() => handleSelect(null)}
                            style={tw`mt-2 py-3 bg-gray-100 rounded-xl items-center border border-gray-200`}
                        >
                            <Text style={tw`font-bold text-gray-600`}>Set sebagai Guest</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

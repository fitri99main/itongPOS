import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Table } from '../types';
import { useCart } from '../context/CartContext';
import { Square, X, Check } from 'lucide-react-native';
import tw from 'twrnc';

export function TableSelector() {
    const { selectedTable, setSelectedTable } = useCart();
    const [tables, setTables] = useState<Table[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (modalVisible) {
            fetchTables();
        }
    }, [modalVisible]);

    const fetchTables = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .order('number');
            if (error) throw error;
            setTables(data || []);
        } catch (error) {
            console.error('Error fetching tables:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (tableNumber: string) => {
        setSelectedTable(tableNumber);
        setModalVisible(false);
    };

    return (
        <View style={tw`flex-1`}>
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={tw`flex-1 flex-row items-center justify-center bg-orange-50 border border-orange-100 px-1 py-3 rounded-xl`}
            >
                <Square size={16} color="#f97316" />
                <Text style={tw`ml-1 font-bold text-orange-700 text-[10px]`} numberOfLines={1}>
                    {selectedTable ? `Meja ${selectedTable}` : 'Meja'}
                </Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                    <View style={tw`bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <Text style={tw`text-lg font-bold text-gray-900`}>Pilih Meja</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#f97316" />
                        ) : (
                            <FlatList
                                data={tables}
                                keyExtractor={(item) => item.id}
                                numColumns={3}
                                columnWrapperStyle={tw`gap-3`}
                                contentContainerStyle={tw`pb-4`}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleSelect(item.number)}
                                        style={[
                                            tw`flex-1 aspect-square items-center justify-center rounded-xl border`,
                                            selectedTable === item.number
                                                ? tw`bg-orange-50 border-orange-500`
                                                : tw`bg-white border-gray-200`
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                tw`font-bold text-lg`,
                                                selectedTable === item.number
                                                    ? tw`text-orange-700`
                                                    : tw`text-gray-700`
                                            ]}
                                        >
                                            {item.number}
                                        </Text>
                                        <Text style={tw`text-xs text-gray-400`}>{item.capacity} Org</Text>
                                        {selectedTable === item.number && (
                                            <View style={tw`absolute top-1 right-1`}>
                                                <Check size={12} color="#f97316" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={tw`text-center text-gray-400 py-4`}>
                                        Belum ada data meja.
                                    </Text>
                                }
                            />
                        )}

                        <TouchableOpacity
                            onPress={() => handleSelect('')}
                            style={tw`mt-2 py-3 bg-gray-100 rounded-xl items-center`}
                        >
                            <Text style={tw`font-bold text-gray-600`}>Tanpa Meja (Take Away)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useCart } from '../context/CartContext';
import { Archive, X, Trash2, PlayCircle } from 'lucide-react-native';
import tw from 'twrnc';

interface RecallModalProps {
    visible: boolean;
    onClose: () => void;
}

export function RecallModal({ visible, onClose }: RecallModalProps) {
    const { heldOrders, resumeHeldOrder, removeHeldOrder } = useCart();

    const handleResume = async (id: string) => {
        await resumeHeldOrder(id);
        onClose();
    };

    const handleRemoveHeld = async (id: string) => {
        await removeHeldOrder(id);
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={tw`flex-1 bg-black/50 justify-end`}>
                <View style={tw`bg-white w-full rounded-t-3xl p-5 h-[70%]`}>
                    <View style={tw`flex-row justify-between items-center mb-4 pb-2 border-b border-gray-100`}>
                        <View style={tw`flex-row items-center gap-2`}>
                            <Archive size={24} color="#d97706" />
                            <Text style={tw`text-xl font-bold text-gray-900`}>Transactions On Hold</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={tw`bg-gray-100 p-2 rounded-full`}>
                            <X size={24} color="gray" />
                        </TouchableOpacity>
                    </View>

                    {heldOrders.length === 0 ? (
                        <View style={tw`flex-1 items-center justify-center`}>
                            <Archive size={48} color="#e5e7eb" />
                            <Text style={tw`text-gray-400 mt-4`}>Tidak ada order yang disimpan</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={heldOrders}
                            keyExtractor={item => item.id}
                            contentContainerStyle={tw`pb-10`}
                            renderItem={({ item }) => (
                                <View style={tw`bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm flex-row justify-between items-center`}>
                                    <View style={tw`flex-1`}>
                                        <View style={tw`flex-row items-center gap-2 mb-1`}>
                                            <Text style={tw`bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded`}>
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            {item.table ? (
                                                <Text style={tw`text-xs font-bold text-gray-600`}>Meja {item.table}</Text>
                                            ) : <Text style={tw`text-xs font-bold text-gray-500`}>Tanpa Meja</Text>}
                                        </View>
                                        <Text style={tw`font-bold text-lg`}>Rp {item.total.toLocaleString('id-ID')}</Text>
                                        <Text style={tw`text-gray-500 text-xs`}>{item.items.length} item • {item.customer?.name || 'Umum'}</Text>
                                        {item.note && (
                                            <Text style={tw`text-gray-500 text-xs italic mt-1`}>"{item.note}"</Text>
                                        )}
                                    </View>

                                    <View style={tw`flex-row gap-2`}>
                                        <TouchableOpacity
                                            onPress={() => handleRemoveHeld(item.id)}
                                            style={tw`p-3 bg-red-50 rounded-lg border border-red-100`}
                                        >
                                            <Trash2 size={20} color="#dc2626" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleResume(item.id)}
                                            style={tw`p-3 bg-blue-600 rounded-lg flex-row items-center gap-2 shadow-sm`}
                                        >
                                            <PlayCircle size={20} color="white" />
                                            <Text style={tw`text-white font-bold`}>Buka</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

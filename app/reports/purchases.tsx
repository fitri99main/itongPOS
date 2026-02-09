import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, ShoppingCart, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function PurchaseReportsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<any[]>([]);

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            // Fetch Purchases (Assuming 'purchases' table exists)
            // If using a different table name (e.g. 'expenses'), update here.
            const { data, error } = await supabase
                .from('purchases')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Squelch error if table not found, just show empty
                console.log('Purchase fetch error (table might usually be distinct):', error.message);
            } else {
                setPurchases(data || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Laporan Pembelian</Text>
            </View>

            {loading ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#ea580c" />
                </View>
            ) : (
                <FlatList
                    data={purchases}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={tw`p-4`}
                    ListEmptyComponent={
                        <View style={tw`items-center justify-center py-20`}>
                            <ShoppingCart size={48} color="#9ca3af" />
                            <Text style={tw`text-gray-500 mt-4`}>Belum ada data pembelian</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={tw`bg-white p-4 rounded-xl mb-3 border border-gray-200 shadow-sm`}>
                            <View style={tw`flex-row justify-between items-start mb-2`}>
                                <View>
                                    <Text style={tw`font-bold text-gray-900 text-base`}>
                                        {item.supplier_name || 'Supplier Umum'}
                                    </Text>
                                    <Text style={tw`text-xs text-gray-500`}>
                                        {formatDate(item.created_at)}
                                    </Text>
                                </View>
                                <Text style={tw`font-bold text-orange-600`}>
                                    Rp {item.total_amount?.toLocaleString('id-ID')}
                                </Text>
                            </View>
                            <Text style={tw`text-gray-500 text-xs`}>#{item.invoice_number || item.id.substring(0, 8)}</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { usePrinter } from '../../context/PrinterContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Printer, RefreshCw, Bluetooth, Check } from 'lucide-react-native';
import tw from 'twrnc';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrinterSettingsScreen() {
    const router = useRouter();
    const { devices, isScanning, scanDevices, connectPrinter, connectedDevice, printReceipt } = usePrinter();

    const handleTestPrint = async () => {
        if (!connectedDevice) {
            Alert.alert('Perhatian', 'Silakan hubungkan printer terlebih dahulu.');
            return;
        }
        await printReceipt(
            '\x1B\x40' + // Initialize
            '\x1B\x61\x01' + // Center align
            'Tes Print Berhasil!\n' +
            '--------------------------------\n' +
            'Printer Bluetooth Terhubung.\n\n\n'
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full active:bg-gray-100`}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-gray-900 ml-3`}>Pengaturan Printer</Text>
            </View>

            <View style={tw`p-4`}>
                {/* Status Card */}
                <View style={tw`bg-white p-4 rounded-xl border border-gray-200 mb-4 shadow-sm`}>
                    <View style={tw`flex-row items-center justify-between`}>
                        <View style={tw`flex-row items-center gap-3`}>
                            <View style={tw`p-3 bg-blue-50 rounded-full`}>
                                <Printer size={24} color="#2563eb" />
                            </View>
                            <View>
                                <Text style={tw`text-gray-500 text-xs font-bold uppercase`}>Status Koneksi</Text>
                                <Text style={tw`text-gray-900 font-bold text-lg`}>
                                    {connectedDevice ? connectedDevice.device_name : 'Belum Terhubung'}
                                </Text>
                            </View>
                        </View>
                        {connectedDevice && (
                            <View style={tw`bg-green-100 px-3 py-1 rounded-full`}>
                                <Text style={tw`text-green-700 text-xs font-bold`}>Connected</Text>
                            </View>
                        )}
                    </View>

                    {connectedDevice && (
                        <TouchableOpacity
                            onPress={handleTestPrint}
                            style={tw`mt-4 bg-gray-100 py-3 rounded-lg items-center border border-gray-200 active:bg-gray-200`}
                        >
                            <Text style={tw`text-gray-700 font-bold`}>Tes Print</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Scan Section */}
                <View style={tw`flex-row justify-between items-center mb-3`}>
                    <Text style={tw`text-gray-900 font-bold text-base`}>Perangkat Tersedia</Text>
                    <TouchableOpacity
                        onPress={scanDevices}
                        disabled={isScanning}
                        style={tw`flex-row items-center gap-2 bg-blue-600 px-4 py-2 rounded-lg ${isScanning ? 'opacity-50' : ''}`}
                    >
                        {isScanning ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <RefreshCw size={16} color="white" />
                        )}
                        <Text style={tw`text-white font-bold text-sm`}>{isScanning ? 'Memindai...' : 'Scan Ulang'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Device List */}
                <FlatList
                    data={devices}
                    keyExtractor={(item) => item.inner_mac_address}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => connectPrinter(item)}
                            style={tw`bg-white p-4 rounded-xl border border-gray-200 mb-2 flex-row items-center justify-between active:bg-gray-50`}
                        >
                            <View style={tw`flex-row items-center gap-3`}>
                                <Bluetooth size={20} color="#4b5563" />
                                <View>
                                    <Text style={tw`text-gray-900 font-bold`}>{item.device_name || 'Unknown Device'}</Text>
                                    <Text style={tw`text-gray-500 text-xs`}>{item.inner_mac_address}</Text>
                                </View>
                            </View>
                            {connectedDevice?.inner_mac_address === item.inner_mac_address && (
                                <Check size={20} color="#16a34a" />
                            )}
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={tw`items-center justify-center py-8 bg-white rounded-xl border border-dashed border-gray-300`}>
                            <Text style={tw`text-gray-400 text-center`}>Tidak ada perangkat ditemukan.{'\n'}Pastikan bluetooth aktif.</Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
}

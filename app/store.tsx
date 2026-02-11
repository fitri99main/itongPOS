import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Store, Printer, Save, MapPin, Phone, FileText, CreditCard, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { supabase } from '../lib/supabase';

import { ConfirmationModal } from '../components/ConfirmationModal';
import { ReceiptPreview } from '../components/ReceiptPreview';
import { useOffline } from '../context/OfflineContext';

import { useStore } from '../context/StoreContext';
import * as Speech from 'expo-speech';

export default function StoreScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { settings, updateSettings, loading: storeLoading } = useStore();

    const [loading, setLoading] = useState(false); // Using storeLoading instead mostly
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const { isManualOffline, setManualOffline } = useOffline();

    // Local form state - initialized from context
    const [storeName, setStoreName] = useState(settings.storeName);
    const [storeAddress, setStoreAddress] = useState(settings.storeAddress);
    const [storePhone, setStorePhone] = useState(settings.storePhone);
    const [openTime, setOpenTime] = useState(settings.openTime);
    const [closeTime, setCloseTime] = useState(settings.closeTime);
    const [footerMessage, setFooterMessage] = useState(settings.footerMessage);

    // Printer Settings
    const [autoPrint, setAutoPrint] = useState(settings.autoPrint);
    const [paperSize, setPaperSize] = useState(settings.paperSize);

    // Payment Methods
    const [enableQris, setEnableQris] = useState(settings.enableQris);
    const [enableTransfer, setEnableTransfer] = useState(settings.enableTransfer);
    const [enableDebit, setEnableDebit] = useState(settings.enableDebit);
    const [enableCredit, setEnableCredit] = useState(settings.enableCredit);

    // Receipt Content Settings
    const [showTableNumber, setShowTableNumber] = useState(settings.showTableNumber);
    const [showCustomerName, setShowCustomerName] = useState(settings.showCustomerName);
    const [showCashierName, setShowCashierName] = useState(settings.showCashierName);
    const [showServerName, setShowServerName] = useState(settings.showServerName);
    const [showOrderDate, setShowOrderDate] = useState(settings.showOrderDate);
    const [showDiscount, setShowDiscount] = useState(settings.showDiscount);
    const [showPreviewBeforePay, setShowPreviewBeforePay] = useState(settings.showPreviewBeforePay);

    // UI Toggles
    const [showTable, setShowTable] = useState(settings.showTable);
    const [showRecall, setShowRecall] = useState(settings.showRecall);
    const [showGuest, setShowGuest] = useState(settings.showGuest);
    const [showManual, setShowManual] = useState(settings.showManual);
    const [enforceShift, setEnforceShift] = useState(settings.enforceShift);
    const [enableGreeting, setEnableGreeting] = useState(settings.enableGreeting);

    // Update local state when remote settings change (realtime)
    useEffect(() => {
        setStoreName(settings.storeName);
        setStoreAddress(settings.storeAddress);
        setStorePhone(settings.storePhone);
        setOpenTime(settings.openTime);
        setCloseTime(settings.closeTime);
        setFooterMessage(settings.footerMessage);
        setAutoPrint(settings.autoPrint);
        setPaperSize(settings.paperSize);
        setEnableQris(settings.enableQris);
        setEnableTransfer(settings.enableTransfer);
        setEnableDebit(settings.enableDebit);
        setEnableCredit(settings.enableCredit);
        setShowTableNumber(settings.showTableNumber);
        setShowCustomerName(settings.showCustomerName);
        setShowCashierName(settings.showCashierName);
        setShowServerName(settings.showServerName);
        setShowOrderDate(settings.showOrderDate);
        setShowDiscount(settings.showDiscount);
        setShowPreviewBeforePay(settings.showPreviewBeforePay);
        setShowTable(settings.showTable);
        setShowRecall(settings.showRecall);
        setShowGuest(settings.showGuest);
        setShowManual(settings.showManual);
        setEnforceShift(settings.enforceShift);
        setEnableGreeting(settings.enableGreeting);
    }, [settings]);

    // Notification Modal State
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalConfig, setStatusModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
        onConfirm: () => { }
    });

    // ...

    // Unified save function using StoreContext
    const handleSave = async () => {
        setSaving(true);
        try {
            console.log('Saving store settings via context...');
            const success = await updateSettings({
                storeName,
                storeAddress,
                storePhone,
                openTime,
                closeTime,
                autoPrint,
                paperSize,
                footerMessage,
                enableQris,
                enableTransfer,
                enableDebit,
                enableCredit,
                showTableNumber,
                showCustomerName,
                showCashierName,
                showServerName,
                showOrderDate,
                showDiscount,
                showPreviewBeforePay,
                showTable,
                showRecall,
                showGuest,
                showManual,
                enforceShift,
                enableGreeting
            });

            if (!success) throw new Error('Gagal sync ke database');

            setStatusModalConfig({
                title: 'Sukses',
                message: 'Pengaturan toko berhasil disimpan',
                type: 'success',
                onConfirm: () => {
                    setShowStatusModal(false);
                    router.back();
                }
            });
            setShowStatusModal(true);
        } catch (error: any) {
            console.error('Save error:', error);
            setStatusModalConfig({
                title: 'Eror',
                message: `Gagal menyimpan pengaturan: ${error.message || 'Unknown error'}`,
                type: 'danger',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
        } finally {
            setSaving(false);
        }
    };

    const testGreeting = async () => {
        console.log('[Store] Testing greeting...');
        try {
            // Correct method name from expo-speech
            const voices = await Speech.getAvailableVoicesAsync();
            const hasIndonesian = voices.some((v: any) => v.language.startsWith('id'));

            console.log(`[Store] Voices found: ${voices.length}, Indonesian available: ${hasIndonesian}`);

            Speech.speak('Assalamualaikum warahmatullahi wabarakatuh', {
                language: 'id-ID',
                pitch: 1.0,
                rate: 0.9,
                onStart: () => console.log('[Store] Speech started'),
                onError: (error) => {
                    console.error('[Store] Speech error:', error);
                    setStatusModalConfig({
                        title: 'Gagal Memutar',
                        message: 'Kesalahan pada sistem suara: ' + (error as any).message,
                        type: 'danger',
                        onConfirm: () => setShowStatusModal(false)
                    });
                    setShowStatusModal(true);
                }
            });

            if (voices.length === 0) {
                setStatusModalConfig({
                    title: 'Peringatan',
                    message: 'Tidak ditemukan mesin suara (TTS) pada HP ini. Pastikan "Google Speech Services" aktif di pengaturan HP.',
                    type: 'warning',
                    onConfirm: () => setShowStatusModal(false)
                });
                setShowStatusModal(true);
            } else if (!hasIndonesian) {
                setStatusModalConfig({
                    title: 'Info Suara',
                    message: 'Bahasa Indonesia tidak terdeteksi. Mencoba memutar dengan suara default.',
                    type: 'info',
                    onConfirm: () => setShowStatusModal(false)
                });
                setShowStatusModal(true);
            } else {
                setStatusModalConfig({
                    title: 'Proses Memutar',
                    message: 'Suara sedang dikirim ke speaker. Jika tetap sunyi, pastikan VOLUME MEDIA HP Anda sudah aktif.',
                    type: 'info',
                    onConfirm: () => setShowStatusModal(false)
                });
                setShowStatusModal(true);
            }
        } catch (err: any) {
            console.error('[Store] Test greeting catch:', err);
            setStatusModalConfig({
                title: 'Eror Sistem',
                message: 'Gagal memanggil mesin suara: ' + err.message,
                type: 'danger',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
        }
    };

    if (loading) {
        return (
            <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center justify-between border-b border-gray-200 shadow-sm`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                        <ArrowLeft size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Pengaturan Toko</Text>
                </View>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={tw`bg-blue-600 p-2 rounded-lg flex-row items-center gap-2 px-3 ${saving ? 'opacity-50' : ''}`}
                >
                    {saving ? <ActivityIndicator size="small" color="white" /> : <Save size={20} color="white" />}
                    <Text style={tw`text-white font-bold text-sm`}>Simpan</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={tw`p-3 pb-10`}>

                {/* Store Identity & Printer Combined Card for compactness */}
                <View style={tw`bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-3`}>
                    <Text style={tw`text-gray-900 font-bold mb-3 text-base`}>Identitas & Printer</Text>

                    <View style={tw`flex-row gap-3 mb-3`}>
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-gray-500 text-xs mb-1`}>Nama Toko</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-900 font-bold text-sm`}
                                value={storeName}
                                onChangeText={setStoreName}
                                placeholder="Nama Toko"
                            />
                        </View>
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-gray-500 text-xs mb-1`}>No. Telepon</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-900 text-sm`}
                                value={storePhone}
                                onChangeText={setStorePhone}
                                placeholder="08xx-xxxx-xxxx"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View style={tw`mb-3`}>
                        <Text style={tw`text-gray-500 text-xs mb-1`}>Alamat</Text>
                        <TextInput
                            style={tw`bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-900 h-16 text-sm`}
                            value={storeAddress}
                            onChangeText={setStoreAddress}
                            placeholder="Alamat lengkap..."
                            multiline
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={tw`flex-row gap-3 mb-3`}>
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-gray-500 text-xs mb-1`}>Buka</Text>
                            <TextInput
                                value={openTime}
                                onChangeText={setOpenTime}
                                placeholder="08:00"
                                style={tw`border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-900 text-center text-sm`}
                            />
                        </View>
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-gray-500 text-xs mb-1`}>Tutup</Text>
                            <TextInput
                                value={closeTime}
                                onChangeText={setCloseTime}
                                placeholder="22:00"
                                style={tw`border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-900 text-center text-sm`}
                            />
                        </View>
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-gray-500 text-xs mb-1`}>Kertas</Text>
                            <View style={tw`flex-row bg-gray-50 rounded-lg border border-gray-200 overflow-hidden`}>
                                <TouchableOpacity
                                    onPress={() => setPaperSize('58mm')}
                                    style={tw`flex-1 p-2 items-center ${paperSize === '58mm' ? 'bg-blue-100' : ''}`}
                                >
                                    <Text style={tw`text-xs ${paperSize === '58mm' ? 'font-bold text-blue-700' : 'text-gray-500'}`}>58</Text>
                                </TouchableOpacity>
                                <View style={tw`w-[1px] bg-gray-200`} />
                                <TouchableOpacity
                                    onPress={() => setPaperSize('80mm')}
                                    style={tw`flex-1 p-2 items-center ${paperSize === '80mm' ? 'bg-blue-100' : ''}`}
                                >
                                    <Text style={tw`text-xs ${paperSize === '80mm' ? 'font-bold text-blue-700' : 'text-gray-500'}`}>80</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={tw`mb-3`}>
                        <Text style={tw`text-gray-500 text-xs mb-1`}>Footer Struk</Text>
                        <TextInput
                            style={tw`bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-900 text-sm`}
                            value={footerMessage}
                            onChangeText={setFooterMessage}
                            placeholder="Pesan di bawah struk..."
                        />
                    </View>

                    <View style={tw`flex-row items-center justify-between pt-2 border-t border-gray-100`}>
                        <View style={tw`flex-row items-center gap-2`}>
                            <Printer size={16} color="#4b5563" />
                            <Text style={tw`text-gray-700 font-medium text-sm`}>Auto Print Struk</Text>
                        </View>
                        <Switch
                            value={autoPrint}
                            onValueChange={setAutoPrint}
                            trackColor={{ false: '#e5e7eb', true: '#BFDBFE' }}
                            thumbColor={autoPrint ? '#2563eb' : '#f3f4f6'}
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                    </View>

                    <View style={tw`flex-row items-center justify-between pt-2 border-t border-gray-100 mt-2`}>
                        <View style={tw`flex-row items-center gap-2`}>
                            <Store size={16} color="#4b5563" />
                            <Text style={tw`text-gray-700 font-medium text-sm`}>Wajib Buka Shift</Text>
                        </View>
                        <Switch
                            value={enforceShift}
                            onValueChange={setEnforceShift}
                            trackColor={{ false: '#e5e7eb', true: '#BFDBFE' }}
                            thumbColor={enforceShift ? '#2563eb' : '#f3f4f6'}
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                    </View>

                    <View style={tw`flex-row items-center justify-between pt-2 border-t border-gray-100 mt-2`}>
                        <View style={tw`flex-1`}>
                            <View style={tw`flex-row items-center gap-2`}>
                                <FileText size={16} color="#4b5563" />
                                <Text style={tw`text-gray-700 font-medium text-sm`}>Suara Salam (Buka Shift)</Text>
                            </View>
                            <Text style={tw`text-gray-400 text-[10px]`}>Suara "Assalamualaikum" saat buka kasir</Text>
                        </View>
                        <Switch
                            value={enableGreeting}
                            onValueChange={setEnableGreeting}
                            trackColor={{ false: '#e5e7eb', true: '#BFDBFE' }}
                            thumbColor={enableGreeting ? '#2563eb' : '#f3f4f6'}
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                    </View>

                    {/* Offline Mode Toggle */}
                    <View style={tw`flex-row items-center justify-between pt-3 mt-2 border-t border-gray-100`}>
                        <View style={tw`flex-1 mr-4`}>
                            <View style={tw`flex-row items-center gap-2`}>
                                <View style={[tw`w-2 h-2 rounded-full`, isManualOffline ? tw`bg-orange-500` : tw`bg-gray-300`]} />
                                <Text style={tw`text-gray-900 font-bold text-sm`}>Mode Offline</Text>
                            </View>
                            <Text style={tw`text-gray-500 text-[10px] mt-0.5`}>
                                Paksa aplikasi berjalan offline. Data akan disinkronkan saat online kembali.
                            </Text>
                        </View>
                        <Switch
                            value={isManualOffline}
                            onValueChange={(val) => setManualOffline(val)}
                            trackColor={{ false: '#e5e7eb', true: '#FED7AA' }}
                            thumbColor={isManualOffline ? '#f97316' : '#f3f4f6'}
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={testGreeting}
                        style={tw`mt-2 bg-blue-50 p-2 rounded-lg items-center border border-blue-100`}
                    >
                        <Text style={tw`text-blue-600 font-bold text-xs`}>🔊 Tes Suara Salam</Text>
                    </TouchableOpacity>
                </View>

                {/* Tampilan Menu Kasir */}
                <View style={tw`bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-3`}>
                    <Text style={tw`text-gray-900 font-bold mb-2 text-sm`}>Tampilan Menu Kasir</Text>
                    {[
                        { label: 'Pilih Meja', value: showTable, setter: setShowTable },
                        { label: 'Recall / Arsip', value: showRecall, setter: setShowRecall },
                        { label: 'Pilih Pelanggan', value: showGuest, setter: setShowGuest },
                        { label: 'Input Manual', value: showManual, setter: setShowManual },
                    ].map((item, index) => (
                        <View key={index} style={tw`flex-row items-center justify-between py-1.5 border-b border-gray-50 last:border-0`}>
                            <Text style={tw`text-gray-600 text-xs flex-1`}>{item.label}</Text>
                            <Switch
                                value={item.value}
                                onValueChange={item.setter}
                                trackColor={{ false: '#e5e7eb', true: '#BFDBFE' }}
                                thumbColor={item.value ? '#2563eb' : '#f3f4f6'}
                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                        </View>
                    ))}
                </View>

                <View style={tw`flex-row gap-3`}>
                    {/* Left Column: Receipt Info */}
                    <View style={tw`flex-1 bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-3`}>
                        <Text style={tw`text-gray-900 font-bold mb-2 text-sm`}>Tampilan Struk</Text>
                        {[
                            { label: 'No. Meja', value: showTableNumber, setter: setShowTableNumber },
                            { label: 'Nama Pelanggan', value: showCustomerName, setter: setShowCustomerName },
                            { label: 'Nama Kasir', value: showCashierName, setter: setShowCashierName },
                            { label: 'Waktu Order', value: showOrderDate, setter: setShowOrderDate },
                            { label: 'Preview Bayar', value: showPreviewBeforePay, setter: setShowPreviewBeforePay },
                        ].map((item, index) => (
                            <View key={index} style={tw`flex-row items-center justify-between py-1.5 border-b border-gray-50 last:border-0`}>
                                <Text style={tw`text-gray-600 text-xs flex-1`}>{item.label}</Text>
                                <Switch
                                    value={item.value}
                                    onValueChange={item.setter}
                                    trackColor={{ false: '#e5e7eb', true: '#BFDBFE' }}
                                    thumbColor={item.value ? '#2563eb' : '#f3f4f6'}
                                    style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                                />
                            </View>
                        ))}
                    </View>

                    {/* Right Column: Payments */}
                    <View style={tw`flex-1 bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-3`}>
                        <Text style={tw`text-gray-900 font-bold mb-2 text-sm`}>Pembayaran</Text>
                        {[
                            { label: 'QRIS', value: enableQris, setter: setEnableQris },
                            { label: 'Transfer', value: enableTransfer, setter: setEnableTransfer },
                            { label: 'Debit', value: enableDebit, setter: setEnableDebit },
                            { label: 'Kredit', value: enableCredit, setter: setEnableCredit },
                        ].map((item, index) => (
                            <View key={index} style={tw`flex-row items-center justify-between py-1.5 border-b border-gray-50 last:border-0`}>
                                <Text style={tw`text-gray-600 text-xs flex-1`}>{item.label}</Text>
                                <Switch
                                    value={item.value}
                                    onValueChange={item.setter}
                                    trackColor={{ false: '#e5e7eb', true: '#BFDBFE' }}
                                    thumbColor={item.value ? '#2563eb' : '#f3f4f6'}
                                    style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                                />
                            </View>
                        ))}
                    </View>
                </View>

                {/* Preview is heavy, maybe just a button to show modal, or keep small */}
                <TouchableOpacity
                    style={tw`bg-gray-100 p-3 rounded-xl items-center border border-gray-200 active:bg-gray-200`}
                    onPress={() => setShowPreviewModal(true)}
                >
                    <Text style={tw`text-gray-600 font-medium text-xs`}>Tap untuk Preview Struk (Popup)</Text>
                </TouchableOpacity>

                <View style={tw`items-center mt-4`}>
                    <Text style={tw`text-gray-300 text-[10px]`}>Device ID: {Math.random().toString(36).substring(7).toUpperCase()}</Text>
                </View>

            </ScrollView>

            {/* Preview Modal */}
            <Modal
                visible={showPreviewModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowPreviewModal(false)}
            >
                <View style={tw`flex-1 bg-gray-50`}>
                    <View style={tw`px-4 py-3 bg-white border-b border-gray-200 flex-row items-center justify-between`}>
                        <Text style={tw`font-bold text-lg text-gray-900`}>Preview Struk</Text>
                        <TouchableOpacity onPress={() => setShowPreviewModal(false)} style={tw`p-2 bg-gray-100 rounded-full`}>
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={tw`p-6 items-center`}>
                        <ReceiptPreview
                            storeName={storeName}
                            storeAddress={storeAddress}
                            storePhone={storePhone}
                            footerMessage={footerMessage}
                            paperSize={paperSize as '58mm' | '80mm'}
                            showTableNumber={showTableNumber}
                            showCustomerName={showCustomerName}
                            showCashierName={showCashierName}
                            showServerName={showServerName}
                            showOrderDate={showOrderDate}
                            showDiscount={showDiscount}
                            // Mock Data for Preview
                            items={[
                                { product: { name: 'Kopi Susu Gula Aren', price: 18000 }, quantity: 2 } as any,
                                { product: { name: 'Roti Bakar Coklat', price: 15000 }, quantity: 1 } as any,
                            ]}
                            subtotal={51000}
                            total={51000}
                            customer={{ name: 'Budi Santoso' } as any}
                            tableNumber="05"
                        />
                        <TouchableOpacity
                            onPress={() => setShowPreviewModal(false)}
                            style={tw`mt-8 bg-black px-6 py-3 rounded-xl`}
                        >
                            <Text style={tw`text-white font-bold`}>Tutup Preview</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            <ConfirmationModal
                visible={showStatusModal}
                title={statusModalConfig.title}
                message={statusModalConfig.message}
                type={statusModalConfig.type}
                confirmText="OK"
                cancelText={null}
                onConfirm={statusModalConfig.onConfirm}
                onCancel={() => setShowStatusModal(false)}
            />
        </View >
    );
}

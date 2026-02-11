import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions, Platform, SafeAreaView, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCart } from '../../context/CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, User, CreditCard, Banknote, Delete, Check, Wallet, QrCode, Landmark, Eye, X, Printer } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { ReceiptPreview } from '../../components/ReceiptPreview';
import { usePrinter } from '../../context/PrinterContext';
import { generateReceiptText } from '../../utils/receiptGenerator';

export default function PaymentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isTablet = width >= 768;
    const { total, subtotal, discount, customer, clearCart, createTransaction, items, selectedTable } = useCart(); // Added items & selectedTable
    const { printReceipt } = usePrinter();
    const [lastTransactionId, setLastTransactionId] = useState<string>('');

    const [receivedAmount, setReceivedAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cashless'>('cash');

    // Configurable Non-Cash Methods
    const [enabledMethods, setEnabledMethods] = useState({
        qris: true,
        transfer: true,
        debit: true,
        credit: true
    });
    const [selectedCashlessType, setSelectedCashlessType] = useState<string>('');

    const [change, setChange] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    // Notification State
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
        action: 'none' as 'none' | 'success' | 'error'
    });

    // Preview State
    const [showPreview, setShowPreview] = useState(false);
    const [storeSettings, setStoreSettings] = useState({
        storeName: 'Nama Toko',
        storeAddress: 'Alamat Toko',
        storePhone: '',
        footerMessage: '',
        showTableNumber: true,
        showCustomerName: true,
        showCashierName: true,
        showServerName: true,
        showOrderDate: true,
        showDiscount: true,
        showPreviewBeforePay: false,
        paperSize: '58mm' as '58mm' | '80mm'
    });

    // Track if preview is opened for payment confirmation
    const [isPreviewForConfirmation, setIsPreviewForConfirmation] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadPaymentSettings();
        }, [])
    );

    const loadPaymentSettings = async () => {
        try {
            const settings = await AsyncStorage.getItem('store_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                console.log('DEBUG: Payment Settings Loaded from Storage:', parsed);
                const newEnabled = {
                    qris: parsed.enableQris !== false,
                    transfer: parsed.enableTransfer !== false,
                    debit: parsed.enableDebit !== false,
                    credit: parsed.enableCredit !== false
                };
                setEnabledMethods(newEnabled);

                // Load Store Settings for Preview
                setStoreSettings({
                    storeName: parsed.storeName || 'Nama Toko',
                    storeAddress: parsed.storeAddress || 'Alamat Toko',
                    storePhone: parsed.storePhone || '',
                    footerMessage: parsed.footerMessage || '',
                    showTableNumber: parsed.showTableNumber !== false,
                    showCustomerName: parsed.showCustomerName !== false,
                    showCashierName: parsed.showCashierName !== false,
                    showServerName: parsed.showServerName !== false,
                    showOrderDate: parsed.showOrderDate !== false,
                    showDiscount: parsed.showDiscount !== false,
                    showPreviewBeforePay: parsed.showPreviewBeforePay || false,
                    paperSize: parsed.paperSize || '58mm'
                });

                // Auto-select first available
                if (newEnabled.qris) setSelectedCashlessType('QRIS');
                else if (newEnabled.transfer) setSelectedCashlessType('Transfer');
                else if (newEnabled.debit) setSelectedCashlessType('Debit');
                else if (newEnabled.credit) setSelectedCashlessType('Credit');
                else setSelectedCashlessType('Cashless');
            }
        } catch (error) {
            console.error('Failed to load payment settings', error);
        }
    };

    // Safety Timeout for Payment Processing
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isProcessing) {
            timer = setTimeout(() => {
                console.warn('[PaymentScreen] Processing timed out');
                setIsProcessing(false);
                setModalConfig({
                    title: 'Waktu Habis',
                    message: 'Proses pembayaran memakan waktu terlalu lama. Silakan coba lagi atau cek koneksi internet.',
                    type: 'danger',
                    action: 'error'
                });
                setShowModal(true);
            }, 15000); // 15 seconds max
        }
        return () => clearTimeout(timer);
    }, [isProcessing]);

    useEffect(() => {
        if (receivedAmount >= total) {
            setChange(receivedAmount - total);
        } else {
            setChange(0);
        }
    }, [receivedAmount, total]);

    // Input Handlers
    const handleNumPress = (num: string) => {
        const currentString = receivedAmount === 0 ? '' : receivedAmount.toString();
        if (currentString.length > 9) return;
        setReceivedAmount(parseInt(currentString + num));
    };

    const handleBackspace = () => {
        const str = receivedAmount.toString();
        setReceivedAmount(str.length <= 1 ? 0 : parseInt(str.slice(0, -1)));
    };

    const handleExactAmount = () => setReceivedAmount(total);

    const handleProcessPayment = async (forceObj?: { skipPreview?: boolean }) => {
        console.log('DEBUG: Custom Process Payment Triggered. Settings:', storeSettings.showPreviewBeforePay, 'Force:', forceObj);

        // Check for Preview Before Pay (Intercept FIRST)
        if (storeSettings.showPreviewBeforePay && !forceObj?.skipPreview) {
            console.log('DEBUG: Showing Preview Modal');
            // Alert.alert('Debug', 'Opening Preview...'); // Temporary Debug
            setIsPreviewForConfirmation(true);
            setShowPreview(true);
            return;
        }

        if (paymentMethod === 'cash' && receivedAmount < total) {
            setModalConfig({
                title: 'Kurang Bayar',
                message: 'Uang yang diterima belum cukup.',
                type: 'warning',
                action: 'error'
            });
            setShowModal(true);
            return;
        }

        setIsProcessing(true);
        const method = paymentMethod === 'cash' ? 'cash' : selectedCashlessType;
        const { success, error } = await createTransaction(method, receivedAmount);
        setIsProcessing(false);

        if (success) {
            setLastTransactionId(`TRX-${Date.now()}`);
            setModalConfig({
                title: 'Transaksi Berhasil! 🎉',
                message: paymentMethod === 'cash'
                    ? `Kembalian: ${formatCurrency(change)}`
                    : `Pembayaran ${selectedCashlessType} Diterima`,
                type: 'success',
                action: 'success'
            });
            setShowModal(true);
        } else {
            console.error(error);
            setModalConfig({
                title: 'Gagal Menyimpan Transaksi',
                message: typeof error === 'object' ? (error?.message || JSON.stringify(error)) : String(error),
                type: 'danger',
                action: 'error'
            });
            setShowModal(true);
        }
    };

    const handleModalConfirm = () => {
        setShowModal(false);
        if (modalConfig.action === 'success') {
            clearCart();
            if (router.canDismiss()) router.dismissAll();
            router.replace('/');
        }
    };

    const formatCurrency = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

    // MOBILE LAYOUT (No Scroll)
    if (!isTablet) {
        return (
            <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
                {/* 1. Header (Compact) */}
                <View style={tw`bg-white px-4 py-2 flex-row items-center justify-between border-b border-gray-200 z-10 h-14`}>
                    <View style={tw`flex-row items-center`}>
                        <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full active:bg-gray-100`}>
                            <ArrowLeft size={20} color="#1f2937" />
                        </TouchableOpacity>
                        <Text style={tw`text-base font-bold text-gray-900 ml-2`}>Pembayaran</Text>
                    </View>
                    {customer && (
                        <View style={tw`bg-blue-50 px-2 py-1 rounded text-xs`}>
                            <Text style={tw`text-blue-700 font-bold text-[10px]`}>{customer.name}</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => {
                        console.log('Opening Preview. Items:', items.length, 'Table:', selectedTable);
                        setShowPreview(true);
                    }} style={tw`ml-2 p-2 bg-gray-100 rounded-full active:bg-gray-200`}>
                        <Eye size={20} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* 2. Content Container (Flex 1) */}
                <View style={tw`flex-1 p-3 gap-2`}>

                    {/* Top: Total & Method (Side by Side) */}
                    <View style={tw`flex-row gap-2 h-24`}>
                        {/* Total Box */}
                        <View style={tw`flex-1 bg-gray-900 rounded-xl p-3 justify-center items-start shadow-sm`}>
                            <Text style={tw`text-gray-100 text-[10px] font-bold uppercase mb-1`}>Total Tagihan</Text>
                            <Text style={tw`text-2xl font-black text-white`} adjustsFontSizeToFit numberOfLines={1}>
                                {formatCurrency(total)}
                            </Text>
                            {discount > 0 && <Text style={tw`text-blue-200 text-[10px]`}>Hemat {formatCurrency(discount)}</Text>}
                        </View>

                        {/* Method Switcher */}
                        <View style={tw`w-32 bg-white rounded-xl border border-gray-200 overflow-hidden`}>
                            <TouchableOpacity onPress={() => setPaymentMethod('cash')} style={tw`flex-1 justify-center items-center ${paymentMethod === 'cash' ? 'bg-blue-50' : ''}`}>
                                <Text style={tw`font-bold ${paymentMethod === 'cash' ? 'text-blue-700' : 'text-gray-400'} text-xs`}>Tunai</Text>
                            </TouchableOpacity>
                            <View style={tw`h-[1px] bg-gray-200`} />
                            <TouchableOpacity onPress={() => setPaymentMethod('cashless')} style={tw`flex-1 justify-center items-center ${paymentMethod === 'cashless' ? 'bg-blue-50' : ''}`}>
                                <Text style={tw`font-bold ${paymentMethod === 'cashless' ? 'text-blue-700' : 'text-gray-400'} text-xs`}>Non-Tunai</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Middle: Display Screens */}
                    {paymentMethod === 'cash' ? (
                        <>
                            {/* Input / Change Display */}
                            <View style={tw`flex-row gap-2 h-16`}>
                                <View style={tw`flex-1 bg-white border border-gray-200 rounded-xl p-2 justify-center`}>
                                    <Text style={tw`text-gray-400 text-[10px] font-bold uppercase`}>Diterima</Text>
                                    <Text style={tw`text-lg font-bold text-gray-900`}>{receivedAmount === 0 ? '-' : formatCurrency(receivedAmount)}</Text>
                                </View>
                                <View style={tw`flex-1 bg-white border border-gray-200 rounded-xl p-2 justify-center ${receivedAmount >= total ? 'bg-green-50 border-green-200' : ''}`}>
                                    <Text style={tw`${receivedAmount >= total ? 'text-green-700' : 'text-gray-400'} text-[10px] font-bold uppercase`}>Kembalian</Text>
                                    <Text style={tw`text-lg font-bold ${receivedAmount >= total ? 'text-green-700' : 'text-gray-300'}`}>
                                        {formatCurrency(change)}
                                    </Text>
                                </View>
                            </View>

                            {/* Quick Amounts (Horizontal Scroll) */}
                            <View style={tw`h-10`}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`items-center`}>
                                    <TouchableOpacity onPress={handleExactAmount} style={tw`bg-blue-100 px-4 py-2 rounded-lg mr-2`}>
                                        <Text style={tw`text-blue-700 font-bold text-xs`}>Uang Pas</Text>
                                    </TouchableOpacity>
                                    {[20000, 50000, 100000].map(amt => (
                                        <TouchableOpacity key={amt} onPress={() => setReceivedAmount(amt)} style={tw`bg-white border border-gray-200 px-4 py-2 rounded-lg mr-2`}>
                                            <Text style={tw`text-gray-700 font-bold text-xs`}>{amt / 1000}k</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Numpad (Fills Remaining Space) */}
                            <View style={tw`flex-1 gap-2 pb-2`}>
                                <View style={tw`flex-1 flex-row gap-2`}>
                                    {[1, 2, 3].map(n => (
                                        <TouchableOpacity key={n} onPress={() => handleNumPress(n.toString())} style={tw`flex-1 bg-white rounded-lg justify-center items-center shadow-sm border border-gray-100`}>
                                            <Text style={tw`text-2xl font-bold text-gray-800`}>{n}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={tw`flex-1 flex-row gap-2`}>
                                    {[4, 5, 6].map(n => (
                                        <TouchableOpacity key={n} onPress={() => handleNumPress(n.toString())} style={tw`flex-1 bg-white rounded-lg justify-center items-center shadow-sm border border-gray-100`}>
                                            <Text style={tw`text-2xl font-bold text-gray-800`}>{n}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={tw`flex-1 flex-row gap-2`}>
                                    {[7, 8, 9].map(n => (
                                        <TouchableOpacity key={n} onPress={() => handleNumPress(n.toString())} style={tw`flex-1 bg-white rounded-lg justify-center items-center shadow-sm border border-gray-100`}>
                                            <Text style={tw`text-2xl font-bold text-gray-800`}>{n}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={tw`flex-1 flex-row gap-2`}>
                                    <TouchableOpacity onPress={() => setReceivedAmount(0)} style={tw`flex-1 bg-red-50 rounded-lg justify-center items-center`}>
                                        <Text style={tw`text-red-500 font-bold text-xs`}>RESET</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleNumPress('0')} style={tw`flex-1 bg-white rounded-lg justify-center items-center shadow-sm border border-gray-100`}>
                                        <Text style={tw`text-2xl font-bold text-gray-800`}>0</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleBackspace} style={tw`flex-1 bg-gray-100 rounded-lg justify-center items-center`}>
                                        <Delete size={20} color="#4b5563" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Pay Button (Float or Fixed Bottom) */}
                            <TouchableOpacity
                                onPress={() => handleProcessPayment()}
                                disabled={isProcessing}
                                style={tw`h-12 rounded-xl items-center flex-row justify-center gap-2 ${(receivedAmount >= total || storeSettings.showPreviewBeforePay) ? 'bg-gray-900 shadow-md' : 'bg-gray-300'}`}
                            >
                                <Text style={tw`text-white font-bold text-lg`}>{isProcessing ? 'MEMPROSES...' : 'BAYAR'}</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-gray-500 font-bold mb-3 uppercase text-xs tracking-wider`}>Pilih Metode Pembayaran</Text>
                            <View style={tw`flex-row flex-wrap gap-3`}>
                                {enabledMethods.qris && (
                                    <TouchableOpacity
                                        onPress={() => setSelectedCashlessType('QRIS')}
                                        style={tw`w-[48%] p-4 rounded-xl border-2 items-center justify-center gap-2 ${selectedCashlessType === 'QRIS' ? 'bg-blue-50 border-blue-600' : 'bg-white border-gray-100'}`}
                                    >
                                        <QrCode size={32} color={selectedCashlessType === 'QRIS' ? '#2563eb' : '#9ca3af'} />
                                        <Text style={tw`font-bold ${selectedCashlessType === 'QRIS' ? 'text-blue-700' : 'text-gray-500'}`}>QRIS</Text>
                                    </TouchableOpacity>
                                )}
                                {enabledMethods.transfer && (
                                    <TouchableOpacity
                                        onPress={() => setSelectedCashlessType('Transfer')}
                                        style={tw`w-[48%] p-4 rounded-xl border-2 items-center justify-center gap-2 ${selectedCashlessType === 'Transfer' ? 'bg-blue-50 border-blue-600' : 'bg-white border-gray-100'}`}
                                    >
                                        <Landmark size={32} color={selectedCashlessType === 'Transfer' ? '#2563eb' : '#9ca3af'} />
                                        <Text style={tw`font-bold ${selectedCashlessType === 'Transfer' ? 'text-blue-700' : 'text-gray-500'}`}>Transfer</Text>
                                    </TouchableOpacity>
                                )}
                                {enabledMethods.debit && (
                                    <TouchableOpacity
                                        onPress={() => setSelectedCashlessType('Debit')}
                                        style={tw`w-[48%] p-4 rounded-xl border-2 items-center justify-center gap-2 ${selectedCashlessType === 'Debit' ? 'bg-blue-50 border-blue-600' : 'bg-white border-gray-100'}`}
                                    >
                                        <CreditCard size={32} color={selectedCashlessType === 'Debit' ? '#2563eb' : '#9ca3af'} />
                                        <Text style={tw`font-bold ${selectedCashlessType === 'Debit' ? 'text-blue-700' : 'text-gray-500'}`}>Debit</Text>
                                    </TouchableOpacity>
                                )}
                                {enabledMethods.credit && (
                                    <TouchableOpacity
                                        onPress={() => setSelectedCashlessType('Credit Card')}
                                        style={tw`w-[48%] p-4 rounded-xl border-2 items-center justify-center gap-2 ${selectedCashlessType === 'Credit Card' ? 'bg-blue-50 border-blue-600' : 'bg-white border-gray-100'}`}
                                    >
                                        <CreditCard size={32} color={selectedCashlessType === 'Credit Card' ? '#2563eb' : '#9ca3af'} />
                                        <Text style={tw`font-bold ${selectedCashlessType === 'Credit Card' ? 'text-blue-700' : 'text-gray-500'}`}>Credit Card</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={tw`flex-1 justify-end pb-4 mt-4`}>
                                <View style={tw`bg-blue-50 p-4 rounded-xl mb-4 items-center`}>
                                    <Text style={tw`text-blue-800 font-medium text-center`}>
                                        Pastikan pembayaran {selectedCashlessType} sudah diterima sebelum konfirmasi.
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleProcessPayment()}
                                    style={tw`bg-gray-900 h-14 rounded-xl items-center justify-center shadow-lg`}
                                >
                                    <Text style={tw`text-white font-bold text-lg`}>{isProcessing ? 'MEMPROSES...' : `KONFIRMASI LUNAS (${selectedCashlessType})`}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                <ConfirmationModal
                    visible={showModal}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                    confirmText={modalConfig.action === 'success' ? 'Selesai' : 'OK'}
                    cancelText={null}
                    onConfirm={handleModalConfirm}
                    onCancel={() => { }}
                >
                    {modalConfig.action === 'success' && (
                        <TouchableOpacity
                            onPress={async () => {
                                const text = generateReceiptText(
                                    {
                                        id: lastTransactionId,
                                        date: new Date(),
                                        items: items,
                                        total: total,
                                        received: receivedAmount,
                                        change: change,
                                        customerName: customer?.name,
                                        tableNumber: selectedTable
                                    },
                                    storeSettings
                                );
                                await printReceipt(text);
                            }}
                            style={tw`bg-gray-100 p-3 rounded-xl flex-row items-center justify-center gap-2 border border-gray-200 active:bg-gray-200 mb-4`}
                        >
                            <Printer size={20} color="#374151" />
                            <Text style={tw`text-gray-700 font-bold`}>Cetak Struk</Text>
                        </TouchableOpacity>
                    )}
                </ConfirmationModal>

                {/* Receipt Preview Modal (Mobile) */}
                <Modal
                    visible={showPreview}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowPreview(false)}
                >
                    <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                        <View style={tw`bg-white rounded-2xl p-4 w-full max-w-sm max-h-[80%] overflow-hidden`}>
                            <View style={tw`flex-row justify-between items-center mb-4`}>
                                <Text style={tw`font-bold text-lg text-gray-900`}>Preview Struk</Text>
                                <TouchableOpacity onPress={() => setShowPreview(false)} style={tw`p-2 bg-gray-100 rounded-full`}>
                                    <X size={20} color="#374151" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView contentContainerStyle={tw`items-center pb-4`}>
                                <ReceiptPreview
                                    storeName={storeSettings.storeName}
                                    storeAddress={storeSettings.storeAddress}
                                    storePhone={storeSettings.storePhone}
                                    footerMessage={storeSettings.footerMessage}
                                    paperSize="58mm"
                                    showTableNumber={storeSettings.showTableNumber}
                                    showCustomerName={storeSettings.showCustomerName}
                                    showCashierName={storeSettings.showCashierName}
                                    showServerName={storeSettings.showServerName}
                                    showOrderDate={storeSettings.showOrderDate}
                                    showDiscount={storeSettings.showDiscount}
                                    items={items}
                                    subtotal={subtotal}
                                    discount={discount}
                                    total={total}
                                    customer={customer}
                                    tableNumber={selectedTable}
                                />
                            </ScrollView>

                            <View style={tw`w-full gap-2 mt-2`}>
                                {isPreviewForConfirmation && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setShowPreview(false);
                                            setIsPreviewForConfirmation(false);
                                            handleProcessPayment({ skipPreview: true });
                                        }}
                                        style={tw`bg-green-600 py-3 rounded-xl items-center shadow-md`}
                                    >
                                        <Text style={tw`text-white font-bold`}>Lanjut Bayar</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowPreview(false);
                                        setIsPreviewForConfirmation(false);
                                    }}
                                    style={tw`bg-gray-200 py-3 rounded-xl items-center`}
                                >
                                    <Text style={tw`text-gray-800 font-bold`}>{isPreviewForConfirmation ? 'Batal' : 'Tutup Preview'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // TABLET LAYOUT (Keep existing as it works well)
    return (
        <View style={[tw`flex-1 bg-gray-100`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm z-10`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full active:bg-gray-100`}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <View style={tw`ml-3 flex-1`}>
                    <Text style={tw`text-lg font-bold text-gray-900`}>Kasir Pembayaran</Text>
                </View>
                {customer && (
                    <View style={tw`bg-blue-50 px-3 py-1 rounded-full mr-2`}>
                        <Text style={tw`text-xs text-blue-700 font-medium`}>{customer.name}</Text>
                    </View>
                )}
                <TouchableOpacity onPress={() => setShowPreview(true)} style={tw`px-3 py-2 bg-white border border-gray-200 rounded-lg flex-row items-center gap-2 shadow-sm active:bg-gray-50`}>
                    <Eye size={16} color="#374151" />
                    <Text style={tw`text-xs font-bold text-gray-700`}>Preview Struk</Text>
                </TouchableOpacity>
            </View>

            <View style={tw`flex-1 flex-row`}>
                {/* LEFT PANEL: Summary */}
                <View style={tw`flex-1 p-6`}>
                    {/* Amount Hero */}
                    <View style={tw`p-8 rounded-3xl mb-8 bg-gray-900 shadow-lg items-center justify-center`}>
                        <Text style={tw`text-gray-100 font-medium text-xs uppercase tracking-widest mb-1`}>Total Tagihan</Text>
                        <Text style={tw`text-5xl font-black text-white`}>{formatCurrency(total)}</Text>
                        {discount > 0 && <View style={tw`bg-gray-700/50 px-3 py-1 rounded-full mt-2`}><Text style={tw`text-gray-200 text-xs`}>Hemat {formatCurrency(discount)}</Text></View>}
                    </View>

                    {/* Method Switcher */}
                    <View style={tw`bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 flex-row mb-8`}>
                        <TouchableOpacity onPress={() => setPaymentMethod('cash')} style={tw`flex-1 py-4 rounded-lg items-center flex-row justify-center gap-2 ${paymentMethod === 'cash' ? 'bg-blue-50 border border-blue-200' : ''}`}>
                            <Banknote size={24} color={paymentMethod === 'cash' ? '#2563eb' : '#9ca3af'} />
                            <Text style={tw`font-bold text-lg ${paymentMethod === 'cash' ? 'text-blue-700' : 'text-gray-400'}`}>Tunai</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setPaymentMethod('cashless')} style={tw`flex-1 py-4 rounded-lg items-center flex-row justify-center gap-2 ${paymentMethod === 'cashless' ? 'bg-blue-50 border border-blue-200' : ''}`}>
                            <CreditCard size={24} color={paymentMethod === 'cashless' ? '#2563eb' : '#9ca3af'} />
                            <Text style={tw`font-bold text-lg ${paymentMethod === 'cashless' ? 'text-blue-700' : 'text-gray-400'}`}>Non Tunai</Text>
                        </TouchableOpacity>
                    </View>

                    {paymentMethod === 'cash' && (
                        <View style={tw`gap-4`}>
                            <View style={tw`bg-white p-5 rounded-2xl border border-gray-200`}>
                                <Text style={tw`text-gray-500 text-xs font-bold uppercase mb-2`}>Uang Diterima</Text>
                                <Text style={tw`text-4xl font-bold text-gray-900`}>{receivedAmount === 0 ? 'Rp 0' : formatCurrency(receivedAmount)}</Text>
                            </View>
                            {receivedAmount >= total && (
                                <View style={tw`bg-green-50 p-5 rounded-2xl border border-green-200`}>
                                    <Text style={tw`text-green-700 text-xs font-bold uppercase mb-2`}>Kembalian</Text>
                                    <Text style={tw`text-4xl font-bold text-green-700`}>{formatCurrency(change)}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* RIGHT PANEL: Calculator */}
                {paymentMethod === 'cash' ? (
                    <View style={tw`w-96 bg-white border-l border-gray-200 p-6 shadow-xl`}>
                        <View style={tw`flex-row flex-wrap gap-2 mb-6`}>
                            <TouchableOpacity onPress={handleExactAmount} style={tw`flex-1 min-w-[30%] bg-blue-100 py-3 rounded-xl border border-blue-200 items-center justify-center`}>
                                <Text style={tw`text-blue-700 font-bold`}>Uang Pas</Text>
                            </TouchableOpacity>
                            {[20000, 50000, 100000].map(amt => (
                                <TouchableOpacity key={amt} onPress={() => setReceivedAmount(amt)} style={tw`flex-1 min-w-[20%] bg-white py-3 rounded-xl border border-gray-200 items-center justify-center active:bg-gray-50`}>
                                    <Text style={tw`text-gray-700 font-bold`}>{amt / 1000}k</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={tw`flex-1 justify-end pb-4`}>
                            <View style={tw`flex-row flex-wrap gap-3 h-full`}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <TouchableOpacity key={num} onPress={() => handleNumPress(num.toString())} style={tw`w-[31%] h-[22%] bg-white border border-gray-100 rounded-2xl items-center justify-center shadow-sm active:bg-gray-50`}>
                                        <Text style={tw`text-3xl font-bold text-gray-800`}>{num}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity onPress={() => setReceivedAmount(0)} style={tw`w-[31%] h-[22%] bg-red-50 border border-red-100 rounded-2xl items-center justify-center`}>
                                    <Text style={tw`text-red-500 font-bold text-sm`}>RESET</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleNumPress('0')} style={tw`w-[31%] h-[22%] bg-white border border-gray-100 rounded-2xl items-center justify-center shadow-sm`}>
                                    <Text style={tw`text-3xl font-bold text-gray-800`}>0</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleBackspace} style={tw`w-[31%] h-[22%] bg-gray-50 border border-gray-200 rounded-2xl items-center justify-center active:bg-gray-200`}>
                                    <Delete size={28} color="#4b5563" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => handleProcessPayment()} disabled={receivedAmount < total || isProcessing} style={tw`w-full py-5 rounded-2xl items-center shadow-lg flex-row justify-center gap-3 ${receivedAmount >= total ? 'bg-gray-900' : 'bg-gray-300'}`}>
                            <Check size={28} color="white" />
                            <Text style={tw`text-white font-bold text-xl`}>{isProcessing ? 'MEMPROSES...' : 'PROSES BAYAR'}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={tw`w-96 bg-white border-l border-gray-200 p-6 shadow-xl justify-end items-center`}>
                        <View style={tw`mb-10 items-center py-10`}>
                            <Wallet size={48} color="#2563eb" style={{ marginBottom: 16 }} />
                            <Text style={tw`text-gray-900 font-bold text-xl text-center`}>Menunggu Pembayaran...</Text>
                            <Text style={tw`text-gray-500 text-center mt-2 px-4`}>Gunakan EDC / QRIS.</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleProcessPayment()} style={tw`w-full bg-gray-900 py-4 rounded-xl items-center shadow-lg`}>
                            <Text style={tw`text-white font-bold text-lg`}>{isProcessing ? 'MEMPROSES...' : 'KONFIRMASI LUNAS'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ConfirmationModal
                visible={showModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                confirmText={modalConfig.action === 'success' ? 'Selesai' : 'OK'}
                cancelText={null}
                onConfirm={handleModalConfirm}
                onCancel={() => { }}
            >
                {modalConfig.action === 'success' && (
                    <TouchableOpacity
                        onPress={async () => {
                            const text = generateReceiptText(
                                {
                                    id: lastTransactionId,
                                    date: new Date(),
                                    items: items,
                                    total: total,
                                    received: receivedAmount,
                                    change: change,
                                    customerName: customer?.name,
                                    tableNumber: selectedTable
                                },
                                storeSettings
                            );
                            await printReceipt(text);
                        }}
                        style={tw`bg-gray-100 p-3 rounded-xl flex-row items-center justify-center gap-2 border border-gray-200 active:bg-gray-200 mb-4`}
                    >
                        <Printer size={20} color="#374151" />
                        <Text style={tw`text-gray-700 font-bold`}>Cetak Struk</Text>
                    </TouchableOpacity>
                )}
            </ConfirmationModal>

            {/* Receipt Preview Modal */}
            <Modal
                visible={showPreview}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPreview(false)}
            >
                <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                    <View style={tw`bg-white rounded-2xl p-4 w-full max-w-sm max-h-[80%] overflow-hidden`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <Text style={tw`font-bold text-lg text-gray-900`}>Preview Struk</Text>
                            <TouchableOpacity onPress={() => setShowPreview(false)} style={tw`p-2 bg-gray-100 rounded-full`}>
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={tw`items-center pb-4`}>
                            <ReceiptPreview
                                storeName={storeSettings.storeName}
                                storeAddress={storeSettings.storeAddress}
                                storePhone={storeSettings.storePhone}
                                footerMessage={storeSettings.footerMessage}
                                paperSize="58mm"
                                showTableNumber={storeSettings.showTableNumber}
                                showCustomerName={storeSettings.showCustomerName}
                                showCashierName={storeSettings.showCashierName}
                                showServerName={storeSettings.showServerName}
                                showOrderDate={storeSettings.showOrderDate}
                                showDiscount={storeSettings.showDiscount}
                                items={items}
                                subtotal={subtotal}
                                discount={discount}
                                total={total}
                                customer={customer}
                                tableNumber={selectedTable}
                            />
                        </ScrollView>

                        <View style={tw`w-full gap-2 mt-2`}>
                            {isPreviewForConfirmation && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowPreview(false);
                                        setIsPreviewForConfirmation(false);
                                        handleProcessPayment({ skipPreview: true });
                                    }}
                                    style={tw`bg-green-600 py-3 rounded-xl items-center shadow-md`}
                                >
                                    <Text style={tw`text-white font-bold`}>Lanjut Bayar</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={() => {
                                    setShowPreview(false);
                                    setIsPreviewForConfirmation(false);
                                }}
                                style={tw`bg-gray-200 py-3 rounded-xl items-center`}
                            >
                                <Text style={tw`text-gray-800 font-bold`}>{isPreviewForConfirmation ? 'Batal' : 'Tutup Preview'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

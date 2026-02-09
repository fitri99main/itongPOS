import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, StyleSheet, ScrollView } from 'react-native';
import { useCart } from '../context/CartContext';
import { Calculator, PauseCircle, Percent, SplitSquareHorizontal, X, ArrowRightCircle } from 'lucide-react-native';
import tw from 'twrnc';

export function ActionButtons() {
    const { addCustomItem, holdOrder, setDiscount, discount, total } = useCart();

    // Modals state
    const [showManual, setShowManual] = useState(false);
    const [showDiscount, setShowDiscount] = useState(false);

    // Form state
    const [customName, setCustomName] = useState('');
    const [customPrice, setCustomPrice] = useState('');
    const [discountValue, setDiscountValue] = useState('');

    // Expense State
    const [showExpense, setShowExpense] = useState(false);
    const [expenseSupplier, setExpenseSupplier] = useState('');
    const { createExpense, clearCart } = useCart();

    const handleExpenseCheckout = async () => {
        if (total <= 0) {
            Alert.alert("Eror", "Keranjang kosong");
            return;
        }

        const res = await createExpense(expenseSupplier, '');
        if (res.success) {
            Alert.alert("Sukses", "Disimpan sebagai Pengeluaran Toko");
            setShowExpense(false);
            setExpenseSupplier('');
            clearCart();
        } else {
            Alert.alert("Gagal", "Terjadi kesalahan menyimpan data");
        }
    };

    const handleAddManual = () => {
        if (!customName || !customPrice) {
            Alert.alert('Error', 'Nama dan Harga harus diisi!');
            return;
        }
        addCustomItem(customName, parseInt(customPrice));
        setCustomName('');
        setCustomPrice('');
        setShowManual(false);
    };

    const handleApplyDiscount = () => {
        if (!discountValue) return;
        const disc = parseInt(discountValue);
        setDiscount(disc);
        setDiscountValue('');
        setShowDiscount(false);
    };

    const handleSplitBill = () => {
        Alert.alert(
            "Pisah Bill",
            "Fitur ini akan membagi total tagihan untuk beberapa orang. (Mock Implementation)",
            [{ text: "OK" }]
        );
    };

    const handleHold = () => {
        Alert.alert(
            "Hold Order?",
            "Order saat ini akan disimpan dan keranjang dikosongkan.",
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Hold", onPress: () => {
                        holdOrder();
                        Alert.alert("Tersimpan", "Order berhasil disimpan!");
                    }
                }
            ]
        );
    };

    return (
        <View style={tw`bg-white border-b border-gray-100 shadow`}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`flex-row gap-2 p-3`}
            >
                {/* Manual Transaction */}
                <ActionButton
                    icon={<Calculator size={20} color="#4b5563" />}
                    label="Manual"
                    onPress={() => setShowManual(true)}
                />

                {/* Hold Order */}
                <ActionButton
                    icon={<PauseCircle size={20} color="#eab308" />}
                    label="Hold"
                    onPress={handleHold}
                    color="bg-yellow-50"
                />

                {/* Discount */}
                <ActionButton
                    icon={<Percent size={20} color="#3b82f6" />}
                    label="Diskon"
                    onPress={() => setShowDiscount(true)}
                    color="bg-blue-50"
                />

                {/* Split Bill */}
                <ActionButton
                    icon={<SplitSquareHorizontal size={20} color="#8b5cf6" />}
                    label="Split"
                    onPress={handleSplitBill}
                    color="bg-purple-50"
                />

                {/* Expense Checkout */}
                <ActionButton
                    icon={<ArrowRightCircle size={20} color="#dc2626" />} // Using ArrowRightCircle as placeholder or import ShoppingCart
                    label="Beli Stok"
                    onPress={() => setShowExpense(true)}
                    color="bg-red-50"
                />
            </ScrollView>

            {/* --- MODALS --- */}

            {/* Manual Item Modal */}
            <Modal visible={showManual} transparent animationType="fade">
                <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                    <View style={tw`bg-white w-full max-w-sm rounded-2xl p-6`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <Text style={tw`text-lg font-bold`}>Tambah Item Manual</Text>
                            <TouchableOpacity onPress={() => setShowManual(false)}>
                                <X size={24} color="gray" />
                            </TouchableOpacity>
                        </View>

                        <Text style={tw`text-gray-600 mb-1`}>Nama Item</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg p-3 mb-3 bg-gray-50`}
                            placeholder="" // Placeholder empty
                            value={customName}
                            onChangeText={setCustomName}
                        />

                        <Text style={tw`text-gray-600 mb-1`}>Harga (Rp)</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg p-3 mb-6 bg-gray-50`}
                            placeholder="0"
                            keyboardType="numeric"
                            value={customPrice}
                            onChangeText={setCustomPrice}
                        />

                        <TouchableOpacity onPress={handleAddManual} style={tw`bg-blue-600 p-3 rounded-xl items-center`}>
                            <Text style={tw`text-white font-bold`}>Tambah ke Keranjang</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Discount Modal */}
            <Modal visible={showDiscount} transparent animationType="fade">
                <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                    <View style={tw`bg-white w-full max-w-sm rounded-2xl p-6`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <Text style={tw`text-lg font-bold`}>Atur Diskon (Rp)</Text>
                            <TouchableOpacity onPress={() => setShowDiscount(false)}>
                                <X size={24} color="gray" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={tw`border border-gray-300 rounded-lg p-3 mb-6 bg-gray-50 text-center text-lg font-bold`}
                            placeholder="0"
                            keyboardType="numeric"
                            value={discountValue}
                            onChangeText={setDiscountValue}
                            autoFocus
                        />

                        <TouchableOpacity onPress={handleApplyDiscount} style={tw`bg-blue-600 p-3 rounded-xl items-center`}>
                            <Text style={tw`text-white font-bold`}>Simpan Diskon</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Expense Checkout Modal */}
            <Modal visible={showExpense} transparent animationType="fade">
                <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                    <View style={tw`bg-white w-full max-w-sm rounded-2xl p-6`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <Text style={tw`text-lg font-bold`}>Checkout sebagai Pengeluaran</Text>
                            <TouchableOpacity onPress={() => setShowExpense(false)}>
                                <X size={24} color="gray" />
                            </TouchableOpacity>
                        </View>

                        <Text style={tw`text-gray-500 mb-4`}>Item di keranjang akan dicatat sebagai pembelian stok/pengeluaran toko.</Text>

                        <Text style={tw`text-gray-600 mb-1`}>Supplier / Toko (Opsional)</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg p-3 mb-6 bg-gray-50`}
                            placeholder="Contoh: Toko Sebelah"
                            value={expenseSupplier}
                            onChangeText={setExpenseSupplier}
                        />

                        <TouchableOpacity
                            onPress={handleExpenseCheckout}
                            style={tw`bg-red-600 p-3 rounded-xl items-center`}
                        >
                            <Text style={tw`text-white font-bold`}>Simpan Pengeluaran</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function ActionButton({ icon, label, onPress, color = 'bg-gray-100' }: any) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={tw`flex-1 min-w-[70px] ${color} p-3 rounded-xl items-center justify-center gap-1 shadow-sm`}
        >
            {icon}
            <Text style={tw`text-xs font-semibold text-gray-700`}>{label}</Text>
        </TouchableOpacity>
    );
}

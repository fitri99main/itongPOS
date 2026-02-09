import { View, Text } from 'react-native';
import tw from 'twrnc';
import { CartItem, Customer } from '../types';

interface ReceiptPreviewProps {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    footerMessage: string;
    paperSize?: '58mm' | '80mm';
    showTableNumber?: boolean;
    showCustomerName?: boolean;
    showCashierName?: boolean;
    showServerName?: boolean;
    showOrderDate?: boolean;
    showDiscount?: boolean;
    // Dynamic Data
    items?: CartItem[];
    subtotal?: number;
    discount?: number;
    total?: number;
    customer?: Customer | null;
    tableNumber?: string;
}

export function ReceiptPreview({
    storeName,
    storeAddress,
    storePhone,
    footerMessage,
    paperSize = '58mm',
    showTableNumber = false,
    showCustomerName = false,
    showCashierName = false,
    showServerName = false,
    showOrderDate = false,
    showDiscount = false,
    items = [],
    subtotal = 0,
    discount = 0,
    total = 0,
    customer,
    tableNumber
}: ReceiptPreviewProps) {
    const paperWidth = paperSize === '58mm' ? 'w-48' : 'w-64'; // Approximation for visual preview

    const formatCurrency = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

    return (
        <View style={tw`items-center justify-center py-4 bg-gray-100 rounded-xl border border-gray-200`}>
            <Text style={tw`text-gray-500 text-xs font-bold mb-2 uppercase tracking-wider`}>Preview Cetakan ({paperSize})</Text>

            {/* Receipt Paper */}
            <View style={[tw`bg-white shadow-sm px-4 py-6 ${paperWidth}`, { fontFamily: 'monospace' }]}>

                {/* Header */}
                <View style={tw`items-center mb-2`}>
                    <Text style={[tw`font-bold text-black text-center text-lg mb-1`, { fontFamily: 'monospace' }]}>
                        {storeName || 'Nama Toko'}
                    </Text>
                    <Text style={[tw`text-black text-center text-xs mb-1`, { fontFamily: 'monospace' }]}>
                        {storeAddress || 'Alamat Toko'}
                    </Text>
                    <Text style={[tw`text-black text-center text-xs`, { fontFamily: 'monospace' }]}>
                        Telp: {storePhone || '08xx-xxxx-xxxx'}
                    </Text>
                </View>

                {/* Divider */}
                <View style={tw`border-b border-dashed border-gray-400 my-2`} />

                {/* Info Section */}
                {(showOrderDate || (showTableNumber && tableNumber) || (showCustomerName && customer) || showCashierName || showServerName) && (
                    <View style={tw`mb-2`}>
                        {showOrderDate && (
                            <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>
                                {new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                            </Text>
                        )}
                        {showTableNumber && tableNumber && (
                            <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>Meja: {tableNumber}</Text>
                        )}
                        {showCustomerName && customer && (
                            <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>Plg: {customer.name}</Text>
                        )}
                        {showCashierName && (
                            <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>Ksr: Admin</Text>
                        )}
                        {showServerName && (
                            <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>Plyn: -</Text>
                        )}
                        <View style={tw`border-b border-dashed border-gray-400 my-2`} />
                    </View>
                )}

                {/* Dynamic Items */}
                <View style={tw`mb-2`}>
                    {items.length > 0 ? (
                        items.map((item, index) => (
                            <View key={index} style={tw`mb-2`}>
                                <View style={tw`flex-row justify-between mb-1`}>
                                    <Text style={[tw`text-black text-xs flex-1`, { fontFamily: 'monospace' }]}>{item.product.name}</Text>
                                </View>
                                <View style={tw`flex-row justify-between`}>
                                    <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>
                                        {item.quantity} x {formatCurrency(item.product.price)}
                                    </Text>
                                    <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>
                                        {formatCurrency(item.quantity * item.product.price)}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={[tw`text-black text-xs text-center italic`, { fontFamily: 'monospace' }]}>
                            (Contoh Item)
                        </Text>
                    )}
                </View>

                {/* Divider */}
                <View style={tw`border-b border-dashed border-gray-400 my-2`} />

                {/* Subtotal & Discount */}
                {showDiscount && discount > 0 ? (
                    <View style={tw`mb-1`}>
                        <View style={tw`flex-row justify-between mb-1`}>
                            <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>Subtotal</Text>
                            <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>{formatCurrency(subtotal)}</Text>
                        </View>
                        <View style={tw`flex-row justify-between mb-1`}>
                            <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>Diskon</Text>
                            <Text style={[tw`text-black text-xs`, { fontFamily: 'monospace' }]}>-{formatCurrency(discount)}</Text>
                        </View>
                        <View style={tw`border-b border-dashed border-gray-400 my-1`} />
                    </View>
                ) : null}

                {/* Total */}
                <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={[tw`text-black text-xs font-bold`, { fontFamily: 'monospace' }]}>Total</Text>
                    <Text style={[tw`text-black text-xs font-bold`, { fontFamily: 'monospace' }]}>{formatCurrency(total)}</Text>
                </View>

                {/* Footer */}
                <View style={tw`items-center mt-2`}>
                    <Text style={[tw`text-black text-center text-xs italic`, { fontFamily: 'monospace' }]}>
                        {footerMessage || 'Terima Kasih'}
                    </Text>
                    <Text style={[tw`text-black text-center text-[10px] mt-2`, { fontFamily: 'monospace' }]}>
                        Powered by KasirPOS
                    </Text>
                </View>
            </View>
        </View>
    );
}

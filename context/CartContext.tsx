import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { Product, CartItem, Customer } from '../types';
import { supabase } from '../lib/supabase';
import { useOffline } from './OfflineContext';
import { useRegister } from './RegisterContext';
import { useStore } from './StoreContext';
import { generateUUID } from '../lib/utils';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HeldOrder {
    id: string;
    items: CartItem[];
    customer: Customer | null;
    table: string;
    timestamp: number;
    note?: string;
    subtotal: number;
    discount: number;
    total: number;
}

interface CartContextType {
    items: CartItem[];
    heldOrders: HeldOrder[];
    addItem: (product: Product) => void;
    addCustomItem: (name: string, price: number) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    holdOrder: (note?: string) => Promise<void>;
    resumeHeldOrder: (orderId: string) => Promise<void>;
    removeHeldOrder: (orderId: string) => Promise<void>;
    subtotal: number;
    discount: number;
    setDiscount: (amount: number) => void;
    total: number;
    itemCount: number;
    customer: Customer | null;
    setCustomer: (customer: Customer | null) => void;
    selectedTable: string;
    setSelectedTable: (table: string) => void;
    createTransaction: (paymentMethod: string, receivedAmount: number) => Promise<{ success: boolean; error?: any }>;
    createExpense: (supplierName: string, invoiceNumber: string) => Promise<{ success: boolean; error?: any }>;
    showShiftWarning: boolean;
    setShowShiftWarning: (show: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const { activeRegister } = useRegister();
    const { settings } = useStore();
    const [items, setItems] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState(0);
    const [customer, setCustomer] = useState<Customer | null>(null);

    const [showShiftWarning, setShowShiftWarning] = useState(false);

    const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

    useEffect(() => {
        loadHeldOrders();
    }, []);

    const loadHeldOrders = async () => {
        try {
            const saved = await AsyncStorage.getItem('held_orders');
            if (saved) setHeldOrders(JSON.parse(saved));
        } catch (e) {
            console.error('Failed to load held orders', e);
        }
    };

    const addItem = async (product: Product) => {
        let shouldEnforce = settings.enforceShift;

        // Fallback: Check AsyncStorage if context seems false but we want to be sure
        if (!shouldEnforce) {
            try {
                const localSettings = await AsyncStorage.getItem('store_settings_v2');
                if (localSettings) {
                    const parsed = JSON.parse(localSettings);
                    if (parsed.enforceShift) shouldEnforce = true;
                }
            } catch (e) {
                console.log('Error checking local settings fallbak', e);
            }
        }

        console.log('[CartContext] addItem Final Check:', {
            shouldEnforce,
            activeRegister: activeRegister ? 'OPEN' : 'CLOSED'
        });

        // Enforce Open Shift check
        if (shouldEnforce && !activeRegister) {
            setShowShiftWarning(true);
            return;
        }

        setItems(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const addCustomItem = async (name: string, price: number) => {
        let shouldEnforce = settings.enforceShift;

        if (!shouldEnforce) {
            try {
                const localSettings = await AsyncStorage.getItem('store_settings_v2');
                if (localSettings) {
                    const parsed = JSON.parse(localSettings);
                    if (parsed.enforceShift) shouldEnforce = true;
                }
            } catch (e) { console.log(e) }
        }

        // Enforce Open Shift check
        if (shouldEnforce && !activeRegister) {
            setShowShiftWarning(true);
            return;
        }

        const customProduct: Product = {
            id: `custom-${Date.now()}`,
            name,
            price,
            cost_price: 0,
            image_url: null,
            category_id: 'custom',
            stock: 999,
            description: 'Custom Item'
        };
        addItem(customProduct);
    };

    const removeItem = (productId: string) => {
        setItems(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(productId);
            return;
        }
        setItems(prev =>
            prev.map(item =>
                item.product.id === productId ? { ...item, quantity } : item
            )
        );
    };

    const clearCart = () => {
        setItems([]);
        setDiscount(0);
        setCustomer(null);
        setSelectedTable('');
    }

    const holdOrder = async (note?: string) => {
        if (items.length === 0) return;

        const newHeldOrder: HeldOrder = {
            id: Date.now().toString(),
            items: [...items],
            customer,
            table: selectedTable,
            timestamp: Date.now(),
            note,
            subtotal,
            discount,
            total
        };

        const updatedHeldOrders = [...heldOrders, newHeldOrder];
        setHeldOrders(updatedHeldOrders);
        await AsyncStorage.setItem('held_orders', JSON.stringify(updatedHeldOrders));

        // Don't clear cart here - let the UI component handle it after showing notification
    };

    const resumeHeldOrder = async (orderId: string) => {
        const orderToResume = heldOrders.find(o => o.id === orderId);
        if (!orderToResume) return;

        // Restore state
        setItems(orderToResume.items);
        setCustomer(orderToResume.customer);
        setSelectedTable(orderToResume.table);
        setDiscount(orderToResume.discount || 0);

        // Remove from held list
        const updatedHeldOrders = heldOrders.filter(o => o.id !== orderId);
        setHeldOrders(updatedHeldOrders);
        await AsyncStorage.setItem('held_orders', JSON.stringify(updatedHeldOrders));
    };

    const removeHeldOrder = async (orderId: string) => {
        const updatedHeldOrders = heldOrders.filter(o => o.id !== orderId);
        setHeldOrders(updatedHeldOrders);
        await AsyncStorage.setItem('held_orders', JSON.stringify(updatedHeldOrders));
    };

    const subtotal = items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
    );

    const total = subtotal - discount;

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const [selectedTable, setSelectedTable] = useState<string>('');

    const { isOnline, addToQueue } = useOffline();

    const createTransaction = async (paymentMethod: string, receivedAmount: number) => {
        console.log('START createTransaction', { paymentMethod, receivedAmount, total, items: items.length });
        try {
            // Get current user for user_id (required by transactions table)
            console.log('Fetching user...');
            // Use getSession() instead of getUser() for offline support (reads from AsyncStorage)
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            let userId = session?.user?.id;

            if (!userId) {
                console.log('Session not found or expired, trying getUser()...');
                // Fallback to getUser if session is missing (might fail offline)
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (user) userId = user.id;
                else {
                    console.warn('User not authenticated completely (Offline?)', userError);
                    // Critical: Proceed anyway? Or fail?
                    // If offline, we might not be able to get user if never logged in.
                    // But usually, session exists.
                    if (!isOnline && !userId) {
                        console.log('Offline and no user. Using placeholder or allowing null if schema permits.');
                        // Verify schema: user_id is usually nullable or we can use a "system" user if needed.
                        // ideally we want to catch this.
                    }
                }
            }
            console.log('User fetched:', userId);

            // Get selected branch
            console.log('Fetching branch_id...');
            const branchId = await AsyncStorage.getItem('selected_branch_id');
            console.log('Branch fetched:', branchId);

            const transactionPayload = {
                user_id: userId || null, // Allow null if purely offline/anonymous (though verify RLS)
                cash_register_id: activeRegister?.id || null,
                total_amount: total,
                discount: discount || 0,
                status: 'completed',
                payment_method: paymentMethod,
                table_number: selectedTable || null,
                customer_id: customer?.id || null
            };

            const transactionItemsPayload = items.map(item => {
                const isCustomItem = !item.product.id || item.product.id.startsWith('custom-');
                console.log('[CartContext] Processing item:', {
                    name: item.product.name,
                    id: item.product.id,
                    isCustomItem,
                    willSetProductIdTo: isCustomItem ? 'NULL' : item.product.id
                });
                return {
                    product_id: isCustomItem ? null : item.product.id,
                    product_name: item.product.name, // Save snapshot of name
                    quantity: item.quantity,
                    price: item.product.price,
                    cost_price: item.product.cost_price || 0 // Track cost at time of sale
                };
            });

            if (!isOnline) {
                console.log('Offline mode detected. Queueing transaction.');
                // OFF-LINE MODE
                await addToQueue({
                    type: 'INSERT_TRANSACTION',
                    payload: {
                        transaction: transactionPayload,
                        items: transactionItemsPayload
                    }
                });
                return { success: true };
            }

            // ON-LINE MODE
            try {
                // 1. Generate ID Client Side to avoid RLS return issues (PGRST204)
                const transactionId = generateUUID();
                console.log('Generated Transaction ID:', transactionId);

                const transactionPayloadWithId = {
                    ...transactionPayload,
                    id: transactionId
                };

                // Insert Transaction
                console.log('Inserting transaction to Supabase...');
                const { error: transactionError } = await supabase
                    .from('transactions')
                    .insert(transactionPayloadWithId);

                if (transactionError) throw transactionError;
                console.log('Transaction inserted successfully.');

                // 2. Insert Transaction Items
                const itemsWithId = transactionItemsPayload.map(item => ({
                    ...item,
                    transaction_id: transactionId
                }));

                console.log('Inserting transaction items...');
                const { error: itemsError } = await supabase
                    .from('transaction_items')
                    .insert(itemsWithId);

                if (itemsError) throw itemsError;
                console.log('Transaction items inserted successfully.');

                return { success: true };

            } catch (error: any) {
                console.error('Online Transaction Failed:', error);

                // FALLBACK TO OFFLINE QUEUE
                // Check if it's a network error or similar (optional, but good practice)
                // For now, ANY error during insert -> Save to Offline.
                // Except maybe "Duplicate ID" or Validation errors? 
                // Let's assume network instability for now.

                console.log('Falling back to Offline Queue...');
                await addToQueue({
                    type: 'INSERT_TRANSACTION',
                    payload: {
                        transaction: transactionPayload,
                        items: transactionItemsPayload
                    }
                });

                return { success: true, error: 'Saved offline due to network error' };
            }
        } catch (error: any) {
            console.error('Transaction Create Exception:', error);
            // This outer catch catches errors BEFORE the Supabase call (e.g. AsyncStorage failure)
            return {
                success: false,
                error: error?.message || JSON.stringify(error)
            };
        }
    };

    const createExpense = async (supplierName: string, invoiceNumber: string) => {
        try {
            // Use getSession() instead of getUser()
            const { data: { session } } = await supabase.auth.getSession();
            let userId = session?.user?.id;

            if (!userId) {
                const { data: { user } } = await supabase.auth.getUser();
                userId = user?.id;
            }

            // Get selected branch
            const branchId = await AsyncStorage.getItem('selected_branch_id');

            // Create Description from Items
            const itemDetails = items.map(item => `${item.quantity}x ${item.product.name}`).join(', ');
            const description = `Pembelian via Kasir: ${itemDetails}`;

            const payload = {
                user_id: userId || null,
                supplier_name: supplierName || 'Kasir',
                invoice_number: invoiceNumber,
                total_amount: total,
                description: description,
                created_at: new Date().toISOString(),
                branch_id: branchId || null
            };

            const { error } = await supabase.from('purchases').insert(payload);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Expense creation failed:', error);
            return { success: false, error };
        }
    };

    return (
        <CartContext.Provider
            value={{
                items,
                heldOrders,
                addItem,
                addCustomItem,
                removeItem,
                updateQuantity,
                clearCart,
                holdOrder,
                resumeHeldOrder,
                removeHeldOrder,
                subtotal,
                discount,
                setDiscount,
                total,
                itemCount,
                customer,
                setCustomer,
                selectedTable,
                setSelectedTable,
                createTransaction,
                createExpense,
                showShiftWarning,
                setShowShiftWarning
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

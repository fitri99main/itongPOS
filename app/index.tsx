import { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, FlatList, useWindowDimensions, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useOffline } from '../context/OfflineContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Category } from '../types';
// import { Header } from '../components/Header';
// import { ProductCard } from '../components/ProductCard';
import { ProductCardModern as ProductCard } from '../components/ProductCardModern';
// import { CategoryFilter } from '../components/CategoryFilter';
import { CategoryFilterModern as CategoryFilter } from '../components/CategoryFilterModern';
// import { Header } from '../components/Header';
import { HeaderModern as Header } from '../components/HeaderModern';
import { TableSelector } from '../components/TableSelector';
import { CustomerSelector } from '../components/CustomerSelector';
import { ManualItemModal } from '../components/ManualItemModal';
import { CartFab } from '../components/CartFab';
import { CartPanel } from '../components/CartPanel';
import { RecallModal } from '../components/RecallModal';
import { ShoppingCart, Search, X, Archive } from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import tw from 'twrnc';

export default function Home() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isSplitView = width > 600; // Lowered from 768 for 8.7-inch tablet optimization
    const { heldOrders } = useCart();

    // UI Preferences via Unified Store Context
    const { settings } = useStore();
    const { showTable, showRecall: showRecallPref, showGuest, showManual } = settings;

    // Responsive Column Calculation
    // Responsive scaling - Dynamic Panel Width
    let panelWidth = 0;
    if (isSplitView) {
        // For tablets, use a percentage or restricted fixed width
        // If width < 900, use smaller 280px, otherwise 350px
        panelWidth = width < 900 ? Math.max(250, width * 0.3) : 350;
    }
    const availableWidth = width - panelWidth;

    let numColumns = 3;
    if (availableWidth > 900) numColumns = 6;
    else if (availableWidth > 700) numColumns = 5;
    else if (availableWidth > 500) numColumns = 4;
    else numColumns = 3;

    // Adjust gridWidth based on panel
    const gridWidth = availableWidth;

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showRecallModal, setShowRecallModal] = useState(false); // Renamed to avoid conflict with useUIPreferences
    const { isOnline } = useOffline();

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn('[Home] ⚠️ LOADING TIMEOUT (10s)! Forcing loading = false.');
                setLoading(false);
            }
        }, 10000);

        fetchData().finally(() => clearTimeout(timer));

        // Realtime Subscription
        const productsSubscription = supabase
            .channel('public:products')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                (payload) => {
                    console.log('Realtime change:', payload);
                    fetchData(); // Refresh data on any change
                }
            )
            .subscribe();

        const categoriesSubscription = supabase
            .channel('public:categories')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'categories' },
                () => fetchData()
            )
            .subscribe();

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(productsSubscription);
            supabase.removeChannel(categoriesSubscription);
        };
    }, []);

    const fetchData = async () => {
        console.log('[Home] Fetching data... (online:', isOnline, ')');
        try {
            // Try to load from cache first for immediate UI
            const cachedProducts = await AsyncStorage.getItem('cached_products');
            const cachedCategories = await AsyncStorage.getItem('cached_categories');

            if (cachedProducts) setProducts(JSON.parse(cachedProducts));
            if (cachedCategories) setCategories(JSON.parse(cachedCategories));

            // If online, fetch fresh data and update cache
            if (isOnline) {
                console.log('[Home] Online: Fetching fresh products/categories from Supabase');
                // Use a nested try-catch with timeout for the Supabase call
                const fetchPromise = Promise.all([
                    supabase.from('products').select('*').order('name'),
                    supabase.from('categories').select('*').order('name'),
                ]);

                // 8 second timeout specifically for the Supabase query
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Supabase request timeout')), 8000)
                );

                const results = await Promise.race([fetchPromise, timeoutPromise]) as any;
                const [productsRes, categoriesRes] = results;

                if (productsRes.error) throw productsRes.error;
                if (categoriesRes.error) throw categoriesRes.error;

                if (productsRes.data) {
                    console.log(`[Home] Successfully fetched ${productsRes.data.length} products`);
                    setProducts(productsRes.data as Product[]);
                    await AsyncStorage.setItem('cached_products', JSON.stringify(productsRes.data));
                }
                if (categoriesRes.data) {
                    console.log(`[Home] Successfully fetched ${categoriesRes.data.length} categories`);
                    setCategories(categoriesRes.data as Category[]);
                    await AsyncStorage.setItem('cached_categories', JSON.stringify(categoriesRes.data));
                }
            } else {
                console.log('[Home] Offline: Skipping fresh fetch, relying on cache');
            }
        } catch (error) {
            console.error('[Home] Error fetching data:', error);
        } finally {
            console.log('[Home] fetchData finished. Setting loading = false');
            setLoading(false);
        }
    };

    const filteredProducts = products.filter((product) => {
        const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) {
        return (
            <View style={tw`flex-1 justify-center items-center bg-white`}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={tw`flex-1 flex-row bg-gray-50`}>
            {/* Main Content (Products) */}
            <View style={tw`flex-1 flex-col`}>
                <Header />

                {/* Search Bar */}
                <View style={tw`bg-white px-3 pb-2`}>
                    <View style={tw`flex-row items-center bg-gray-100 rounded-lg px-3 py-2 border border-gray-200`}>
                        <Search size={20} color="#9ca3af" />
                        <TextInput
                            placeholder="Cari produk..."
                            style={tw`flex-1 ml-2 text-gray-800 font-medium`}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            placeholderTextColor="#9ca3af"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X size={18} color="#6b7280" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Optional Action Bar */}
                {(showTable || showRecallPref || showGuest || showManual) && (
                    <View style={tw`bg-white px-3 py-2 flex-row gap-2`}>
                        {showTable && <TableSelector />}

                        {/* Recall Button */}
                        {showRecallPref && (
                            <TouchableOpacity
                                onPress={() => setShowRecallModal(true)}
                                style={tw`flex-row items-center justify-center bg-orange-50 px-3 py-3 rounded-xl border border-orange-100 relative`}
                            >
                                <Archive size={18} color="#d97706" />
                                {heldOrders.length > 0 && (
                                    <View style={tw`absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center`}>
                                        <Text style={tw`text-[9px] text-white font-bold`}>{heldOrders.length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}

                        {showGuest && <CustomerSelector />}

                        {/* Short-cut to Add Purchase - Always visible or user didn't ask to hide it? Assuming keep it for now as user didn't mention it. */}
                        <TouchableOpacity
                            onPress={() => router.push('/purchases/add' as any)}
                            style={tw`flex-1 flex-row items-center justify-center bg-orange-100 px-1 py-3 rounded-xl border border-orange-200`}
                        >
                            <ShoppingCart size={16} color="#ea580c" />
                            <Text style={tw`ml-1 font-bold text-orange-700 text-[10px]`} numberOfLines={1}>Beli Stok</Text>
                        </TouchableOpacity>

                        {showManual && <ManualItemModal />}
                    </View>
                )}

                <View style={tw`py-2 bg-white`}>
                    <CategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                    />
                </View>

                <FlatList
                    key={isSplitView ? `split-${numColumns}` : `mobile-${numColumns}`}
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <ProductCard product={item} />}
                    numColumns={numColumns}
                    contentContainerStyle={tw`p-3 pb-24`}
                    columnWrapperStyle={tw`justify-between`}
                    ListEmptyComponent={
                        <View style={tw`flex-1 items-center justify-center py-20`}>
                            <Text style={tw`text-gray-500`}>Tidak ada produk ditemukan</Text>
                        </View>
                    }
                />

                {!isSplitView && <CartFab />}
            </View>

            {/* Right Panel (Cart - Desktop Only) */}
            {isSplitView && (
                <View style={[tw`h-full`, { width: panelWidth }]}>
                    <CartPanel />
                </View>
            )}

            <RecallModal visible={showRecallModal} onClose={() => setShowRecallModal(false)} />
        </View>
    );
}

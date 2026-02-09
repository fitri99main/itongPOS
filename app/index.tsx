import { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, FlatList, useWindowDimensions, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
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
import { ShoppingCart } from 'lucide-react-native';
import tw from 'twrnc';

export default function Home() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isSplitView = width > 768; // Tablet/Desktop threshold

    // Adjust columns based on available grid width
    const gridWidth = isSplitView ? width - 350 : width;

    // User Request: Force 3 columns if 3 columns fit, otherwise dynamic.
    // Logic: 
    // - Tablet Landscape (Split View): gridWidth ~700-800px -> 3 or 4 cols
    // - Mobile: width ~360-400px -> 3 cols (small items) or 2 cols?
    // User requested "jika 3 kolom maka ada produk baru ditambahkan mengikuti ukuran untuk 3 kolom juga" implies they WANT 3 columns.

    const numColumns = 4; // User requested 4 columns ("4 baris")

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn('Home: Loading timed out');
                setLoading(false);
            }
        }, 10000);

        fetchData().then(() => clearTimeout(timer));

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
        try {
            // Try to load from cache first for immediate UI
            const cachedProducts = await AsyncStorage.getItem('cached_products');
            const cachedCategories = await AsyncStorage.getItem('cached_categories');

            if (cachedProducts) setProducts(JSON.parse(cachedProducts));
            if (cachedCategories) setCategories(JSON.parse(cachedCategories));

            // If online, fetch fresh data and update cache
            const { isConnected } = await NetInfo.fetch();

            if (isConnected) {
                const [productsRes, categoriesRes] = await Promise.all([
                    supabase.from('products').select('*').order('name'),
                    supabase.from('categories').select('*').order('name'),
                ]);

                if (productsRes.data) {
                    setProducts(productsRes.data as Product[]);
                    await AsyncStorage.setItem('cached_products', JSON.stringify(productsRes.data));
                }
                if (categoriesRes.data) {
                    setCategories(categoriesRes.data as Category[]);
                    await AsyncStorage.setItem('cached_categories', JSON.stringify(categoriesRes.data));
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter((product) => {
        return !selectedCategory || product.category_id === selectedCategory;
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


                <View style={tw`bg-white px-3 py-2 flex-row gap-2`}>
                    <TableSelector />
                    <CustomerSelector />
                    {/* Short-cut to Add Purchase */}
                    <TouchableOpacity
                        onPress={() => router.push('/purchases/add' as any)}
                        style={tw`flex-1 flex-row items-center justify-center bg-orange-100 px-1 py-3 rounded-xl border border-orange-200`}
                    >
                        <ShoppingCart size={16} color="#ea580c" />
                        <Text style={tw`ml-1 font-bold text-orange-700 text-[10px]`} numberOfLines={1}>Beli Stok</Text>
                    </TouchableOpacity>
                    <ManualItemModal />
                </View>

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
                <View style={tw`w-[350px] h-full`}>
                    <CartPanel />
                </View>
            )}
        </View>
    );
}

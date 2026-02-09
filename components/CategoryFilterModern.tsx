import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { Category } from '../types';
import tw from 'twrnc';

interface Props {
    categories: Category[];
    selectedCategory: string | null;
    onSelectCategory: (id: string | null) => void;
}

export function CategoryFilterModern({ categories, selectedCategory, onSelectCategory }: Props) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-4 gap-2`}
            style={tw`max-h-14`}
        >
            <TouchableOpacity
                onPress={() => onSelectCategory(null)}
                style={tw`px-5 py-2.5 rounded-full ${!selectedCategory ? 'bg-slate-800 shadow-md' : 'bg-slate-100'}`}
            >
                <Text style={tw`font-semibold ${!selectedCategory ? 'text-white' : 'text-slate-600'}`}>
                    Semua
                </Text>
            </TouchableOpacity>

            {categories.map((category) => (
                <TouchableOpacity
                    key={category.id}
                    onPress={() => onSelectCategory(category.id === selectedCategory ? null : category.id)}
                    style={tw`px-5 py-2.5 rounded-full ${selectedCategory === category.id ? 'bg-slate-800 shadow-md' : 'bg-slate-100'}`}
                >
                    <Text style={tw`font-semibold ${selectedCategory === category.id ? 'text-white' : 'text-slate-600'}`}>
                        {category.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

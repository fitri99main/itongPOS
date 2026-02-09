import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { Category } from '../types';
import tw from 'twrnc';

interface Props {
    categories: Category[];
    selectedCategory: string | null;
    onSelectCategory: (id: string | null) => void;
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: Props) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-4 gap-2`}
            style={tw`max-h-12`}
        >
            <TouchableOpacity
                onPress={() => onSelectCategory(null)}
                style={tw`px-4 py-2 rounded-full border ${!selectedCategory ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
            >
                <Text style={tw`font-medium ${!selectedCategory ? 'text-white' : 'text-gray-600'}`}>
                    Semua
                </Text>
            </TouchableOpacity>

            {categories.map((category) => (
                <TouchableOpacity
                    key={category.id}
                    onPress={() => onSelectCategory(category.id === selectedCategory ? null : category.id)}
                    style={tw`px-4 py-2 rounded-full border ${selectedCategory === category.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
                >
                    <Text style={tw`font-medium ${selectedCategory === category.id ? 'text-white' : 'text-gray-600'}`}>
                        {category.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

import React from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import tw from 'twrnc';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string | null;
    type?: 'danger' | 'success' | 'info' | 'warning';
    children?: React.ReactNode;
}

export function ConfirmationModal({
    visible,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    type = 'danger',
    children
}: ConfirmationModalProps) {
    if (!visible) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertTriangle size={32} color="#dc2626" />;
            case 'warning': return <AlertTriangle size={32} color="#d97706" />;
            case 'success': return <CheckCircle size={32} color="#16a34a" />;
            default: return <Info size={32} color="#2563eb" />;
        }
    };

    const getHeaderColor = () => {
        switch (type) {
            case 'danger': return 'bg-red-50';
            case 'warning': return 'bg-yellow-50';
            case 'success': return 'bg-green-50';
            default: return 'bg-blue-50';
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'danger': return 'bg-red-600';
            case 'warning': return 'bg-yellow-600';
            case 'success': return 'bg-green-600';
            default: return 'bg-blue-600';
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                <View style={[tw`bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden`, { elevation: 5 }]}>

                    {/* Header Icon Area */}
                    <View style={tw`items-center justify-center py-6 ${getHeaderColor()}`}>
                        <View style={tw`p-3 bg-white rounded-full shadow-sm`}>
                            {getIcon()}
                        </View>
                    </View>

                    {/* Content */}
                    <View style={tw`px-6 py-4`}>
                        <Text style={tw`text-xl font-bold text-center text-gray-900 mb-2`}>
                            {title}
                        </Text>
                        <Text style={tw`text-gray-500 text-center mb-6 leading-5`}>
                            {message}
                        </Text>

                        {children}

                        {/* Buttons */}
                        <View style={tw`flex-row gap-3`}>
                            {cancelText && (
                                <TouchableOpacity
                                    onPress={onCancel}
                                    style={tw`flex-1 py-3 bg-gray-100 rounded-xl items-center active:bg-gray-200`}
                                >
                                    <Text style={tw`font-bold text-gray-700`}>{cancelText}</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={onConfirm}
                                style={tw`flex-1 py-3 ${getButtonColor()} rounded-xl items-center active:opacity-90 shadow-sm`}
                            >
                                <Text style={tw`font-bold text-white`}>{confirmText}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

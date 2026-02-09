import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { DeviceEventEmitter, Platform, Alert } from 'react-native';
import { BLEPrinter as BLEPrinterModule } from 'react-native-thermal-receipt-printer';

// Fallback for Expo Go (where native module is null or undefined)
// We cast to any to avoid strict type definition conflicts with the library
const BLEPrinter = (BLEPrinterModule && typeof BLEPrinterModule.init === 'function') ? BLEPrinterModule : {
    init: () => Promise.resolve(),
    getDeviceList: () => Promise.resolve([]),
    connectPrinter: () => Promise.resolve(),
    printBill: () => Promise.resolve(),
};

interface PrinterContextType {
    devices: any[];
    connectedDevice: any | null;
    isScanning: boolean;
    scanDevices: () => void;
    connectPrinter: (device: any) => Promise<void>;
    printReceipt: (text: string) => Promise<void>;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

export const PrinterProvider = ({ children }: { children: ReactNode }) => {
    const [devices, setDevices] = useState<any[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<any | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        // Initialize Printer safely
        // if (BLEPrinter) {
        //     BLEPrinter.init().then(() => {
        //         console.log('Printer initialized');
        //     }).catch(err => console.error('Printer init error:', err));

        //     // Listeners for device discovery
        //     const listener = DeviceEventEmitter.addListener('BLEPrinter_discover', (device) => {
        //         console.log('Device Found:', device);
        //         setDevices(prev => {
        //             if (prev.find(d => d.inner_mac_address === device.inner_mac_address)) return prev;
        //             return [...prev, device];
        //         });
        //     });

        //     return () => {
        //         listener.remove();
        //     };
        // } else {
        //     console.warn('BLEPrinter module not found. Native dependencies might be missing (Expo Go?).');
        // }
    }, []);

    const scanDevices = () => {
        if (!BLEPrinter) {
            console.warn('BLEPrinter not found');
            Alert.alert('Info', 'Fitur scan printer hanya tersedia di Development Build / APK.');
            return;
        }
        setIsScanning(true);
        setDevices([]);
        BLEPrinter.getDeviceList()
            .then(results => {
                console.log('Scan results:', results);
                // Some versions return list directly, others use event
                if (Array.isArray(results)) {
                    setDevices(results);
                }
            })
            .catch(err => console.error('Scan error:', err))
            .finally(() => setIsScanning(false));
    };

    const connectPrinter = async (device: any) => {
        if (!BLEPrinter) {
            Alert.alert('Info', 'Fitur connect hanya tersedia di Development Build / APK.');
            return;
        }
        try {
            await BLEPrinter.connectPrinter(device.inner_mac_address);
            setConnectedDevice(device);
            Alert.alert('Terhubung', `Berhasil terhubung ke ${device.device_name}`);
        } catch (error) {
            console.error('Connection error:', error);
            Alert.alert('Gagal', 'Tidak dapat terhubung ke printer.');
        }
    };

    const printReceipt = async (text: string) => {
        if (!BLEPrinter) {
            Alert.alert('Info', 'Fitur print hanya tersedia di Development Build / APK.');
            return;
        }
        if (!connectedDevice) {
            Alert.alert('Error', 'Printer belum terhubung.');
            return;
        }
        try {
            await BLEPrinter.printBill(text);
        } catch (error) {
            console.error('Print error:', error);
            Alert.alert('Gagal', 'Gagal mencetak struk.');
        }
    };

    return (
        <PrinterContext.Provider value={{ devices, connectedDevice, isScanning, scanDevices, connectPrinter, printReceipt }}>
            {children}
        </PrinterContext.Provider>
    );
};

export const usePrinter = () => {
    const context = useContext(PrinterContext);
    if (!context) {
        throw new Error('usePrinter must be used within a PrinterProvider');
    }
    return context;
};

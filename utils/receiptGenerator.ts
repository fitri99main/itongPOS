export interface ReceiptOptions {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    footerMessage?: string;
    showTableNumber?: boolean;
    showCustomerName?: boolean;
    showCashierName?: boolean;
    showServerName?: boolean;
    showOrderDate?: boolean;
    showDiscount?: boolean;
}

export const generateReceiptText = (
    transaction: {
        id: string;
        date: Date;
        items: any[];
        total: number;
        received?: number;
        change?: number;
        customerName?: string;
        tableNumber?: string;
        cashierName?: string;
        serverName?: string;
        discount?: number;
        subtotal?: number;
    },
    options: ReceiptOptions
) => {
    const divider = '--------------------------------\n';
    const centerText = (text: string) => {
        const spaces = Math.max(0, Math.floor((32 - text.length) / 2));
        return ' '.repeat(spaces) + text + '\n';
    };

    let receipt = '';

    // Header
    receipt += centerText(options.storeName);
    if (options.storeAddress) receipt += centerText(options.storeAddress);
    if (options.storePhone) receipt += centerText(options.storePhone);
    receipt += divider;

    // Info
    if (options.showOrderDate !== false) {
        receipt += `Tgl: ${transaction.date.toLocaleString('id-ID')}\n`;
    }
    receipt += `No: #${transaction.id.slice(-6)}\n`;

    if (options.showTableNumber !== false && transaction.tableNumber) {
        receipt += `Meja: ${transaction.tableNumber}\n`;
    }
    if (options.showCustomerName !== false && transaction.customerName) {
        receipt += `Plg: ${transaction.customerName}\n`;
    }
    if (options.showCashierName !== false && transaction.cashierName) {
        receipt += `Ksr: ${transaction.cashierName}\n`;
    }
    if (options.showServerName !== false && transaction.serverName) {
        receipt += `Plyn: ${transaction.serverName}\n`;
    }

    receipt += divider;

    // Items
    transaction.items.forEach(item => {
        receipt += `${item.product?.name || item.product_name || 'Item'}\n`;
        const price = item.price || item.unit_price || 0;
        const qtyPrice = `${item.quantity} x ${price.toLocaleString('id-ID')}`;
        const totalItem = (item.quantity * price).toLocaleString('id-ID');

        // Align Right
        const spacing = 32 - qtyPrice.length - totalItem.length;
        receipt += `${qtyPrice}${' '.repeat(Math.max(1, spacing))}${totalItem}\n`;
    });

    receipt += divider;

    // Subtotal & Discount if applicable
    if (options.showDiscount && (transaction.discount || 0) > 0) {
        const subLabel = 'Subtotal';
        const subVal = (transaction.subtotal || transaction.total + (transaction.discount || 0)).toLocaleString('id-ID');
        const subSpace = 32 - subLabel.length - subVal.length;
        receipt += `${subLabel}${' '.repeat(Math.max(1, subSpace))}${subVal}\n`;

        const discLabel = 'Diskon';
        const discVal = `-${(transaction.discount || 0).toLocaleString('id-ID')}`;
        const discSpace = 32 - discLabel.length - discVal.length;
        receipt += `${discLabel}${' '.repeat(Math.max(1, discSpace))}${discVal}\n`;

        receipt += divider;
    }

    // Totals
    const addTotalLine = (label: string, value: string) => {
        const spacing = 32 - label.length - value.length;
        return `${label}${' '.repeat(Math.max(1, spacing))}${value}\n`;
    };

    receipt += addTotalLine('Total', `Rp ${transaction.total.toLocaleString('id-ID')}`);

    if (transaction.received !== undefined) {
        receipt += addTotalLine('Tunai', `Rp ${transaction.received.toLocaleString('id-ID')}`);
    }
    if (transaction.change !== undefined) {
        receipt += addTotalLine('Kembali', `Rp ${transaction.change.toLocaleString('id-ID')}`);
    }

    // Footer
    receipt += divider;
    if (options.footerMessage) {
        receipt += centerText(options.footerMessage);
    }
    receipt += centerText('Terima Kasih');
    receipt += '\n\n\n'; // Feed paper

    return receipt;
};

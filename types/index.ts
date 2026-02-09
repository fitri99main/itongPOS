export interface Product {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    category_id: string;
    stock: number;
    description: string | null;
}

export interface Category {
    id: string;
    name: string;
    icon?: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface Transaction {
    id: string;
    created_at: string;
    total_amount: number;
    status: 'pending' | 'completed' | 'cancelled';
    payment_method: string;
    table_number?: string;
    customer?: Customer;
    items?: TransactionItem[];
}

export interface TransactionItem {
    id: string;
    transaction_id: string;
    product_id: string | null;
    quantity: number;
    price: number;
    product_name?: string;
    product?: Product;
}

export interface Customer {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
}

export interface Table {
    id: string;
    number: string;
    capacity: number;
    status: 'available' | 'occupied';
}

export interface Branch {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
}

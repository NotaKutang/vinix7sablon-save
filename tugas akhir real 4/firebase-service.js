// firebase-service.js
import { 
    db, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc,
    doc,
    query,
    where,
    orderBy 
} from './firebase.js';

class FirebaseOrderService {
    constructor() {
        this.collectionName = 'orders';
    }

    // Create new order
    async createOrder(orderData) {
        try {
            console.log('📝 Creating order in Firebase:', orderData);
            
            const docRef = await addDoc(collection(db, this.collectionName), {
                ...orderData,
                createdAt: new Date().toISOString(),
                status: 'Proses',
                downpaymentAmount: 20000,
                buktiPembayaran: null
            });
            
            console.log('✅ Order created with ID:', docRef.id);
            return { 
                id: docRef.id, 
                ...orderData,
                createdAt: new Date().toISOString(),
                status: 'Proses',
                downpaymentAmount: 20000,
                buktiPembayaran: null
            };
            
        } catch (error) {
            console.error('❌ Error creating order in Firebase:', error);
            throw error;
        }
    }

    // Get all orders
    async getOrders() {
        try {
            console.log('📖 Fetching all orders from Firebase...');
            
            const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            const orders = [];
            querySnapshot.forEach((doc) => {
                orders.push({ 
                    id: doc.id, 
                    ...doc.data() 
                });
            });
            
            console.log(`✅ Retrieved ${orders.length} orders from Firebase`);
            return orders;
            
        } catch (error) {
            console.error('❌ Error getting orders from Firebase:', error);
            throw error;
        }
    }

    // Get order by ID
    async getOrderById(orderId) {
        try {
            console.log('🔍 Getting order by ID:', orderId);
            
            const docRef = doc(db, this.collectionName, orderId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                console.log('✅ Order found:', docSnap.id);
                return { 
                    id: docSnap.id, 
                    ...docSnap.data() 
                };
            } else {
                console.log('❌ Order not found:', orderId);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error getting order by ID:', error);
            throw error;
        }
    }

    // Update order
    async updateOrder(orderId, updates) {
        try {
            console.log('🔄 Updating order:', orderId, updates);
            
            const docRef = doc(db, this.collectionName, orderId);
            await updateDoc(docRef, updates);
            
            console.log('✅ Order updated successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error updating order:', error);
            throw error;
        }
    }

    // Delete order
    async deleteOrder(orderId) {
        try {
            console.log('🗑️ Deleting order:', orderId);
            
            await deleteDoc(doc(db, this.collectionName, orderId));
            
            console.log('✅ Order deleted successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error deleting order:', error);
            throw error;
        }
    }

    // Search orders by invoice number, name, email, or phone
    async searchOrders(searchTerm) {
        try {
            console.log('🔎 Searching orders for:', searchTerm);
            
            if (!searchTerm.trim()) {
                return this.getOrders();
            }
            
            const orders = await this.getOrders();
            const lowerSearchTerm = searchTerm.toLowerCase();
            
            const filteredOrders = orders.filter(order => 
                order.id.toLowerCase().includes(lowerSearchTerm) ||
                order.customerName.toLowerCase().includes(lowerSearchTerm) ||
                order.email.toLowerCase().includes(lowerSearchTerm) ||
                order.phone.includes(searchTerm)
            );
            
            console.log(`✅ Found ${filteredOrders.length} orders matching search`);
            return filteredOrders;
            
        } catch (error) {
            console.error('❌ Error searching orders:', error);
            throw error;
        }
    }
}

// Create and export singleton instance
const firebaseService = new FirebaseOrderService();
export default firebaseService;
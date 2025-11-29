// migration.js
import { 
    db, 
    collection, 
    addDoc, 
    getDocs,
    doc,
    getDoc,
    writeBatch
} from './firebase.js';

class DataMigration {
    constructor() {
        this.localStorageKey = 'merchcustom_orders';
        this.firebaseCollection = 'orders';
        this.migrationLog = [];
    }

    // Check if data exists in Firebase
    async checkFirebaseData() {
        try {
            const querySnapshot = await getDocs(collection(db, this.firebaseCollection));
            const firebaseOrders = [];
            querySnapshot.forEach((doc) => {
                firebaseOrders.push({ id: doc.id, ...doc.data() });
            });
            
            return {
                exists: firebaseOrders.length > 0,
                count: firebaseOrders.length,
                sample: firebaseOrders.slice(0, 3)
            };
        } catch (error) {
            console.error('Error checking Firebase data:', error);
            return { exists: false, count: 0, sample: [], error: error.message };
        }
    }

    // Check data in localStorage
    checkLocalStorageData() {
        try {
            const localData = localStorage.getItem(this.localStorageKey);
            const localOrders = localData ? JSON.parse(localData) : [];
            
            return {
                exists: localOrders.length > 0,
                count: localOrders.length,
                sample: localOrders.slice(0, 3),
                data: localOrders
            };
        } catch (error) {
            console.error('Error checking localStorage data:', error);
            return { exists: false, count: 0, sample: [], error: error.message };
        }
    }

    // Validate order data structure
    validateOrder(order) {
        const requiredFields = ['id', 'product', 'customerName', 'email', 'phone', 'createdAt'];
        const missingFields = requiredFields.filter(field => !order[field]);
        
        if (missingFields.length > 0) {
            return { 
                valid: false, 
                error: `Missing required fields: ${missingFields.join(', ')}` 
            };
        }

        // Add default values for missing optional fields
        const enhancedOrder = {
            status: 'Proses',
            downpaymentAmount: 20000,
            buktiPembayaran: null,
            ...order
        };

        return { valid: true, data: enhancedOrder };
    }

    // Migrate single order to Firebase
    async migrateOrder(order) {
        try {
            const validation = this.validateOrder(order);
            if (!validation.valid) {
                this.migrationLog.push(`❌ Invalid order ${order.id}: ${validation.error}`);
                return { success: false, error: validation.error };
            }

            const enhancedOrder = validation.data;
            
            // Remove the old ID since Firebase will generate a new one
            const { id: oldId, ...orderData } = enhancedOrder;
            
            // Add migration metadata
            const orderToMigrate = {
                ...orderData,
                migratedFromLocalStorage: true,
                originalLocalStorageId: oldId,
                migratedAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, this.firebaseCollection), orderToMigrate);
            
            this.migrationLog.push(`✅ Migrated: ${oldId} → ${docRef.id}`);
            return { 
                success: true, 
                newId: docRef.id, 
                oldId: oldId 
            };
            
        } catch (error) {
            const errorMsg = `Error migrating order ${order.id}: ${error.message}`;
            this.migrationLog.push(`❌ ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    }

    // Batch migrate all orders
    async migrateAllOrders() {
        const localData = this.checkLocalStorageData();
        
        if (!localData.exists) {
            return {
                success: false,
                message: 'No data found in localStorage to migrate',
                stats: { total: 0, success: 0, failed: 0 }
            };
        }

        console.log(`🔄 Starting migration of ${localData.count} orders...`);
        this.migrationLog = [`🔄 Starting migration of ${localData.count} orders...`];

        let successCount = 0;
        let failedCount = 0;
        const results = [];

        // Migrate orders one by one (to avoid batch limits and for better error handling)
        for (const order of localData.data) {
            const result = await this.migrateOrder(order);
            results.push(result);
            
            if (result.success) {
                successCount++;
            } else {
                failedCount++;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const migrationResult = {
            success: failedCount === 0,
            message: `Migration completed: ${successCount} successful, ${failedCount} failed`,
            stats: {
                total: localData.data.length,
                success: successCount,
                failed: failedCount
            },
            log: this.migrationLog,
            results: results
        };

        console.log('📊 Migration result:', migrationResult);
        return migrationResult;
    }

    // Clear Firebase data (USE WITH CAUTION!)
    async clearFirebaseData() {
        if (!confirm('🚨 ARE YOU SURE? This will delete ALL data in Firebase!')) {
            return { cancelled: true };
        }

        if (!confirm('🚨 THIS ACTION CANNOT BE UNDONE! Confirm deletion?')) {
            return { cancelled: true };
        }

        try {
            const querySnapshot = await getDocs(collection(db, this.firebaseCollection));
            const batch = writeBatch(db);
            
            let deleteCount = 0;
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
                deleteCount++;
            });
            
            await batch.commit();
            
            return {
                success: true,
                message: `Deleted ${deleteCount} documents from Firebase`,
                count: deleteCount
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get migration report
    getMigrationReport() {
        return {
            timestamp: new Date().toISOString(),
            log: this.migrationLog,
            localStorage: this.checkLocalStorageData(),
            summary: this.migrationLog.filter(entry => 
                entry.includes('✅ Migrated:') || entry.includes('❌')
            )
        };
    }
}

// Create and export singleton instance
const dataMigration = new DataMigration();
export default dataMigration;
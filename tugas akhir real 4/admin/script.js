// ==================== AUTHENTICATION CHECK ====================
function checkAuth() {
    const isAuthenticated = sessionStorage.getItem('merchcustom_admin_auth') === 'true';
    
    if (!isAuthenticated) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ==================== KONSTANTA ADMIN ====================
const STORAGE_KEY = 'merchcustom_orders';
const DOWNPAYMENT_AMOUNT = 20000;

// Fungsi utilitas untuk localStorage
// Fungsi utilitas untuk localStorage (fallback)
const OrderUtils = {
    // Check if Firebase is available
    isFirebaseAvailable() {
        return typeof firebaseService !== 'undefined' && firebaseService !== null;
    },

    // 🔄 HYBRID: Get all orders
    async getOrders() {
        try {
            // Try Firebase first
            if (this.isFirebaseAvailable()) {
                console.log('🔥 [Admin] Using Firebase to get orders');
                return await firebaseService.getOrders();
            }
            
            // Fallback to localStorage
            console.log('💾 [Admin] Firebase unavailable, using localStorage');
            return this.getOrdersLocal();
            
        } catch (error) {
            console.error('❌ [Admin] Error getting orders, falling back to localStorage:', error);
            return this.getOrdersLocal();
        }
    },

    // 🔄 HYBRID: Get order by ID
    async getOrderById(orderId) {
        try {
            // Try Firebase first
            if (this.isFirebaseAvailable()) {
                console.log('🔥 [Admin] Getting order from Firebase:', orderId);
                const order = await firebaseService.getOrderById(orderId);
                if (order) return order;
            }
            
            // Fallback to localStorage
            console.log('💾 [Admin] Firebase unavailable or order not found, checking localStorage');
            return this.getOrderByIdLocal(orderId);
            
        } catch (error) {
            console.error('❌ [Admin] Error getting order from Firebase, checking localStorage:', error);
            return this.getOrderByIdLocal(orderId);
        }
    },

    // 🔄 HYBRID: Update order
    async updateOrder(orderId, updates) {
        try {
            // Try Firebase first
            if (this.isFirebaseAvailable()) {
                console.log('🔥 [Admin] Updating order in Firebase:', orderId, updates);
                const success = await firebaseService.updateOrder(orderId, updates);
                return success;
            }
            
            // Fallback to localStorage
            console.log('💾 [Admin] Firebase unavailable, updating in localStorage');
            return this.updateOrderLocal(orderId, updates);
            
        } catch (error) {
            console.error('❌ [Admin] Error updating order in Firebase, using localStorage:', error);
            return this.updateOrderLocal(orderId, updates);
        }
    },

    // 🔄 HYBRID: Delete order
    async deleteOrder(orderId) {
        try {
            // Try Firebase first
            if (this.isFirebaseAvailable()) {
                console.log('🔥 [Admin] Deleting order from Firebase:', orderId);
                const success = await firebaseService.deleteOrder(orderId);
                return success;
            }
            
            // Fallback to localStorage
            console.log('💾 [Admin] Firebase unavailable, deleting from localStorage');
            return this.deleteOrderLocal(orderId);
            
        } catch (error) {
            console.error('❌ [Admin] Error deleting order from Firebase, using localStorage:', error);
            return this.deleteOrderLocal(orderId);
        }
    },

    // ==================== LOCALSTORAGE METHODS (FALLBACK) ====================
    
    getOrdersLocal() {
        try {
            const orders = localStorage.getItem(STORAGE_KEY);
            return orders ? JSON.parse(orders) : [];
        } catch (error) {
            console.error('Error getting orders from localStorage:', error);
            return [];
        }
    },

    getOrderByIdLocal(orderId) {
        const orders = this.getOrdersLocal();
        return orders.find(order => order.id === orderId) || null;
    },

    updateOrderLocal(orderId, updates) {
        const orders = this.getOrdersLocal();
        const orderIndex = orders.findIndex(order => order.id === orderId);
        
        if (orderIndex === -1) return false;
        
        orders[orderIndex] = { ...orders[orderIndex], ...updates };
        return this.saveOrdersLocal(orders);
    },

    deleteOrderLocal(orderId) {
        const orders = this.getOrdersLocal();
        const filteredOrders = orders.filter(order => order.id !== orderId);
        return this.saveOrdersLocal(filteredOrders);
    },

    saveOrdersLocal(orders) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
            return true;
        } catch (error) {
            console.error('Error saving orders to localStorage:', error);
            return false;
        }
    }
};

// Fungsi utilitas untuk UI Admin
const AdminUIUtils = {
    toggleLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.toggle('show', show);
        }
    },

    formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    },

    formatText(text) {
        return text || '-';
    }
};

// ==================== REAL-TIME UPDATES ====================

let unsubscribe = null;

function setupRealTimeUpdates() {
    if (!OrderUtils.isFirebaseAvailable()) {
        console.log('💾 Real-time updates unavailable, using manual refresh');
        return;
    }

    try {
        console.log('🔥 Setting up real-time updates...');
        
        const q = firebase.query(
            firebase.collection(firebase.db, "orders"), 
            firebase.orderBy("createdAt", "desc")
        );
        
        unsubscribe = firebase.onSnapshot(q, (snapshot) => {
            console.log('🔄 Real-time update received');
            
            const orders = [];
            snapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });
            
            // Update UI dengan data real-time
            displayStatistics(orders);
            displayAllOrders(orders);
            
        }, (error) => {
            console.error('❌ Real-time updates error:', error);
            // Fallback to manual mode
            loadOrdersManual();
        });
        
        console.log('✅ Real-time updates activated');
        
    } catch (error) {
        console.error('❌ Error setting up real-time updates:', error);
        loadOrdersManual();
    }
}

function loadOrdersManual() {
    console.log('🔄 Loading orders manually...');
    displayStatistics();
    displayAllOrders();
}

function cleanupRealTimeUpdates() {
    if (unsubscribe) {
        unsubscribe();
        console.log('🔴 Real-time updates stopped');
    }
}

// ==================== FUNGSI GLOBAL UNTUK TOMBOL ====================

// ✅ Fungsi ini HARUS global agar tombol bisa panggil
window.showOrderDetail = async function(orderId) {
    console.log('🔍 [Admin] Showing order detail:', orderId);
    
    AdminUIUtils.toggleLoading(true);
    
    try {
        const order = await OrderUtils.getOrderById(orderId);
        AdminUIUtils.toggleLoading(false);

        if (!order) {
            alert('❌ Pesanan tidak ditemukan');
            return;
        }

        const modal = document.getElementById('orderDetailModal');
        const content = document.getElementById('orderDetailContent');

        if (!modal || !content) {
            console.error('Modal elements not found');
            return;
        }

        content.innerHTML = `
            <div class="detail-modal-grid">
                <div class="detail-section">
                    <h3>Informasi Pesanan</h3>
                    <div class="detail-group">
                        <div class="detail-label">Nomor Faktur</div>
                        <div class="detail-value">${order.id}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">
                            <span class="order-status ${order.status === 'Selesai' ? 'status-selesai' : 'status-proses'}">
                                ${order.status}
                            </span>
                        </div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Produk</div>
                        <div class="detail-value">${order.product}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Ukuran</div>
                        <div class="detail-value">${order.size}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Warna</div>
                        <div class="detail-value">${order.color}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Tanggal Pesan</div>
                        <div class="detail-value">${AdminUIUtils.formatDate(order.createdAt)}</div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Informasi Pembeli</h3>
                    <div class="detail-group">
                        <div class="detail-label">Nama Lengkap</div>
                        <div class="detail-value">${order.customerName}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">${order.email}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Telepon/WhatsApp</div>
                        <div class="detail-value">${order.phone}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Alamat Lengkap</div>
                        <div class="detail-value">${order.address}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Kota</div>
                        <div class="detail-value">${order.city}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Provinsi</div>
                        <div class="detail-value">${order.province}</div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Informasi Pembayaran</h3>
                    <div class="detail-group">
                        <div class="detail-label">Metode Pembayaran</div>
                        <div class="detail-value">${order.paymentMethod}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Uang Muka</div>
                        <div class="detail-value">${AdminUIUtils.formatCurrency(order.downpaymentAmount)}</div>
                    </div>
                    ${order.buktiPembayaran ? `
                        <div class="detail-group">
                            <div class="detail-label">Referensi Transfer</div>
                            <div class="detail-value">${order.buktiPembayaran.reference}</div>
                        </div>
                        <div class="detail-group">
                            <div class="detail-label">Waktu Konfirmasi</div>
                            <div class="detail-value">${AdminUIUtils.formatDate(order.buktiPembayaran.confirmedAt)}</div>
                        </div>
                        <div class="detail-group">
                            <div class="detail-label">File Bukti</div>
                            <div class="detail-value">${AdminUIUtils.formatText(order.buktiPembayaran.file)}</div>
                        </div>
                    ` : `
                        <div class="detail-group">
                            <div class="detail-label">Status Pembayaran</div>
                            <div class="detail-value" style="color: var(--warning-color);">Menunggu Konfirmasi</div>
                        </div>
                    `}
                </div>

                <div class="detail-section">
                    <h3>Actions</h3>
                    <div class="order-actions">
                        <button onclick="changeOrderStatus('${order.id}', '${order.status === 'Proses' ? 'Selesai' : 'Proses'}')" 
                                class="action-btn ${order.status === 'Proses' ? 'success' : 'warning'}">
                            ${order.status === 'Proses' ? 'Tandai Selesai' : 'Tandai Proses'}
                        </button>
                        <button onclick="deleteOrder('${order.id}')" class="action-btn danger">
                            Hapus Pesanan
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('show');

        // Setup close modal
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('show');
        }

        // Close modal ketika klik di luar
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        };

    } catch (error) {
        AdminUIUtils.toggleLoading(false);
        alert('❌ Error loading order details: ' + error.message);
    }
};

// ✅ Fungsi global untuk ubah status
window.changeOrderStatus = async function(orderId, newStatus) {
    console.log('🔄 [Admin] Changing order status:', orderId, '→', newStatus);
    
    if (!confirm(`Apakah Anda yakin ingin mengubah status pesanan menjadi "${newStatus}"?`)) {
        return;
    }

    AdminUIUtils.toggleLoading(true);

    try {
        const success = await OrderUtils.updateOrder(orderId, { status: newStatus });
        AdminUIUtils.toggleLoading(false);

        if (success) {
            // Untuk real-time updates, UI akan auto refresh
            // Untuk manual mode, refresh manually
            if (!unsubscribe) {
                displayStatistics();
                displayAllOrders();
            }
            
            // Tutup modal jika terbuka
            const modal = document.getElementById('orderDetailModal');
            if (modal) {
                modal.classList.remove('show');
            }
            
            alert(`✅ Status pesanan berhasil diubah menjadi "${newStatus}"`);
        } else {
            alert('❌ Gagal mengubah status pesanan');
        }
    } catch (error) {
        AdminUIUtils.toggleLoading(false);
        alert('❌ Error updating order status: ' + error.message);
    }
};

// ✅ Fungsi global untuk hapus pesanan
window.deleteOrder = async function(orderId) {
    console.log('🗑️ [Admin] Deleting order:', orderId);
    
    if (!confirm('Apakah Anda yakin ingin menghapus pesanan ini?')) {
        return;
    }

    AdminUIUtils.toggleLoading(true);

    try {
        const success = await OrderUtils.deleteOrder(orderId);
        AdminUIUtils.toggleLoading(false);

        if (success) {
            // Untuk real-time updates, UI akan auto refresh
            // Untuk manual mode, refresh manually
            if (!unsubscribe) {
                displayStatistics();
                displayAllOrders();
            }
            
            // Tutup modal jika terbuka
            const modal = document.getElementById('orderDetailModal');
            if (modal) {
                modal.classList.remove('show');
            }
            
            alert('✅ Pesanan berhasil dihapus');
        } else {
            alert('❌ Gagal menghapus pesanan');
        }
    } catch (error) {
        AdminUIUtils.toggleLoading(false);
        alert('❌ Error deleting order: ' + error.message);
    }
};

// ✅ Fungsi global untuk logout
window.logout = function() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        cleanupRealTimeUpdates();
        sessionStorage.removeItem('merchcustom_admin_auth');
        window.location.href = 'login.html';
    }
};

// ==================== FUNGSI INTERNAL ====================

// Fungsi untuk menampilkan statistik
async function displayStatistics(orders = null) {
    try {
        if (!orders) {
            orders = await OrderUtils.getOrders();
        }

        const totalOrders = orders.length;
        const processingOrders = orders.filter(order => order.status === 'Proses').length;
        const completedOrders = orders.filter(order => order.status === 'Selesai').length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.downpaymentAmount || 0), 0);

        // Update elemen statistik
        const totalOrdersEl = document.getElementById('totalOrders');
        const processingOrdersEl = document.getElementById('processingOrders');
        const completedOrdersEl = document.getElementById('completedOrders');
        const totalRevenueEl = document.getElementById('totalRevenue');

        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (processingOrdersEl) processingOrdersEl.textContent = processingOrders;
        if (completedOrdersEl) completedOrdersEl.textContent = completedOrders;
        if (totalRevenueEl) totalRevenueEl.textContent = AdminUIUtils.formatCurrency(totalRevenue);
        
    } catch (error) {
        console.error('Error displaying statistics:', error);
    }
}

// Fungsi untuk menampilkan semua pesanan dengan filter
async function displayAllOrders(orders = null) {
    const container = document.getElementById('ordersList');
    if (!container) {
        console.error('❌ ordersList container not found');
        return;
    }

    try {
        if (!orders) {
            orders = await OrderUtils.getOrders();
        }
        
        console.log('🔄 [Admin] Displaying orders:', orders.length);
        
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const productFilter = document.getElementById('productFilter');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const statusFilterValue = statusFilter ? statusFilter.value : '';
        const productFilterValue = productFilter ? productFilter.value : '';

        // Filter pesanan
        let filteredOrders = orders.filter(order => {
            const matchesSearch = 
                order.customerName.toLowerCase().includes(searchTerm) ||
                order.email.toLowerCase().includes(searchTerm) ||
                order.id.toLowerCase().includes(searchTerm) ||
                order.phone.includes(searchTerm);

            const matchesStatus = statusFilterValue ? order.status === statusFilterValue : true;
            const matchesProduct = productFilterValue ? order.product === productFilterValue : true;

            return matchesSearch && matchesStatus && matchesProduct;
        });

        // Urutkan berdasarkan tanggal terbaru
        filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (filteredOrders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📭</div>
                    <h3>Tidak ada pesanan</h3>
                    <p>Tidak ditemukan pesanan yang sesuai dengan kriteria pencarian.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredOrders.map(order => {
            const statusClass = order.status === 'Selesai' ? 'status-selesai' : 'status-proses';
            const paymentProof = order.buktiPembayaran ? 
                `Referensi: ${order.buktiPembayaran.reference}` : 
                'Belum dikonfirmasi';

            return `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-info">
                            <div class="order-id">${order.id}</div>
                            <div class="order-customer">
                                ${order.customerName} • ${order.email} • ${order.phone}
                            </div>
                        </div>
                        <div class="order-status ${statusClass}">${order.status}</div>
                    </div>
                    
                    <div class="order-details">
                        <div class="detail-group">
                            <div class="detail-label">Produk</div>
                            <div class="detail-value">${order.product} - ${order.size} - ${order.color}</div>
                        </div>
                        
                        <div class="detail-group">
                            <div class="detail-label">Alamat</div>
                            <div class="detail-value">${order.city}, ${order.province}</div>
                        </div>
                        
                        <div class="detail-group">
                            <div class="detail-label">Metode Bayar</div>
                            <div class="detail-value">${order.paymentMethod}</div>
                        </div>
                        
                        <div class="detail-group">
                            <div class="detail-label">Uang Muka</div>
                            <div class="detail-value">${AdminUIUtils.formatCurrency(order.downpaymentAmount)}</div>
                        </div>
                        
                        <div class="detail-group">
                            <div class="detail-label">Tanggal Pesan</div>
                            <div class="detail-value">${AdminUIUtils.formatDate(order.createdAt)}</div>
                        </div>
                        
                        <div class="detail-group">
                            <div class="detail-label">Bukti Bayar</div>
                            <div class="detail-value">${paymentProof}</div>
                        </div>
                    </div>
                    
                    <div class="order-actions">
                        <button onclick="showOrderDetail('${order.id}')" class="action-btn primary">
                            Lihat Detail
                        </button>
                        <button onclick="changeOrderStatus('${order.id}', '${order.status === 'Proses' ? 'Selesai' : 'Proses'}')" 
                                class="action-btn ${order.status === 'Proses' ? 'success' : 'warning'}">
                            ${order.status === 'Proses' ? 'Tandai Selesai' : 'Tandai Proses'}
                        </button>
                        <button onclick="deleteOrder('${order.id}')" class="action-btn danger">
                            Hapus
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ [Admin] Orders displayed successfully');
        
    } catch (error) {
        console.error('❌ Error displaying orders:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Error Memuat Data</h3>
                <p>Terjadi kesalahan saat memuat data pesanan: ${error.message}</p>
            </div>
        `;
    }
}

// Fungsi untuk setup event listeners
function setupEventListeners() {
    // Pencarian
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    const performSearch = () => {
        displayAllOrders();
    };

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // Filter
    const statusFilter = document.getElementById('statusFilter');
    const productFilter = document.getElementById('productFilter');
    
    const applyFilters = () => {
        displayAllOrders();
    };

    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    if (productFilter) {
        productFilter.addEventListener('change', applyFilters);
    }
}

// ==================== INISIALISASI APLIKASI ADMIN ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin panel initializing...');
    
    // Check authentication first
    if (!checkAuth()) {
        return;
    }
    
    console.log('✅ Authentication passed');
    console.log('🔥 Firebase Available:', OrderUtils.isFirebaseAvailable());
    
    // Setup real-time updates atau manual mode
    setupRealTimeUpdates();
    
    // Jika real-time tidak aktif, load data manual
    if (!unsubscribe) {
        loadOrdersManual();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanupRealTimeUpdates);
    
    console.log('🎉 Admin panel ready!');
});
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
const OrderUtils = {
    getOrders() {
        try {
            const orders = localStorage.getItem(STORAGE_KEY);
            return orders ? JSON.parse(orders) : [];
        } catch (error) {
            console.error('Error getting orders from localStorage:', error);
            return [];
        }
    },

    saveOrders(orders) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
            return true;
        } catch (error) {
            console.error('Error saving orders to localStorage:', error);
            return false;
        }
    },

    getOrderById(id) {
        const orders = this.getOrders();
        return orders.find(order => order.id === id);
    },

    updateOrder(id, updates) {
        const orders = this.getOrders();
        const orderIndex = orders.findIndex(order => order.id === id);
        
        if (orderIndex === -1) return false;
        
        orders[orderIndex] = { ...orders[orderIndex], ...updates };
        return this.saveOrders(orders);
    },

    deleteOrder(id) {
        const orders = this.getOrders();
        const filteredOrders = orders.filter(order => order.id !== id);
        return this.saveOrders(filteredOrders);
    },

    clearAllOrders() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing orders:', error);
            return false;
        }
    },

    exportOrders() {
        const orders = this.getOrders();
        return JSON.stringify(orders, null, 2);
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

// ==================== FUNGSI GLOBAL UNTUK TOMBOL ====================

// ✅ Fungsi ini HARUS global agar tombol bisa panggil
window.showOrderDetail = function(orderId) {
    console.log('🔍 Showing order detail:', orderId);
    const order = OrderUtils.getOrderById(orderId);
    const modal = document.getElementById('orderDetailModal');
    const content = document.getElementById('orderDetailContent');

    if (!order || !modal || !content) {
        console.error('Order not found or modal elements missing');
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
};

// ✅ Fungsi global untuk ubah status
window.changeOrderStatus = function(orderId, newStatus) {
    console.log('🔄 Changing order status:', orderId, '→', newStatus);
    
    if (!confirm(`Apakah Anda yakin ingin mengubah status pesanan menjadi "${newStatus}"?`)) {
        return;
    }

    AdminUIUtils.toggleLoading(true);

    setTimeout(() => {
        const success = OrderUtils.updateOrder(orderId, { status: newStatus });
        AdminUIUtils.toggleLoading(false);

        if (success) {
            // Refresh tampilan
            displayStatistics();
            displayAllOrders();
            
            // Tutup modal jika terbuka
            const modal = document.getElementById('orderDetailModal');
            if (modal) {
                modal.classList.remove('show');
            }
            
            alert(`✅ Status pesanan berhasil diubah menjadi "${newStatus}"`);
        } else {
            alert('❌ Gagal mengubah status pesanan');
        }
    }, 500);
};

// ✅ Fungsi global untuk hapus pesanan
window.deleteOrder = function(orderId) {
    console.log('🗑️ Deleting order:', orderId);
    
    if (!confirm('Apakah Anda yakin ingin menghapus pesanan ini?')) {
        return;
    }

    AdminUIUtils.toggleLoading(true);

    setTimeout(() => {
        const success = OrderUtils.deleteOrder(orderId);
        AdminUIUtils.toggleLoading(false);

        if (success) {
            // Refresh tampilan
            displayStatistics();
            displayAllOrders();
            
            // Tutup modal jika terbuka
            const modal = document.getElementById('orderDetailModal');
            if (modal) {
                modal.classList.remove('show');
            }
            
            alert('✅ Pesanan berhasil dihapus');
        } else {
            alert('❌ Gagal menghapus pesanan');
        }
    }, 500);
};

// ✅ Fungsi global untuk logout
window.logout = function() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        sessionStorage.removeItem('merchcustom_admin_auth');
        window.location.href = 'login.html';
    }
};

// ==================== FUNGSI INTERNAL ====================

// Fungsi untuk menampilkan statistik
function displayStatistics() {
    const orders = OrderUtils.getOrders();
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
}

// Fungsi untuk menampilkan semua pesanan dengan filter
function displayAllOrders() {
    const container = document.getElementById('ordersList');
    if (!container) {
        console.error('❌ ordersList container not found');
        return;
    }

    const allOrders = OrderUtils.getOrders();
    console.log('🔄 Displaying orders:', allOrders.length);
    
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const productFilter = document.getElementById('productFilter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusFilterValue = statusFilter ? statusFilter.value : '';
    const productFilterValue = productFilter ? productFilter.value : '';

    // Filter pesanan
    let filteredOrders = allOrders.filter(order => {
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
    
    console.log('✅ Orders displayed successfully');
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

// Inisialisasi aplikasi admin ketika DOM siap
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin panel initializing...');
    
    // Check authentication first
    if (!checkAuth()) {
        return;
    }
    
    console.log('✅ Authentication passed');
    console.log('📦 Total orders:', OrderUtils.getOrders().length);
    
    // Load data awal
    displayStatistics();
    displayAllOrders();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('🎉 Admin panel ready! All buttons should work now.');
});

// ==================== GLOBAL EXPORT ====================

// Make OrderUtils available globally for testing and admin panel
if (typeof window !== 'undefined') {
    window.OrderUtils = OrderUtils;
    window.UIUtils = UIUtils;
    console.log('✅ OrderUtils exported to global scope');
}
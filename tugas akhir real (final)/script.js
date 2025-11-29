// Konstanta untuk aplikasi
const STORAGE_KEY = 'merchcustom_orders';
const DOWNPAYMENT_AMOUNT = 20000;

// Daftar provinsi Indonesia
const PROVINCES = [
    'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
    'Jambi', 'Bengkulu', 'Sumatera Selatan', 'Bangka Belitung', 'Lampung',
    'Banten', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta',
    'Jawa Timur', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
    'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur',
    'Kalimantan Utara', 'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah',
    'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Maluku',
    'Maluku Utara', 'Papua', 'Papua Barat'
];

// Fungsi utilitas untuk Hybrid Storage (LocalStorage + Firebase)
const OrderUtils = {
    // Check if Firebase is available
    isFirebaseAvailable() {
        return typeof firebaseService !== 'undefined' && firebaseService !== null;
    },

    // Generate ID untuk fallback
    generateId() {
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `INV-${datePart}-${timePart}-${randomPart}`;
    },

    // 🔄 HYBRID: Get all orders (Firebase first, fallback to localStorage)
    async getOrders() {
        try {
            // Try Firebase first
            if (this.isFirebaseAvailable()) {
                console.log('🔥 Using Firebase to get orders');
                const orders = await firebaseService.getOrders();
                
                // Sync to localStorage as backup
                this.syncToLocalStorage(orders);
                return orders;
            }
            
            // Fallback to localStorage
            console.log('💾 Firebase unavailable, using localStorage');
            return this.getOrdersLocal();
            
        } catch (error) {
            console.error('❌ Error getting orders, falling back to localStorage:', error);
            return this.getOrdersLocal();
        }
    },

    // 🔄 HYBRID: Create new order
    async createOrder(orderData) {
        try {
            // Try Firebase first
            if (this.isFirebaseAvailable()) {
                console.log('🔥 Creating order in Firebase');
                const newOrder = await firebaseService.createOrder(orderData);
                
                // Also save to localStorage as backup
                this.addOrderToLocal(newOrder);
                return newOrder;
            }
            
            // Fallback to localStorage
            console.log('💾 Firebase unavailable, creating in localStorage');
            return this.createOrderLocal(orderData);
            
        } catch (error) {
            console.error('❌ Error creating order in Firebase, using localStorage:', error);
            return this.createOrderLocal(orderData);
        }
    },

    // 🔄 HYBRID: Get order by ID
    async getOrderById(orderId) {
        try {
            // Try Firebase first
            if (this.isFirebaseAvailable()) {
                console.log('🔥 Getting order from Firebase:', orderId);
                const order = await firebaseService.getOrderById(orderId);
                if (order) return order;
            }
            
            // Fallback to localStorage
            console.log('💾 Firebase unavailable or order not found, checking localStorage');
            return this.getOrderByIdLocal(orderId);
            
        } catch (error) {
            console.error('❌ Error getting order from Firebase, checking localStorage:', error);
            return this.getOrderByIdLocal(orderId);
        }
    },

    // 🔄 HYBRID: Update order
    async updateOrder(orderId, updates) {
        try {
            // Try Firebase first
            if (this.isFirebaseAvailable()) {
                console.log('🔥 Updating order in Firebase:', orderId);
                const success = await firebaseService.updateOrder(orderId, updates);
                
                // Also update localStorage
                if (success) {
                    this.updateOrderLocal(orderId, updates);
                }
                return success;
            }
            
            // Fallback to localStorage
            console.log('💾 Firebase unavailable, updating in localStorage');
            return this.updateOrderLocal(orderId, updates);
            
        } catch (error) {
            console.error('❌ Error updating order in Firebase, using localStorage:', error);
            return this.updateOrderLocal(orderId, updates);
        }
    },

    // 🔄 HYBRID: Delete order
    async deleteOrder(orderId) {
        try {
            // Try Firebase first
            if (this.isFirebaseAvailable()) {
                console.log('🔥 Deleting order from Firebase:', orderId);
                const success = await firebaseService.deleteOrder(orderId);
                
                // Also delete from localStorage
                if (success) {
                    this.deleteOrderLocal(orderId);
                }
                return success;
            }
            
            // Fallback to localStorage
            console.log('💾 Firebase unavailable, deleting from localStorage');
            return this.deleteOrderLocal(orderId);
            
        } catch (error) {
            console.error('❌ Error deleting order from Firebase, using localStorage:', error);
            return this.deleteOrderLocal(orderId);
        }
    },

    // 🔄 HYBRID: Search orders
    async searchOrders(searchTerm) {
        try {
            // Try Firebase first
            if (this.isFirebaseAvailable()) {
                console.log('🔥 Searching orders in Firebase:', searchTerm);
                return await firebaseService.searchOrders(searchTerm);
            }
            
            // Fallback to localStorage search
            console.log('💾 Firebase unavailable, searching in localStorage');
            return this.searchOrdersLocal(searchTerm);
            
        } catch (error) {
            console.error('❌ Error searching orders in Firebase, using localStorage:', error);
            return this.searchOrdersLocal(searchTerm);
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

    createOrderLocal(orderData) {
        const orders = this.getOrdersLocal();
        const newOrder = {
            ...orderData,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            status: 'Proses',
            downpaymentAmount: DOWNPAYMENT_AMOUNT,
            buktiPembayaran: null
        };
        
        orders.push(newOrder);
        this.saveOrdersLocal(orders);
        return newOrder;
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

    searchOrdersLocal(searchTerm) {
        const orders = this.getOrdersLocal();
        if (!searchTerm.trim()) return orders;
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        return orders.filter(order => 
            order.id.toLowerCase().includes(lowerSearchTerm) ||
            order.customerName.toLowerCase().includes(lowerSearchTerm) ||
            order.email.toLowerCase().includes(lowerSearchTerm) ||
            order.phone.includes(searchTerm)
        );
    },

    saveOrdersLocal(orders) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
            return true;
        } catch (error) {
            console.error('Error saving orders to localStorage:', error);
            return false;
        }
    },

    // Sync Firebase data to localStorage
    syncToLocalStorage(firebaseOrders) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(firebaseOrders));
            console.log('✅ Synced Firebase data to localStorage');
        } catch (error) {
            console.error('Error syncing to localStorage:', error);
        }
    },

    // Add single order to localStorage
    addOrderToLocal(order) {
        const orders = this.getOrdersLocal();
        const existingIndex = orders.findIndex(o => o.id === order.id);
        
        if (existingIndex === -1) {
            orders.push(order);
        } else {
            orders[existingIndex] = order;
        }
        
        this.saveOrdersLocal(orders);
    }
};

// Fungsi utilitas untuk UI
const UIUtils = {
    // Menampilkan/menyembunyikan loading spinner
    toggleLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.toggle('show', show);
        }
    },

    // Menampilkan pesan error
    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    },

    // Menyembunyikan pesan error
    hideError(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    },

    // Memformat tanggal
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

    // Memformat currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }
};

// Fungsi untuk mengisi dropdown provinsi
function populateProvinces() {
    const provinceSelect = document.getElementById('province');
    if (provinceSelect) {
        // Hapus opsi default kecuali yang pertama
        while (provinceSelect.options.length > 1) {
            provinceSelect.remove(1);
        }
        
        // Tambahkan semua provinsi
        PROVINCES.forEach(province => {
            const option = document.createElement('option');
            option.value = province;
            option.textContent = province;
            provinceSelect.appendChild(option);
        });
    }
}

// Validasi form
function validateForm() {
    let isValid = true;
    
    // Validasi nama
    const name = document.getElementById('customerName');
    if (name && !name.value.trim()) {
        UIUtils.showError('nameError', 'Nama pembeli harus diisi');
        isValid = false;
    } else {
        UIUtils.hideError('nameError');
    }
    
    // Validasi alamat
    const address = document.getElementById('address');
    if (address && !address.value.trim()) {
        UIUtils.showError('addressError', 'Alamat pengiriman harus diisi');
        isValid = false;
    } else {
        UIUtils.hideError('addressError');
    }
    
    // Validasi provinsi
    const province = document.getElementById('province');
    if (province && !province.value) {
        UIUtils.showError('provinceError', 'Provinsi harus dipilih');
        isValid = false;
    } else {
        UIUtils.hideError('provinceError');
    }
    
    // Validasi kota
    const city = document.getElementById('city');
    if (city && !city.value.trim()) {
        UIUtils.showError('cityError', 'Kota harus diisi');
        isValid = false;
    } else {
        UIUtils.hideError('cityError');
    }
    
    // Validasi telepon
    const phone = document.getElementById('phone');
    if (phone && !phone.value.trim()) {
        UIUtils.showError('phoneError', 'Nomor HP/WhatsApp harus diisi');
        isValid = false;
    } else if (phone && !/^[\d+\-\s()]+$/.test(phone.value)) {
        UIUtils.showError('phoneError', 'Format nomor HP tidak valid');
        isValid = false;
    } else {
        UIUtils.hideError('phoneError');
    }
    
    // Validasi email
    const email = document.getElementById('email');
    if (email && !email.value.trim()) {
        UIUtils.showError('emailError', 'Email harus diisi');
        isValid = false;
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        UIUtils.showError('emailError', 'Format email tidak valid');
        isValid = false;
    } else {
        UIUtils.hideError('emailError');
    }
    
    // Validasi ukuran
    const sizeSelected = document.querySelector('input[name="size"]:checked');
    if (!sizeSelected) {
        UIUtils.showError('sizeError', 'Pilih ukuran');
        isValid = false;
    } else {
        UIUtils.hideError('sizeError');
    }
    
    // Validasi warna
    const colorSelected = document.querySelector('input[name="color"]:checked');
    if (!colorSelected) {
        UIUtils.showError('colorError', 'Pilih warna');
        isValid = false;
    } else {
        UIUtils.hideError('colorError');
    }
    
    // Validasi metode pembayaran
    const paymentSelected = document.querySelector('input[name="payment"]:checked');
    if (!paymentSelected) {
        UIUtils.showError('paymentError', 'Pilih metode pembayaran');
        isValid = false;
    } else {
        UIUtils.hideError('paymentError');
    }
    
    return isValid;
}

// Event listener untuk validasi real-time
function setupFormValidation() {
    const form = document.getElementById('orderForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    const submitBtn = document.getElementById('submitOrder');
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const isValid = validateForm();
            if (submitBtn) {
                submitBtn.disabled = !isValid;
            }
        });
        
        // Untuk radio buttons, gunakan change event
        if (input.type === 'radio') {
            input.addEventListener('change', () => {
                const isValid = validateForm();
                if (submitBtn) {
                    submitBtn.disabled = !isValid;
                }
            });
        }
    });
}

// ✅ Update handleOrderSubmit untuk async
async function handleOrderSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        alert('Harap lengkapi semua field yang wajib diisi');
        return;
    }
    
    UIUtils.toggleLoading(true);
    
    try {
        const formData = {
            product: document.getElementById('productName').value,
            size: document.querySelector('input[name="size"]:checked').value,
            color: document.querySelector('input[name="color"]:checked').value,
            customerName: document.getElementById('customerName').value,
            address: document.getElementById('address').value,
            province: document.getElementById('province').value,
            city: document.getElementById('city').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            paymentMethod: document.querySelector('input[name="payment"]:checked').value
        };
        
        const newOrder = await OrderUtils.createOrder(formData);
        
        UIUtils.toggleLoading(false);
        showPaymentInstructions(newOrder);
        
    } catch (error) {
        UIUtils.toggleLoading(false);
        alert('Terjadi kesalahan saat membuat pesanan. Silakan coba lagi.');
        console.error('Order submission error:', error);
    }
}

// Menampilkan instruksi pembayaran
function showPaymentInstructions(order) {
    const modal = document.getElementById('paymentModal');
    const instructions = document.getElementById('paymentInstructions');
    
    if (!modal || !instructions) return;
    
    // Tentukan detail bank berdasarkan metode pembayaran
    let bankDetails = '';
    switch (order.paymentMethod) {
        case 'BCA':
            bankDetails = '1234567890 a.n. PT VINIX7';
            break;
        case 'BNI':
            bankDetails = '0987654321 a.n. PT VINIX7';
            break;
        case 'BRI':
            bankDetails = '1122334455 a.n. PT VINIX7';
            break;
    }
    
    instructions.innerHTML = `
        <div class="payment-instructions">
            <h3>Instruksi Pembayaran</h3>
            <p>Silakan transfer uang muka sebesar <strong>${UIUtils.formatCurrency(order.downpaymentAmount)}</strong> ke:</p>
            <div class="bank-details">
                <div class="bank-detail">
                    <strong>${order.paymentMethod}</strong><br>
                    ${bankDetails}
                </div>
            </div>
            <p><strong>Nomor Faktur:</strong> ${order.id}</p>
            <p>Pastikan untuk mencantumkan nomor faktur dalam transfer Anda.</p>
        </div>
    `;
    
    // Setup event listener untuk konfirmasi pembayaran
    const confirmBtn = document.getElementById('confirmPayment');
    if (confirmBtn) {
        confirmBtn.onclick = () => confirmPayment(order.id);
    }
    
    // Tampilkan modal
    modal.classList.add('show');
    
    // Setup close modal
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.remove('show');
    }
    
    // Close modal ketika klik di luar
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    };
}

// ✅ Update confirmPayment untuk async
async function confirmPayment(orderId) {
    const reference = document.getElementById('paymentReference');
    const proofFile = document.getElementById('paymentProof');
    
    if (!reference || !reference.value.trim()) {
        alert('Harap masukkan nomor referensi transfer');
        return;
    }
    
    UIUtils.toggleLoading(true);
    
    try {
        const paymentProof = {
            reference: reference.value.trim(),
            confirmedAt: new Date().toISOString(),
            file: proofFile.files.length > 0 ? proofFile.files[0].name : null
        };
        
        const success = await OrderUtils.updateOrder(orderId, {
            status: 'Selesai',
            buktiPembayaran: paymentProof
        });
        
        UIUtils.toggleLoading(false);
        
        if (success) {
            window.location.href = `success.html?order=${orderId}`;
        } else {
            alert('Terjadi kesalahan saat mengkonfirmasi pembayaran. Silakan coba lagi.');
        }
    } catch (error) {
        UIUtils.toggleLoading(false);
        alert('Error confirming payment: ' + error.message);
    }
}

// ✅ Update handleTransactionSearch untuk async  
async function handleTransactionSearch(event) {
    event.preventDefault();
    
    const invoiceNumber = document.getElementById('invoiceNumber');
    const resultDiv = document.getElementById('transactionResult');
    
    if (!invoiceNumber || !resultDiv) return;
    
    const invoiceId = invoiceNumber.value.trim();
    if (!invoiceId) {
        UIUtils.showError('invoiceError', 'Masukkan nomor faktur');
        return;
    }
    
    UIUtils.toggleLoading(true);
    
    try {
        const order = await OrderUtils.getOrderById(invoiceId);
        UIUtils.toggleLoading(false);
        
        if (order) {
            displayOrderResult(order, resultDiv);
        } else {
            resultDiv.innerHTML = `
                <div class="invoice-card">
                    <p style="text-align: center; color: var(--text-light);">
                        Nomor faktur <strong>${invoiceId}</strong> tidak ditemukan.
                    </p>
                </div>
            `;
        }
    } catch (error) {
        UIUtils.toggleLoading(false);
        alert('Error searching transaction: ' + error.message);
    }
}

// Menampilkan hasil pencarian order
function displayOrderResult(order, container) {
    const statusClass = order.status === 'Selesai' ? 'status-selesai' : 'status-proses';
    
    container.innerHTML = `
        <div class="invoice-card">
            <div class="invoice-header">
                <div class="invoice-id-container">
                    <span class="invoice-id">${order.id}</span>
                    <button onclick="copyInvoiceId('${order.id}')" class="copy-btn" title="Salin nomor invoice">
                        <svg class="copy-icon" viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                        </svg>
                        Salin
                    </button>
                </div>
                <div class="invoice-status ${statusClass}">${order.status}</div>
            </div>
            
            <div class="invoice-details-grid">
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
                    <div class="detail-label">Metode Pembayaran</div>
                    <div class="detail-value">${order.paymentMethod}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Nama Pembeli</div>
                    <div class="detail-value">${order.customerName}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${order.email}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Telepon</div>
                    <div class="detail-value">${order.phone}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Alamat</div>
                    <div class="detail-value">${order.address}, ${order.city}, ${order.province}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Uang Muka</div>
                    <div class="detail-value">${UIUtils.formatCurrency(order.downpaymentAmount)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Tanggal Pesan</div>
                    <div class="detail-value">${UIUtils.formatDate(order.createdAt)}</div>
                </div>
            </div>
            
            ${order.buktiPembayaran ? `
                <div class="detail-group" style="grid-column: 1 / -1; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                    <div class="detail-label">Bukti Pembayaran</div>
                    <div class="detail-value">
                        <strong>Referensi:</strong> ${order.buktiPembayaran.reference}<br>
                        <strong>Waktu Konfirmasi:</strong> ${UIUtils.formatDate(order.buktiPembayaran.confirmedAt)}
                        ${order.buktiPembayaran.file ? `<br><strong>File:</strong> ${order.buktiPembayaran.file}` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="invoice-actions">
                <button onclick="downloadPDFInvoice('${order.id}')" class="action-btn primary">
                    <svg class="action-icon" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                    </svg>
                    Cetak Invoice
                </button>
            </div>
        </div>
    `;
}

// Fungsi untuk generate dan download PDF Invoice
function downloadPDFInvoice(orderId) {
    const order = OrderUtils.getOrderById(orderId);
    if (!order) {
        alert('Data pesanan tidak ditemukan');
        return;
    }

    // Debug: Cek apakah jsPDF tersedia
    console.log('jsPDF available:', typeof jsPDF !== 'undefined');
    console.log('window.jspdf:', window.jspdf);
    
    // Cek apakah jsPDF tersedia dengan cara yang benar
    if (typeof jsPDF === 'undefined' && !window.jspdf) {
        alert('Fitur PDF sedang tidak tersedia. Silakan refresh halaman dan coba lagi.');
        return;
    }

    UIUtils.toggleLoading(true);

    try {
        // Gunakan jsPDF - perhatikan cara pemanggilan yang benar
        const { jsPDF } = window.jspdf || window;
        const doc = new jsPDF();
        
        // Set document properties
        doc.setProperties({
            title: `Invoice ${order.id}`,
            subject: 'Invoice Merchandise Custom',
            author: 'MerchCustom',
            keywords: 'invoice, merchandise, custom',
            creator: 'MerchCustom'
        });

        // Add logo/header
        doc.setFontSize(20);
        doc.setTextColor(58, 134, 255);
        doc.text('VINIX7 SABLON', 105, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('INVOICE', 105, 30, { align: 'center' });

        // Invoice ID and Date
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Invoice: ${order.id}`, 20, 45);
        doc.text(`Tanggal: ${new Date(order.createdAt).toLocaleDateString('id-ID')}`, 20, 52);
        doc.text(`Status: ${order.status}`, 20, 59);

        // Line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 65, 190, 65);

        // Customer Information
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('INFORMASI PELANGGAN', 20, 75);
        doc.setFont(undefined, 'normal');
        
        doc.text(`Nama: ${order.customerName}`, 20, 85);
        doc.text(`Email: ${order.email}`, 20, 92);
        doc.text(`Telepon: ${order.phone}`, 20, 99);
        doc.text(`Alamat: ${order.address}`, 20, 106);
        doc.text(`Kota: ${order.city}, ${order.province}`, 20, 113);

        // Order Details
        doc.setFont(undefined, 'bold');
        doc.text('DETAIL PESANAN', 20, 125);
        doc.setFont(undefined, 'normal');
        
        doc.text(`Produk: ${order.product}`, 20, 135);
        doc.text(`Ukuran: ${order.size}`, 20, 142);
        doc.text(`Warna: ${order.color}`, 20, 149);
        doc.text(`Metode Pembayaran: ${order.paymentMethod}`, 20, 156);

        // Payment Information
        doc.setFont(undefined, 'bold');
        doc.text('INFORMASI PEMBAYARAN', 20, 168);
        doc.setFont(undefined, 'normal');
        
        doc.text(`Uang Muka: Rp ${order.downpaymentAmount.toLocaleString('id-ID')}`, 20, 178);
        
        if (order.buktiPembayaran) {
            doc.text(`Referensi: ${order.buktiPembayaran.reference}`, 20, 185);
            doc.text(`Waktu Konfirmasi: ${new Date(order.buktiPembayaran.confirmedAt).toLocaleDateString('id-ID')}`, 20, 192);
        }

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Terima kasih telah berbelanja di VINIX7 Sablon', 105, 260, { align: 'center' });
        doc.text('www.merchcustom.com | +62 812-3456-7890 | vinix7sablon@gmail.com', 105, 267, { align: 'center' });

        // Save PDF
        doc.save(`invoice-${order.id}.pdf`);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Terjadi kesalahan saat membuat PDF: ' + error.message);
    } finally {
        UIUtils.toggleLoading(false);
    }
}

// Fallback function jika jsPDF tidak tersedia
function generateTextInvoice(orderId) {
    const order = OrderUtils.getOrderById(orderId);
    if (!order) return;
    
    let invoiceText = `
INVOICE - MERCHCUSTOM
=====================

Invoice: ${order.id}
Tanggal: ${UIUtils.formatDate(order.createdAt)}
Status: ${order.status}

INFORMASI PELANGGAN:
Nama: ${order.customerName}
Email: ${order.email}
Telepon: ${order.phone}
Alamat: ${order.address}
Kota: ${order.city}, ${order.province}

DETAIL PESANAN:
Produk: ${order.product}
Ukuran: ${order.size}
Warna: ${order.color}
Metode Pembayaran: ${order.paymentMethod}

INFORMASI PEMBAYARAN:
Uang Muka: ${UIUtils.formatCurrency(order.downpaymentAmount)}
${order.buktiPembayaran ? `
Referensi: ${order.buktiPembayaran.reference}
Waktu Konfirmasi: ${UIUtils.formatDate(order.buktiPembayaran.confirmedAt)}
` : ''}

Terima kasih telah berbelanja di MerchCustom
www.merchcustom.com | +62 812-3456-7890 | vinix7sablon@gmail.com
    `;
    
    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${orderId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Fungsi untuk copy invoice ID ke clipboard
function copyInvoiceId(orderId) {
    navigator.clipboard.writeText(orderId).then(() => {
        // Tampilkan feedback sukses
        showCopyFeedback('Berhasil disalin!');
    }).catch(err => {
        // Fallback untuk browser lama
        const textArea = document.createElement('textarea');
        textArea.value = orderId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopyFeedback('Berhasil disalin!');
    });
}

// Fungsi untuk menampilkan feedback copy
function showCopyFeedback(message) {
    // Cek jika sudah ada feedback, hapus dulu
    const existingFeedback = document.querySelector('.copy-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // Buat element feedback
    const feedback = document.createElement('div');
    feedback.className = 'copy-feedback';
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    // Tampilkan feedback
    setTimeout(() => {
        feedback.classList.add('show');
    }, 10);
    
    // Sembunyikan setelah 2 detik
    setTimeout(() => {
        feedback.classList.remove('show');
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 2000);
}

// displaySuccessInvoice dengan error handling
async function displaySuccessInvoice() {
    console.log('🔄 displaySuccessInvoice called');
    
    // Tunggu sebentar untuk pastikan DOM benar-benar ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    const container = document.getElementById('invoiceDetails');
    
    console.log('🔍 Parameters:', { orderId, container: !!container });
    
    if (!orderId) {
        console.error('❌ No order ID found in URL');
        showError('Parameter order tidak ditemukan di URL');
        return;
    }
    
    if (!container) {
        console.error('❌ invoiceDetails container not found');
        showError('Element invoiceDetails tidak ditemukan');
        return;
    }
    
    console.log('✅ Starting to load order details for:', orderId);
    
    // Show loading state
    container.innerHTML = `
        <div class="invoice-card">
            <div style="text-align: center; padding: 2rem;">
                <div class="spinner" style="margin: 0 auto;"></div>
                <p>Memuat detail pesanan...</p>
                <p><small>ID: ${orderId}</small></p>
            </div>
        </div>
    `;
    
    try {
        console.log('🔍 Fetching order from database...');
        const order = await OrderUtils.getOrderById(orderId);
        
        console.log('📦 Order data received:', order);
        
        if (!order) {
            console.error('❌ Order not found in database');
            showError(`Pesanan dengan ID ${orderId} tidak ditemukan`);
            return;
        }
        
        renderInvoice(order, container);
        
    } catch (error) {
        console.error('❌ Error loading order details:', error);
        showError(`Terjadi kesalahan: ${error.message}`);
    }
}

function renderInvoice(order, container) {
    console.log('🎨 Rendering invoice for order:', order.id);
    
    // Format helpers dengan fallback
    const formatValue = (value) => value || '-';
    const formatCurrency = (amount) => {
        if (!amount) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    container.innerHTML = `
        <div class="invoice-card">
            <div class="invoice-header">
                <div class="invoice-id-container">
                    <span class="invoice-id">${formatValue(order.id)}</span>
                    <button onclick="copyInvoiceId('${order.id}')" class="copy-btn" title="Salin nomor invoice">
                        <svg class="copy-icon" viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                        </svg>
                        Salin
                    </button>
                </div>
                <div class="invoice-status status-selesai">${formatValue(order.status)}</div>
            </div>
            
            <div class="invoice-details-grid">
                <div class="detail-group">
                    <div class="detail-label">Produk</div>
                    <div class="detail-value">${formatValue(order.product)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Ukuran</div>
                    <div class="detail-value">${formatValue(order.size)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Warna</div>
                    <div class="detail-value">${formatValue(order.color)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Metode Pembayaran</div>
                    <div class="detail-value">${formatValue(order.paymentMethod)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Nama Pembeli</div>
                    <div class="detail-value">${formatValue(order.customerName)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${formatValue(order.email)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Telepon</div>
                    <div class="detail-value">${formatValue(order.phone)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Alamat</div>
                    <div class="detail-value">${formatValue(order.address)}, ${formatValue(order.city)}, ${formatValue(order.province)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Uang Muka</div>
                    <div class="detail-value">${formatCurrency(order.downpaymentAmount)}</div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-label">Tanggal Pesan</div>
                    <div class="detail-value">${formatDate(order.createdAt)}</div>
                </div>
                
                ${order.buktiPembayaran ? `
                    <div class="detail-group">
                        <div class="detail-label">Referensi Pembayaran</div>
                        <div class="detail-value">${formatValue(order.buktiPembayaran.reference)}</div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-label">Waktu Konfirmasi</div>
                        <div class="detail-value">${formatDate(order.buktiPembayaran.confirmedAt)}</div>
                    </div>
                ` : `
                    <div class="detail-group">
                        <div class="detail-label">Status Pembayaran</div>
                        <div class="detail-value" style="color: var(--warning-color);">Menunggu Konfirmasi</div>
                    </div>
                `}
            </div>
            
            <div class="invoice-actions">
                <button onclick="downloadPDFInvoice('${order.id}')" class="action-btn primary">
                    <svg class="action-icon" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                    </svg>
                    Cetak Invoice
                </button>
            </div>
        </div>
    `;
    
    console.log('✅ Invoice rendered successfully');
}

function showError(message) {
    const container = document.getElementById('invoiceDetails');
    if (container) {
        container.innerHTML = `
            <div class="invoice-card">
                <div style="text-align: center; color: var(--danger-color); padding: 2rem;">
                    <h3>⚠️ Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="success-btn" style="margin-top: 1rem;">
                        Coba Lagi
                    </button>
                    <button onclick="window.location.href='index.html'" class="success-btn secondary" style="margin-top: 0.5rem;">
                        Kembali ke Beranda
                    </button>
                </div>
            </div>
        `;
    }
}

// Data contoh untuk testing
function seedSampleData() {
    const orders = OrderUtils.getOrders();
    
    // Hanya seed jika tidak ada data
    if (orders.length === 0) {
        const sampleOrders = [
            {
                id: 'INV-20231215-123456-0001',
                product: 'Kaos Custom',
                size: 'L',
                color: 'Hitam',
                customerName: 'Budi Santoso',
                address: 'Jl. Merdeka No. 123',
                province: 'DKI Jakarta',
                city: 'Jakarta Pusat',
                phone: '081234567890',
                email: 'budi@example.com',
                paymentMethod: 'BCA',
                status: 'Proses',
                downpaymentAmount: DOWNPAYMENT_AMOUNT,
                createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 hari yang lalu
                buktiPembayaran: null
            },
            {
                id: 'INV-20231214-093000-0002',
                product: 'Tumblr Custom',
                size: 'Sedang',
                color: 'Silver',
                customerName: 'Sari Indah',
                address: 'Jl. Sudirman No. 456',
                province: 'Jawa Barat',
                city: 'Bandung',
                phone: '087654321098',
                email: 'sari@example.com',
                paymentMethod: 'BRI',
                status: 'Selesai',
                downpaymentAmount: DOWNPAYMENT_AMOUNT,
                createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 hari yang lalu
                buktiPembayaran: {
                    reference: 'TRX123456789',
                    confirmedAt: new Date(Date.now() - 86400000).toISOString(),
                    file: 'bukti-transfer.jpg'
                }
            }
        ];
        
        OrderUtils.saveOrders(sampleOrders);
        console.log('Sample data seeded with storage key:', STORAGE_KEY);
    }
}

// ==================== INISIALISASI APLIKASI ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 MerchCustom Hybrid App Initializing...');
    console.log('🔥 Firebase Available:', OrderUtils.isFirebaseAvailable());
    
    // Isi dropdown provinsi di semua form
    populateProvinces();
    
    // Setup form validation untuk halaman produk
    setupFormValidation();
    
    // Event listener untuk form pemesanan
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', handleOrderSubmit);
    }
    
    // Event listener untuk form pencarian transaksi
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', handleTransactionSearch);
    }
    
    // Tampilkan invoice di halaman sukses
    if (window.location.pathname.includes('success.html')) {
        displaySuccessInvoice();
    }
    
    // Seed sample data untuk testing (hanya dijalankan sekali)
    seedSampleData();
    
    console.log('✅ Hybrid app initialized successfully!');
});

// Pastikan fungsi tersedia di global scope
if (typeof window !== 'undefined') {
    window.displaySuccessInvoice = displaySuccessInvoice;
    window.showError = showError;
}
// Global variables
let inventory = [];
let orders = [];
let activityHistory = [];
let currentEditPartId = null;
let currentEditOrderId = null;
let currentOrderStatusFilter = ''; // Add this for the new filter system
let currentOrderCategories = []; // Store categories for current order being created

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    setupNavigation();
    setupEventListeners();
    setupToastContainer();
    setupCategoryFormListener();
    
    // Initialize the new order category system
    initializeOrderCategorySystem();
    
    loadSampleData();
    updateDashboard();
    
    // Check for low stock notifications on startup
    setTimeout(() => {
        checkLowStockNotifications();
    }, 2000); // Delay to ensure everything is loaded
}

function setupCategoryFormListener() {
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const categorySelect = document.getElementById('categorySelect').value;
            const partId = document.getElementById('categoryPart').value;
            const quantity = parseInt(document.getElementById('categoryQuantity').value);
            
            // Validation
            if (!categorySelect) {
                showToast('Please select a category first', 'error');
                return;
            }
            
            if (!partId) {
                showToast('Please select a part', 'error');
                return;
            }
            
            if (isNaN(quantity) || quantity <= 0) {
                showToast('Please enter a valid quantity', 'error');
                return;
            }
            
            // Find the part
            const part = inventory.find(p => p.partId === partId);
            if (!part) {
                showToast('Selected part not found', 'error');
                return;
            }
            
            // Check if order quantity exceeds available inventory
            if (quantity > part.quantity) {
                showToast(`Cannot add: Requested quantity (${quantity}) exceeds available stock (${part.quantity})`, 'error');
                return;
            }
            
            // Check if part is already added
            const existingCategory = currentOrderCategories.find(cat => cat.partId === partId);
            if (existingCategory) {
                showToast('This part is already added to the order', 'error');
                return;
            }
            
            // Add category
            currentOrderCategories.push({
                partId: partId,
                partName: part.name,
                category: categorySelect,
                quantity: quantity,
                price: part.price
            });
            
            updateCategoriesList();
            closeCategoryModal();
            showToast('Category added successfully!', 'success');
        });
    }
}

// Setup toast container
function setupToastContainer() {
    if (!document.getElementById('toastContainer')) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
}

// Navigation System
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item:not(.logout)');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get page to show
            const pageToShow = this.dataset.page;
            
            // Hide all pages
            const pages = document.querySelectorAll('.page');
            pages.forEach(page => page.classList.remove('active'));
            
            // Show selected page
            const targetPage = document.getElementById(pageToShow + '-page');
            if (targetPage) {
                targetPage.classList.add('active');
            }
            
            // Update page title
            updatePageTitle(pageToShow);
            
            // Refresh data if needed
            refreshPageData(pageToShow);
        });
    });
}

function updatePageTitle(page) {
    const titles = {
        'dashboard': '📊 Dashboard Overview',
        'inventory': '📦 Inventory Management',
        'orders': '📋 Order Management',
        'activity': '📝 Activity History',
        'reports': '📈 Reports & Analytics'
    };
    
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
}

function refreshPageData(page) {
    switch(page) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'inventory':
            displayInventoryTable();
            break;
        case 'orders':
            displayOrdersTable();
            break;
        case 'activity':
            displayActivityHistory();
            break;
        case 'reports':
            updateReports();
            break;
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Search and filter functionality
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const orderSearchInput = document.getElementById('orderSearchInput');
    const orderDateFilter = document.getElementById('orderDateFilter');
    const activityDateFrom = document.getElementById('activityDateFrom');
    const activityDateTo = document.getElementById('activityDateTo');
    const actionTypeFilter = document.getElementById('actionTypeFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', displayInventoryTable);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', displayInventoryTable);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', displayInventoryTable);
    }
    
    if (orderSearchInput) {
        orderSearchInput.addEventListener('input', displayOrdersTable);
    }
    
    if (orderDateFilter) {
        orderDateFilter.addEventListener('change', displayOrdersTable);
    }
    
    if (activityDateFrom) {
        activityDateFrom.addEventListener('change', displayActivityHistory);
    }
    
    if (activityDateTo) {
        activityDateTo.addEventListener('change', displayActivityHistory);
    }
    
    if (actionTypeFilter) {
        actionTypeFilter.addEventListener('change', displayActivityHistory);
    }
    
    // Report filters
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    if (monthFilter) {
        monthFilter.addEventListener('change', renderWeeklyChart);
    }
    
    if (yearFilter) {
        yearFilter.addEventListener('change', renderWeeklyChart);
    }
    
    // Form submissions
    const partForm = document.getElementById('partForm');
    if (partForm) {
        partForm.addEventListener('submit', handlePartFormSubmit);
    }
    
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', handleOrderFormSubmit);
    }
    
    // Modal close events
    window.addEventListener('click', function(event) {
        const modals = ['partModal', 'orderModal', 'categoryModal', 'lowStockModal', 'confirmModal', 'detailsModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Auto-generate Part ID when category changes
    document.addEventListener('change', function(e) {
        if (e.target.id === 'partCategory' && !currentEditPartId) {
            document.getElementById('partId').value = generatePartId();
        }
    });
}

// Date and Time
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    document.getElementById('dateTime').textContent = now.toLocaleDateString('en-US', options);
}

// Sample Data Initialization
function loadSampleData() {
    // Sample inventory data
    inventory = [
        {
            id: generateId(),
            partId: 'CPU001',
            name: 'Intel Core i9-13900K',
            brand: 'Intel',
            category: 'Processor (CPU)',
            price: 33000,
            quantity: 25,
            alertThreshold: 5,
            status: 'auto'
        },
        {
            id: generateId(),
            partId: 'GPU001',
            name: 'NVIDIA RTX 4080',
            brand: 'NVIDIA',
            category: 'Graphic Card (GPU)',
            price: 68000,
            quantity: 3,
            alertThreshold: 5,
            status: 'auto'
        },
        {
            id: generateId(),
            partId: 'RAM001',
            name: 'Corsair Vengeance LPX 32GB',
            brand: 'Corsair',
            category: 'Memory (RAM)',
            price: 7300,
            quantity: 0,
            alertThreshold: 10,
            status: 'auto'
        },
        {
            id: generateId(),
            partId: 'SSD001',
            name: 'Samsung 980 PRO 1TB',
            brand: 'Samsung',
            category: 'Storage',
            price: 8500,
            quantity: 30,
            alertThreshold: 8,
            status: 'auto'
        },
        {
            id: generateId(),
            partId: 'MB001',
            name: 'ASUS ROG Strix X670E',
            brand: 'ASUS',
            category: 'Motherboard',
            price: 25500,
            quantity: 15,
            alertThreshold: 5,
            status: 'auto'
        },
        {
            id: generateId(),
            partId: 'PSU001',
            name: 'Corsair RM850x',
            brand: 'Corsair',
            category: 'Power Supply',
            price: 10200,
            quantity: 5,
            alertThreshold: 5,
            status: 'auto'
        },
        {
            id: generateId(),
            partId: 'COOL001',
            name: 'Noctua NH-D15',
            brand: 'Noctua',
            category: 'Cooling System',
            price: 5700,
            quantity: 22,
            alertThreshold: 5,
            status: 'auto'
        },
        {
            id: generateId(),
            partId: 'CASE001',
            name: 'Fractal Design Define 7',
            brand: 'Fractal Design',
            category: 'Computer Case',
            price: 9600,
            quantity: 12,
            alertThreshold: 3,
            status: 'auto'
        },
        {
            id: generateId(),
            partId: 'PER001',
            name: 'Logitech MX Master 3',
            brand: 'Logitech',
            category: 'Peripheral',
            price: 5000,
            quantity: 8,
            alertThreshold: 5,
            status: 'Discontinued'
        }
    ];

    // Sample orders data
    orders = [
        {
            id: generateId(),
            orderId: 'ORD001',
            partId: 'RAM001',
            partName: 'Corsair Vengeance LPX 32GB',
            date: '2024-01-15',
            quantity: 20,
            status: 'Pending'
        },
        {
            id: generateId(),
            orderId: 'ORD002',
            partId: 'GPU001',
            partName: 'NVIDIA RTX 4080',
            date: '2024-01-14',
            quantity: 2,
            status: 'Pending'
        },
        {
            id: generateId(),
            orderId: 'ORD003',
            partId: 'PSU001',
            partName: 'Corsair RM850x',
            date: '2024-01-13',
            quantity: 10,
            status: 'Cancelled'
        }
    ];

    // Initialize activity history
    activityHistory = [
        {
            id: generateId(),
            timestamp: new Date().toISOString(),
            partName: 'System Initialization',
            partId: 'SYS000',
            actionType: 'Addition',
            details: 'Sample data loaded successfully'
        }
    ];
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generatePartId() {
    const categories = {
        'Processor (CPU)': 'CPU',
        'Memory (RAM)': 'RAM',
        'Graphic Card (GPU)': 'GPU',
        'Storage': 'SSD',
        'Motherboard': 'MB',
        'Power Supply': 'PSU',
        'Cooling System': 'COOL',
        'Computer Case': 'CASE',
        'Peripheral': 'PER'
    };
    
    const category = document.getElementById('partCategory').value;
    const prefix = categories[category] || 'GEN';
    const number = String(inventory.filter(p => p.partId.startsWith(prefix)).length + 1).padStart(3, '0');
    
    return `${prefix}${number}`;
}

function generateOrderId() {
    const number = String(orders.length + 1).padStart(3, '0');
    return `ORD${number}`;
}

function getStockLevel(part) {
    if (part.status === 'Discontinued') {
        return 'Discontinued';
    }
    
    if (part.quantity === 0) {
        return 'Out of Stock';
    } else if (part.quantity <= part.alertThreshold) {
        return 'Low Stock';
    } else {
        return 'In Stock';
    }
}

function logActivity(partName, partId, actionType, details) {
    activityHistory.unshift({
        id: generateId(),
        timestamp: new Date().toISOString(),
        partName,
        partId,
        actionType,
        details
    });
}

// Enhanced Category Management Functions

// Toggle the inline category form
function toggleCategoryForm() {
    const formContainer = document.getElementById('categoryFormContainer');
    const button = event.target;
    
    if (formContainer.style.display === 'none' || formContainer.style.display === '') {
        formContainer.style.display = 'block';
        button.textContent = 'HIDE FORM';
        button.style.background = '#95a5a6';
    } else {
        formContainer.style.display = 'none';
        button.textContent = 'ADD CATEGORY';
        button.style.background = '#2c3e50';
        
        // Reset form when hiding
        document.getElementById('inlineCategorySelect').value = '';
        document.getElementById('inlineCategoryPart').innerHTML = '<option value="">Select Category First</option>';
        document.getElementById('inlineCategoryPart').disabled = true;
        document.getElementById('inlineCategoryQuantity').value = '';
    }
}

// Initialize the enhanced functionality
function initializeOrderCategorySystem() {
    setupInlineCategoryListener();
    
    // Hide the category form initially
    const formContainer = document.getElementById('categoryFormContainer');
    if (formContainer) {
        formContainer.style.display = 'none';
    }
}

// Populate parts when category is selected in inline form
function setupInlineCategoryListener() {
    const categorySelect = document.getElementById('inlineCategorySelect');
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            populateInlinePartsForCategory(this.value);
        });
    }
}

function populateInlinePartsForCategory(selectedCategory) {
    const partSelect = document.getElementById('inlineCategoryPart');
    
    if (!selectedCategory) {
        partSelect.innerHTML = '<option value="">Select Category First</option>';
        partSelect.disabled = true;
        return;
    }
    
    // Filter parts by selected category that have stock
    const categoryParts = inventory.filter(part => 
        part.category === selectedCategory && part.quantity > 0
    );
    
    partSelect.innerHTML = '<option value="">Select Part</option>';
    partSelect.disabled = false;
    
    categoryParts.forEach(part => {
        const option = document.createElement('option');
        option.value = part.partId;
        option.textContent = `${part.name} (Stock: ${part.quantity})`;
        partSelect.appendChild(option);
    });
    
    if (categoryParts.length === 0) {
        partSelect.innerHTML = '<option value="">No parts available in this category</option>';
        partSelect.disabled = true;
    }
}

// Add category from inline form
function addInlineCategory() {
    const categorySelect = document.getElementById('inlineCategorySelect').value;
    const partId = document.getElementById('inlineCategoryPart').value;
    const quantity = parseInt(document.getElementById('inlineCategoryQuantity').value);
    
    // Validation
    if (!categorySelect) {
        showToast('Please select a category first', 'error');
        return;
    }
    
    if (!partId) {
        showToast('Please select a part', 'error');
        return;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }
    
    // Find the part
    const part = inventory.find(p => p.partId === partId);
    if (!part) {
        showToast('Selected part not found', 'error');
        return;
    }
    
    // Check if order quantity exceeds available inventory
    if (quantity > part.quantity) {
        showToast(`Cannot add: Requested quantity (${quantity}) exceeds available stock (${part.quantity})`, 'error');
        return;
    }
    
    // Check if part is already added
    const existingCategoryIndex = currentOrderCategories.findIndex(cat => cat.partId === partId);
    if (existingCategoryIndex !== -1) {
        showToast('This part is already added to the order', 'error');
        return;
    }
    
    // Add category
    currentOrderCategories.push({
        id: generateId(), // Add unique ID for editing
        partId: partId,
        partName: part.name,
        category: categorySelect,
        quantity: quantity,
        price: part.price,
        maxStock: part.quantity
    });
    
    updateCategoriesList();
    
    // Reset form
    document.getElementById('inlineCategorySelect').value = '';
    document.getElementById('inlineCategoryPart').innerHTML = '<option value="">Select Category First</option>';
    document.getElementById('inlineCategoryPart').disabled = true;
    document.getElementById('inlineCategoryQuantity').value = '';
    
    showToast('Category added successfully!', 'success');
}

// Enhanced updateCategoriesList function with edit capabilities
function updateCategoriesList() {
    const container = document.getElementById('orderCategoriesList');
    
    if (currentOrderCategories.length === 0) {
        container.innerHTML = '<div class="no-categories">No parts added yet.</div>';
        return;
    }
    
    container.innerHTML = '';
    currentOrderCategories.forEach((category, index) => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.style.marginBottom = '15px';
        
        categoryItem.innerHTML = `
            <div class="category-item-content" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: white; border: 1px solid #e0e6ed; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div class="category-info" style="flex: 1;">
                    <div class="category-item-info" style="display: flex; align-items: center; gap: 15px;">
                        <div class="category-icon" style="font-size: 1.5rem; color: #3498db;">📦</div>
                        <div class="category-details">
                            <h4 style="margin: 0; color: #2c3e50; font-weight: 600; font-size: 1rem;">${category.partName}</h4>
                            <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 0.9rem;">
                                <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 10px; font-size: 0.8rem; margin-right: 10px;">${category.category}</span>
                                Part ID: ${category.partId} | Max Stock: ${category.maxStock}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="category-actions" style="display: flex; align-items: center; gap: 15px;">
                    <div class="quantity-controls" style="display: flex; align-items: center; gap: 8px;">
                        <label style="font-size: 0.9rem; color: #7f8c8d; font-weight: 600;">Qty:</label>
                        <select id="quantity-${category.id}" style="padding: 6px 10px; border: 2px solid #e0e6ed; border-radius: 6px; font-size: 0.9rem; min-width: 80px;" onchange="updateCategoryQuantity('${category.id}', this.value)">
                            ${generateQuantityOptions(category.maxStock, category.quantity)}
                        </select>
                    </div>
                    <button class="category-remove" onclick="removeCategory(${index})" title="Remove" style="background: #e74c3c; color: white; border: none; border-radius: 4px; padding: 8px 12px; font-size: 1rem; cursor: pointer; transition: background 0.3s ease;">
                        🗑️
                    </button>
                </div>
            </div>
        `;
        container.appendChild(categoryItem);
    });
}

// Generate quantity options for dropdown
function generateQuantityOptions(maxStock, currentQuantity) {
    let options = '';
    for (let i = 1; i <= Math.min(maxStock, 50); i++) { // Limit to 50 for performance
        const selected = i === currentQuantity ? 'selected' : '';
        options += `<option value="${i}" ${selected}>${i}</option>`;
    }
    return options;
}

// Update category quantity
function updateCategoryQuantity(categoryId, newQuantity) {
    const quantity = parseInt(newQuantity);
    const categoryIndex = currentOrderCategories.findIndex(cat => cat.id === categoryId);
    
    if (categoryIndex !== -1) {
        const category = currentOrderCategories[categoryIndex];
        
        // Validation
        if (quantity > category.maxStock) {
            showToast(`Quantity cannot exceed available stock (${category.maxStock})`, 'error');
            // Reset to previous value
            document.getElementById(`quantity-${categoryId}`).value = category.quantity;
            return;
        }
        
        if (quantity <= 0) {
            showToast('Quantity must be greater than 0', 'error');
            document.getElementById(`quantity-${categoryId}`).value = category.quantity;
            return;
        }
        
        // Update quantity
        currentOrderCategories[categoryIndex].quantity = quantity;
        showToast(`Quantity updated to ${quantity}`, 'success');
    }
}

// Enhanced removeCategory function
function removeCategory(index) {
    if (index >= 0 && index < currentOrderCategories.length) {
        const category = currentOrderCategories[index];
        currentOrderCategories.splice(index, 1);
        updateCategoriesList();
        showToast(`${category.partName} removed from order`, 'info');
    }
}

// Dashboard Functions
function updateDashboard() {
    const totalParts = inventory.reduce((sum, part) => sum + part.quantity, 0);
    const totalValue = inventory.reduce((sum, part) => sum + (part.price * part.quantity), 0);
    const lowStockItems = inventory.filter(part => {
        const stockLevel = getStockLevel(part);
        return stockLevel === 'Low Stock' || stockLevel === 'Out of Stock';
    }).length;
    const pendingOrders = orders.filter(order => order.status === 'Pending').length;

    document.getElementById('totalParts').textContent = totalParts.toLocaleString();
    document.getElementById('totalValue').textContent = `₱${totalValue.toLocaleString('en-PH')}`;
    document.getElementById('lowStockItems').textContent = lowStockItems;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    
    // Update notification badge
    updateNotificationBadge(lowStockItems);
    
    // Update charts
    renderCategoryChart();
    renderStockChart();
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    badge.textContent = count;
    
    if (count > 0) {
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderCategoryChart() {
    const categoryData = {};
    inventory.forEach(part => {
        categoryData[part.category] = (categoryData[part.category] || 0) + part.quantity;
    });

    const chartContainer = document.getElementById('categoryChart');
    chartContainer.innerHTML = '';

    if (Object.keys(categoryData).length === 0) {
        chartContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No data available</p>';
        return;
    }

    const maxValue = Math.max(...Object.values(categoryData));
    
    Object.entries(categoryData).forEach(([category, count]) => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${(count / maxValue) * 160}px`;
        
        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = category.split(' ')[0];
        
        const value = document.createElement('div');
        value.className = 'bar-value';
        value.textContent = count;
        
        bar.appendChild(label);
        bar.appendChild(value);
        chartContainer.appendChild(bar);
    });
}

function renderStockChart() {
    const stockData = {
        'In Stock': 0,
        'Low Stock': 0,
        'Out of Stock': 0,
        'Discontinued': 0
    };
    
    inventory.forEach(part => {
        const stockLevel = getStockLevel(part);
        stockData[stockLevel]++;
    });
    
    // Update legend with counts
    const legend = document.getElementById('stockChart');
    const legendItems = legend.querySelectorAll('.legend-item');
    
    legendItems.forEach((item, index) => {
        const spans = item.querySelectorAll('span');
        if (spans.length > 1) {
            const statusNames = ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'];
            const status = statusNames[index];
            if (status) {
                spans[1].textContent = `${status} (${stockData[status] || 0})`;
            }
        }
    });
}

// Inventory Management Functions
function displayInventoryTable() {
    const tableBody = document.getElementById('partsTableBody');
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    const filteredInventory = inventory.filter(part => {
        const matchesSearch = part.name.toLowerCase().includes(searchTerm) ||
                            part.brand.toLowerCase().includes(searchTerm) ||
                            part.partId.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || part.category === categoryFilter;
        const stockLevel = getStockLevel(part);
        const matchesStatus = !statusFilter || stockLevel === statusFilter;
        
        return matchesSearch && matchesCategory && matchesStatus;
    });

    tableBody.innerHTML = '';

    if (filteredInventory.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="9" style="text-align: center; padding: 40px;">
                <div style="color: #7f8c8d; font-size: 1.1rem;">
                    ${inventory.length === 0 ? 'No parts found. Click "Add New Part" to get started.' : 'No parts match your search criteria.'}
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }

    filteredInventory.forEach(part => {
        const stockLevel = getStockLevel(part);
        const statusClass = stockLevel.toLowerCase().replace(/\s+/g, '-');
        const isOutOfStock = stockLevel === 'Out of Stock';

        const row = document.createElement('tr');
        if (isOutOfStock) {
            row.style.opacity = '0.6';
            row.style.background = '#f8f9fa';
        }
        
        row.innerHTML = `
            <td><strong>${part.partId}</strong></td>
            <td>
                <div style="font-weight: 600;">${part.name}</div>
            </td>
            <td>${part.brand}</td>
            <td><span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${part.category}</span></td>
            <td style="font-weight: 600; color: #27ae60;">₱${parseInt(part.price).toLocaleString('en-PH')}</td>
            <td style="font-weight: 600; font-size: 1.1rem;">${part.quantity}</td>
            <td>${part.alertThreshold}</td>
            <td><span class="status-badge status-${statusClass}">${stockLevel}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-warning btn-sm" onclick="editPart('${part.id}')">
                        ✏️
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeletePart('${part.id}')">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function openAddPartModal() {
    currentEditPartId = null;
    document.getElementById('partModalTitle').textContent = 'Add New Part';
    document.getElementById('partForm').reset();
    
    // Auto-generate Part ID
    setTimeout(() => {
        const category = document.getElementById('partCategory').value;
        if (category) {
            document.getElementById('partId').value = generatePartId();
        }
    }, 100);
    
    document.getElementById('partModal').style.display = 'block';
}

function editPart(id) {
    currentEditPartId = id;
    const part = inventory.find(p => p.id === id);
    
    if (!part) {
        showToast('Part not found', 'error');
        return;
    }
    
    document.getElementById('partModalTitle').textContent = 'Edit Part';
    document.getElementById('partId').value = part.partId;
    document.getElementById('partName').value = part.name;
    document.getElementById('partBrand').value = part.brand;
    document.getElementById('partCategory').value = part.category;
    document.getElementById('partPrice').value = part.price;
    document.getElementById('partQuantity').value = part.quantity;
    document.getElementById('partAlertThreshold').value = part.alertThreshold;
    document.getElementById('partStatus').value = part.status;
    
    document.getElementById('partModal').style.display = 'block';
}

function closePartModal() {
    document.getElementById('partModal').style.display = 'none';
    currentEditPartId = null;
}

function handlePartFormSubmit(e) {
    e.preventDefault();
    
    const partId = document.getElementById('partId').value.trim();
    const name = document.getElementById('partName').value.trim();
    const brand = document.getElementById('partBrand').value.trim();
    const category = document.getElementById('partCategory').value;
    const price = parseFloat(document.getElementById('partPrice').value);
    const quantity = parseInt(document.getElementById('partQuantity').value);
    const alertThreshold = parseInt(document.getElementById('partAlertThreshold').value);
    const status = document.getElementById('partStatus').value;
    
    // Validation
    if (!partId || !name || !brand || !category || isNaN(price) || isNaN(quantity) || isNaN(alertThreshold)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Check for duplicate Part ID
    const existingPart = inventory.find(p => p.partId === partId && p.id !== currentEditPartId);
    if (existingPart) {
        showToast('Part ID already exists', 'error');
        return;
    }
    
    const partData = {
        partId,
        name,
        brand,
        category,
        price,
        quantity,
        alertThreshold,
        status
    };
    
    if (currentEditPartId) {
        // Update existing part
        const partIndex = inventory.findIndex(p => p.id === currentEditPartId);
        if (partIndex !== -1) {
            const oldPart = inventory[partIndex];
            inventory[partIndex] = { ...inventory[partIndex], ...partData };
            
            logActivity(name, partId, 'Update', `Updated part details`);
            showToast('Part updated successfully!', 'success');
        }
    } else {
        // Add new part
        const newPart = {
            id: generateId(),
            ...partData
        };
        
        inventory.push(newPart);
        logActivity(name, partId, 'Addition', `Added new part to inventory`);
        showToast('Part added successfully!', 'success');
    }
    
    closePartModal();
    displayInventoryTable();
    updateDashboard();
    
    // Check for low stock notifications
    triggerStockNotification();
}

function confirmDeletePart(id) {
    const part = inventory.find(p => p.id === id);
    if (!part) {
        showToast('Part not found', 'error');
        return;
    }
    
    showConfirmModal(
        'Delete Part',
        `Are you sure you want to delete "${part.name}"? This action cannot be undone.`,
        () => deletePart(id)
    );
}

function deletePart(id) {
    const partIndex = inventory.findIndex(p => p.id === id);
    if (partIndex !== -1) {
        const part = inventory[partIndex];
        inventory.splice(partIndex, 1);
        
        logActivity(part.name, part.partId, 'Deletion', `Removed part from inventory`);
        showToast('Part deleted successfully!', 'success');
        
        displayInventoryTable();
        updateDashboard();
        
        // Check for stock notifications
        triggerStockNotification();
    }
}

// Order Management Functions
function displayOrdersTable() {
    const tableBody = document.getElementById('ordersTableBody');
    const searchTerm = document.getElementById('orderSearchInput')?.value.toLowerCase() || '';
    const dateFilter = document.getElementById('orderDateFilter')?.value || '';
    
    let filteredOrders = orders.filter(order => {
        const matchesSearch = order.orderId.toLowerCase().includes(searchTerm) ||
                            order.partName.toLowerCase().includes(searchTerm);
        const matchesStatus = !currentOrderStatusFilter || order.status === currentOrderStatusFilter;
        const matchesDate = !dateFilter || order.date === dateFilter;
        
        return matchesSearch && matchesStatus && matchesDate;
    });
    
    // Sort orders: Pending first, then Completed/Cancelled by date (newest first)
    filteredOrders.sort((a, b) => {
        // Pending orders first
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        
        // Within same status group, sort by date (newest first)
        return new Date(b.date) - new Date(a.date);
    });

    tableBody.innerHTML = '';

    if (filteredOrders.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div style="color: #7f8c8d; font-size: 1.1rem;">
                    No orders found.
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }

    filteredOrders.forEach(order => {
        const statusClass = order.status.toLowerCase();
        const isCompleted = order.status === 'Completed' || order.status === 'Cancelled';
        const formattedDate = new Date(order.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const row = document.createElement('tr');
        
        // Apply grayscale to completed/cancelled orders
        if (isCompleted) {
            row.style.filter = 'grayscale(100%)';
            row.style.opacity = '0.7';
        }
        
        row.innerHTML = `
            <td><strong>${order.orderId}</strong></td>
            <td>${order.partName}</td>
            <td>${formattedDate}</td>
            <td style="font-weight: 600;">${order.quantity}</td>
            <td><span class="status-badge status-${statusClass}">${order.status}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-warning btn-sm" onclick="editOrder('${order.id}')">
                        ✏️
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteOrder('${order.id}')">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function filterOrdersByStatus(status) {
    currentOrderStatusFilter = status;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    displayOrdersTable();
}

function openAddOrderModal() {
    currentEditOrderId = null;
    currentOrderCategories = [];
    document.getElementById('orderModalTitle').textContent = 'CREATE ORDER';
    document.getElementById('orderForm').reset();
    
    // Set default values
    document.getElementById('orderId').value = generateOrderId();
    document.getElementById('orderDate').value = new Date().toISOString().split('T')[0];
    
    // Hide status field for new orders (always defaults to Pending)
    const statusGroup = document.getElementById('orderStatusGroup');
    if (statusGroup) {
        statusGroup.style.display = 'none';
    }
    
    // Clear categories list and hide category form
    updateCategoriesList();
    const formContainer = document.getElementById('categoryFormContainer');
    if (formContainer) {
        formContainer.style.display = 'none';
    }
    
    // Reset ADD CATEGORY button
    const addCategoryBtn = document.querySelector('.btn-category');
    if (addCategoryBtn) {
        addCategoryBtn.textContent = 'ADD CATEGORY';
        addCategoryBtn.style.background = '#2c3e50';
    }
    
    document.getElementById('orderModal').style.display = 'block';
    
    // Initialize category system for this modal instance
    initializeOrderCategorySystem();
}

function editOrder(id) {
    currentEditOrderId = id;
    const order = orders.find(o => o.id === id);
    
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    document.getElementById('orderModalTitle').textContent = 'Edit Order';
    document.getElementById('orderId').value = order.orderId;
    document.getElementById('orderDate').value = order.date;
    document.getElementById('orderStatus').value = order.status;
    
    // Show status field for editing existing orders
    const statusGroup = document.getElementById('orderStatusGroup');
    statusGroup.style.display = 'block';
    
    // Set up the category with the existing order data
    const part = inventory.find(p => p.partId === order.partId);
    if (part) {
        currentOrderCategories = [{
            id: generateId(),
            partId: order.partId,
            partName: order.partName,
            category: part.category,
            quantity: order.quantity,
            price: part.price,
            maxStock: part.quantity + order.quantity // Add current order quantity to available stock
        }];
        updateCategoriesList();
    }
    
    document.getElementById('orderModal').style.display = 'block';
}

function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
    currentEditOrderId = null;
    currentOrderCategories = [];
}

// Enhanced handleOrderFormSubmit to handle multiple categories
function handleOrderFormSubmit(e) {
    e.preventDefault();
    
    const orderId = document.getElementById('orderId').value.trim();
    const date = document.getElementById('orderDate').value;
    const status = currentEditOrderId ? document.getElementById('orderStatus').value : 'Pending';
    
    // Validation
    if (!orderId || !date) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (currentOrderCategories.length === 0) {
        showToast('Please add at least one category to the order', 'error');
        return;
    }
    
    // Check for duplicate Order ID
    const existingOrder = orders.find(o => o.orderId === orderId && o.id !== currentEditOrderId);
    if (existingOrder) {
        showToast('Order ID already exists', 'error');
        return;
    }
    
    // For editing, handle single category
    if (currentEditOrderId && currentOrderCategories.length === 1) {
        const category = currentOrderCategories[0];
        const part = inventory.find(p => p.partId === category.partId);
        
        if (!part) {
            showToast(`Part ${category.partName} not found`, 'error');
            return;
        }
        
        const orderData = {
            orderId: orderId,
            partId: category.partId,
            partName: category.partName,
            date: date,
            quantity: category.quantity,
            status: status
        };
        
        const orderIndex = orders.findIndex(o => o.id === currentEditOrderId);
        if (orderIndex !== -1) {
            const oldOrder = orders[orderIndex];
            orders[orderIndex] = { ...orders[orderIndex], ...orderData };
            
            // Handle inventory updates based on status changes
            updateInventoryForOrderStatusChange(part, oldOrder, orders[orderIndex]);
            
            logActivity(part.name, part.partId, 'Order Impact', `Updated order ${orderId}`);
            showToast('Order updated successfully!', 'success');
        }
    } else {
        // Create orders for each category (new orders)
        const newOrders = [];
        let hasError = false;
        
        currentOrderCategories.forEach((category, index) => {
            const part = inventory.find(p => p.partId === category.partId);
            if (!part) {
                showToast(`Part ${category.partName} not found`, 'error');
                hasError = true;
                return;
            }
            
            // Check stock availability
            if (category.quantity > part.quantity) {
                showToast(`Insufficient stock for ${category.partName}. Available: ${part.quantity}, Requested: ${category.quantity}`, 'error');
                hasError = true;
                return;
            }
            
            const orderData = {
                id: generateId(),
                orderId: currentOrderCategories.length > 1 ? `${orderId}-${index + 1}` : orderId,
                partId: category.partId,
                partName: category.partName,
                date: date,
                quantity: category.quantity,
                status: status
            };
            
            newOrders.push(orderData);
        });
        
        if (hasError) {
            return;
        }
        
        // Add all orders
        newOrders.forEach(orderData => {
            orders.push(orderData);
            
            const part = inventory.find(p => p.partId === orderData.partId);
            logActivity(orderData.partName, orderData.partId, 'Order Impact', 
                `Created order ${orderData.orderId} for ${orderData.quantity} units (Status: ${orderData.status})`);
        });
        
        showToast(`Order ${orderId} created successfully with ${newOrders.length} items!`, 'success');
    }
    
    closeOrderModal();
    displayOrdersTable();
    displayInventoryTable();
    updateDashboard();
    triggerStockNotification();
}

function updateInventoryForOrderStatusChange(part, oldOrder, newOrder) {
    // Handle inventory changes based on status transitions
    
    // If old order was completed, restore the quantity first
    if (oldOrder.status === 'Completed') {
        part.quantity += oldOrder.quantity;
        logActivity(part.name, part.partId, 'Order Impact', `Restored ${oldOrder.quantity} units from order ${oldOrder.orderId} status change`);
    }
    
    // If new order is completed, deduct the quantity
    if (newOrder.status === 'Completed') {
        if (part.quantity >= newOrder.quantity) {
            part.quantity -= newOrder.quantity;
            logActivity(part.name, part.partId, 'Order Impact', `Deducted ${newOrder.quantity} units for completed order ${newOrder.orderId}`);
        } else {
            showToast('Insufficient stock for completed order', 'warning');
            // Set quantity to 0 if not enough stock
            part.quantity = Math.max(0, part.quantity - newOrder.quantity);
        }
    }
    
    // Check for stock notifications after inventory change
    triggerStockNotification();
    
    // No inventory change needed for Pending or Cancelled status
}

function confirmDeleteOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    showConfirmModal(
        'Delete Order',
        `Are you sure you want to delete order "${order.orderId}"? This action cannot be undone.`,
        () => deleteOrder(id)
    );
}

function deleteOrder(id) {
    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex !== -1) {
        const order = orders[orderIndex];
        const part = inventory.find(p => p.partId === order.partId);
        
        // Restore inventory only if order was completed (since only completed orders deduct inventory)
        if (order.status === 'Completed' && part) {
            part.quantity += order.quantity;
            logActivity(part.name, part.partId, 'Order Impact', `Restored ${order.quantity} units from deleted completed order ${order.orderId}`);
        }
        
        orders.splice(orderIndex, 1);
        
        logActivity(order.partName, order.partId, 'Order Impact', `Deleted order ${order.orderId}`);
        showToast('Order deleted successfully!', 'success');
        
        displayOrdersTable();
        displayInventoryTable();
        updateDashboard();
        
        // Check for stock notifications
        triggerStockNotification();
    }
}

// Activity History Functions
function displayActivityHistory() {
    const tableBody = document.getElementById('activityTableBody');
    const dateFrom = document.getElementById('activityDateFrom')?.value;
    const dateTo = document.getElementById('activityDateTo')?.value;
    const actionTypeFilter = document.getElementById('actionTypeFilter')?.value || '';
    
    let filteredActivity = activityHistory.filter(activity => {
        const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
        const matchesDateFrom = !dateFrom || activityDate >= dateFrom;
        const matchesDateTo = !dateTo || activityDate <= dateTo;
        const matchesActionType = !actionTypeFilter || activity.actionType === actionTypeFilter;
        
        return matchesDateFrom && matchesDateTo && matchesActionType;
    });

    tableBody.innerHTML = '';

    if (filteredActivity.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" style="text-align: center; padding: 40px;">
                <div style="color: #7f8c8d; font-size: 1.1rem;">
                    No activity history found.
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }

    filteredActivity.forEach(activity => {
        const timestamp = new Date(activity.timestamp);
        const formattedTime = timestamp.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const actionIcon = {
            'Addition': '➕',
            'Update': '✏️',
            'Order Impact': '📦',
            'Deletion': '🗑️'
        };

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td><strong>${activity.partName}</strong></td>
            <td><code>${activity.partId}</code></td>
            <td>
                <span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">
                    ${actionIcon[activity.actionType] || '📝'} ${activity.actionType}
                </span>
            </td>
            <td style="color: #7f8c8d;">${activity.details}</td>
        `;
        tableBody.appendChild(row);
    });
}

function clearActivityFilters() {
    document.getElementById('activityDateFrom').value = '';
    document.getElementById('activityDateTo').value = '';
    document.getElementById('actionTypeFilter').value = '';
    displayActivityHistory();
}

// Reports Functions
function updateReports() {
    updateInventoryReports();
    updateStockLevelReports();
    updateOrderReports();
    updateWeeklyOrderChart();
    renderReportsAnalytics();
}

function renderReportsAnalytics() {
    // Render category chart for reports page
    renderReportsCategoryChart();
    renderReportsStockChart();
}

function renderReportsCategoryChart() {
    const categoryData = {};
    inventory.forEach(part => {
        categoryData[part.category] = (categoryData[part.category] || 0) + part.quantity;
    });

    const chartContainer = document.getElementById('reportsCategoryChart');
    if (!chartContainer) return;
    
    chartContainer.innerHTML = '';

    if (Object.keys(categoryData).length === 0) {
        chartContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No data available</p>';
        return;
    }

    const maxValue = Math.max(...Object.values(categoryData));
    
    Object.entries(categoryData).forEach(([category, count]) => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${(count / maxValue) * 160}px`;
        
        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = category.split(' ')[0];
        
        const value = document.createElement('div');
        value.className = 'bar-value';
        value.textContent = count;
        
        bar.appendChild(label);
        bar.appendChild(value);
        chartContainer.appendChild(bar);
    });
}

function renderReportsStockChart() {
    const stockData = {
        'In Stock': 0,
        'Low Stock': 0,
        'Out of Stock': 0,
        'Discontinued': 0
    };
    
    inventory.forEach(part => {
        const stockLevel = getStockLevel(part);
        stockData[stockLevel]++;
    });
    
    // Update legend with counts for reports page
    const legend = document.getElementById('reportsStockChart');
    if (!legend) return;
    
    const legendItems = legend.querySelectorAll('.legend-item');
    
    legendItems.forEach((item, index) => {
        const spans = item.querySelectorAll('span');
        if (spans.length > 1) {
            const statusNames = ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'];
            const status = statusNames[index];
            if (status) {
                spans[1].textContent = `${status} (${stockData[status] || 0})`;
            }
        }
    });
}

function updateInventoryReports() {
    const totalParts = inventory.reduce((sum, part) => sum + part.quantity, 0);
    const totalValue = inventory.reduce((sum, part) => sum + (part.price * part.quantity), 0);
    const categories = [...new Set(inventory.map(part => part.category))].length;

    document.getElementById('reportTotalParts').textContent = totalParts.toLocaleString();
    document.getElementById('reportTotalValue').textContent = `₱${totalValue.toLocaleString('en-PH')}`;
    document.getElementById('reportCategories').textContent = categories;
}

function updateStockLevelReports() {
    const stockCounts = {
        inStock: 0,
        lowStock: 0,
        outStock: 0,
        discontinued: 0
    };
    
    inventory.forEach(part => {
        const stockLevel = getStockLevel(part);
        switch(stockLevel) {
            case 'In Stock':
                stockCounts.inStock++;
                break;
            case 'Low Stock':
                stockCounts.lowStock++;
                break;
            case 'Out of Stock':
                stockCounts.outStock++;
                break;
            case 'Discontinued':
                stockCounts.discontinued++;
                break;
        }
    });
    
    document.getElementById('inStockCount').textContent = stockCounts.inStock;
    document.getElementById('lowStockCount').textContent = stockCounts.lowStock;
    document.getElementById('outStockCount').textContent = stockCounts.outStock;
    document.getElementById('discontinuedCount').textContent = stockCounts.discontinued;
}

function updateOrderReports() {
    const orderCounts = {
        pending: 0,
        completed: 0,
        cancelled: 0
    };
    
    let completedOrdersValue = 0;
    
    orders.forEach(order => {
        switch(order.status) {
            case 'Pending':
                orderCounts.pending++;
                break;
            case 'Completed':
                orderCounts.completed++;
                const part = inventory.find(p => p.partId === order.partId);
                if (part) {
                    completedOrdersValue += part.price * order.quantity;
                }
                break;
            case 'Cancelled':
                orderCounts.cancelled++;
                break;
        }
    });
    
    document.getElementById('pendingOrdersCount').textContent = orderCounts.pending;
    document.getElementById('completedOrdersCount').textContent = orderCounts.completed;
    document.getElementById('completedOrdersValue').textContent = `₱${completedOrdersValue.toLocaleString('en-PH')}`;
    document.getElementById('cancelledOrdersCount').textContent = orderCounts.cancelled;
}

function updateWeeklyOrderChart() {
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    if (!monthFilter || !yearFilter) return;
    
    // Set current month and year as default
    const now = new Date();
    monthFilter.value = now.getMonth();
    yearFilter.value = now.getFullYear();
    
    renderWeeklyChart();
}

function renderWeeklyChart() {
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    const chartContainer = document.getElementById('weeklyOrderChart');
    
    if (!monthFilter || !yearFilter || !chartContainer) return;
    
    const selectedMonth = parseInt(monthFilter.value);
    const selectedYear = parseInt(yearFilter.value);
    
    // Get orders for selected month/year
    const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate.getMonth() === selectedMonth && orderDate.getFullYear() === selectedYear;
    });
    
    // Group orders by week
    const weekData = [0, 0, 0, 0]; // Week 1, 2, 3, 4
    
    monthOrders.forEach(order => {
        const orderDate = new Date(order.date);
        const dayOfMonth = orderDate.getDate();
        const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
        weekData[weekIndex]++;
    });
    
    // Render compact chart
    chartContainer.innerHTML = '';
    
    const weekBar = document.createElement('div');
    weekBar.className = 'week-bar';
    
    const maxValue = Math.max(...weekData, 1); // Ensure at least 1 for scaling
    
    weekData.forEach((count, index) => {
        const weekItem = document.createElement('div');
        weekItem.className = 'week-bar-item';
        
        const column = document.createElement('div');
        column.className = 'week-bar-column';
        column.style.height = `${(count / maxValue) * 60}px`;
        
        const value = document.createElement('div');
        value.className = 'week-bar-value';
        value.textContent = count;
        
        const label = document.createElement('div');
        label.className = 'week-bar-label';
        label.textContent = `W${index + 1}`;
        
        column.appendChild(value);
        weekItem.appendChild(column);
        weekItem.appendChild(label);
        weekBar.appendChild(weekItem);
    });
    
    chartContainer.appendChild(weekBar);
}

// Stock Details Modal Functions
function showStockDetails(type) {
    let title, items;
    
    switch(type) {
        case 'in':
            title = 'In Stock Parts';
            items = inventory.filter(part => getStockLevel(part) === 'In Stock');
            break;
        case 'low':
            title = 'Low Stock Parts';
            items = inventory.filter(part => getStockLevel(part) === 'Low Stock');
            break;
        case 'out':
            title = 'Out of Stock Parts';
            items = inventory.filter(part => getStockLevel(part) === 'Out of Stock');
            break;
        case 'discontinued':
            title = 'Discontinued Parts';
            items = inventory.filter(part => getStockLevel(part) === 'Discontinued');
            break;
        default:
            return;
    }
    
    document.getElementById('detailsModalTitle').textContent = title;
    
    const container = document.getElementById('detailsTableContainer');
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <div style="font-size: 3rem; margin-bottom: 10px;">✅</div>
                <div>No ${title.toLowerCase()} found!</div>
            </div>
        `;
    } else {
        const table = document.createElement('table');
        table.className = 'details-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Part ID</th>
                    <th>Part Name</th>
                    <th>Brand</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Alert Threshold</th>
                    <th>Unit Price</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(part => `
                    <tr>
                        <td><strong>${part.partId}</strong></td>
                        <td>${part.name}</td>
                        <td>${part.brand}</td>
                        <td><span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${part.category}</span></td>
                        <td style="font-weight: 600; color: ${part.quantity === 0 ? '#e74c3c' : '#f39c12'};">${part.quantity}</td>
                        <td>${type === 'discontinued' ? 'N/A' : part.alertThreshold}</td>
                        <td style="font-weight: 600; color: #27ae60;">₱${parseInt(part.price).toLocaleString('en-PH')}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        container.appendChild(table);
    }
    
    document.getElementById('detailsModal').style.display = 'block';
}

// Order Details Modal Functions
function showOrderDetails(status) {
    let title, items;
    
    switch(status) {
        case 'pending':
            title = 'Pending Orders';
            items = orders.filter(order => order.status === 'Pending');
            break;
        case 'completed':
            title = 'Completed Orders';
            items = orders.filter(order => order.status === 'Completed');
            break;
        case 'cancelled':
            title = 'Cancelled Orders';
            items = orders.filter(order => order.status === 'Cancelled');
            break;
        default:
            return;
    }
    
    document.getElementById('detailsModalTitle').textContent = title;
    
    const container = document.getElementById('detailsTableContainer');
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <div style="font-size: 3rem; margin-bottom: 10px;">📋</div>
                <div>No ${title.toLowerCase()} found!</div>
            </div>
        `;
    } else {
        const table = document.createElement('table');
        table.className = 'details-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Part Name</th>
                    <th>Date</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(order => {
                    const part = inventory.find(p => p.partId === order.partId);
                    const unitPrice = part ? part.price : 0;
                    const totalValue = unitPrice * order.quantity;
                    const formattedDate = new Date(order.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    return `
                        <tr>
                            <td><strong>${order.orderId}</strong></td>
                            <td>${order.partName}</td>
                            <td>${formattedDate}</td>
                            <td style="font-weight: 600;">${order.quantity}</td>
                            <td style="font-weight: 600; color: #27ae60;">₱${unitPrice.toLocaleString('en-PH')}</td>
                            <td style="font-weight: 600; color: #27ae60;">₱${totalValue.toLocaleString('en-PH')}</td>
                            <td><span class="status-badge status-${status}">${order.status}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;
        
        container.appendChild(table);
    }
    
    document.getElementById('detailsModal').style.display = 'block';
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

function generateStockAlertReport() {
    const lowStockItems = inventory.filter(part => getStockLevel(part) === 'Low Stock');
    const outOfStockItems = inventory.filter(part => getStockLevel(part) === 'Out of Stock');
    
    let report = 'PC PARTS STOCK ALERT REPORT\n';
    report += '==============================\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    report += 'CRITICAL ALERTS:\n';
    report += `Out of Stock Items: ${outOfStockItems.length}\n`;
    report += `Low Stock Items: ${lowStockItems.length}\n\n`;
    
    if (outOfStockItems.length > 0) {
        report += 'OUT OF STOCK ITEMS:\n';
        report += '-'.repeat(80) + '\n';
        report += 'Part ID'.padEnd(12) + 'Name'.padEnd(30) + 'Brand'.padEnd(15) + 'Category\n';
        report += '-'.repeat(80) + '\n';
        
        outOfStockItems.forEach(part => {
            report += part.partId.padEnd(12) + 
                     part.name.substring(0, 28).padEnd(30) + 
                     part.brand.substring(0, 13).padEnd(15) + 
                     part.category + '\n';
        });
        report += '\n';
    }
    
    if (lowStockItems.length > 0) {
        report += 'LOW STOCK ITEMS:\n';
        report += '-'.repeat(90) + '\n';
        report += 'Part ID'.padEnd(12) + 'Name'.padEnd(30) + 'Current'.padEnd(10) + 'Threshold'.padEnd(12) + 'Category\n';
        report += '-'.repeat(90) + '\n';
        
        lowStockItems.forEach(part => {
            report += part.partId.padEnd(12) + 
                     part.name.substring(0, 28).padEnd(30) + 
                     part.quantity.toString().padEnd(10) + 
                     part.alertThreshold.toString().padEnd(12) + 
                     part.category + '\n';
        });
    }
    
    downloadReport(report, 'stock-alert-report.txt');
}

function generateInventoryReport() {
    let report = 'PC PARTS INVENTORY REPORT\n';
    report += '========================\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    report += 'SUMMARY:\n';
    report += `Total Parts: ${inventory.reduce((sum, part) => sum + part.quantity, 0)}\n`;
    report += `Total Value: ₱${inventory.reduce((sum, part) => sum + (part.price * part.quantity), 0).toLocaleString('en-PH')}\n`;
    report += `Low Stock Items: ${inventory.filter(part => getStockLevel(part) === 'Low Stock').length}\n`;
    report += `Out of Stock Items: ${inventory.filter(part => getStockLevel(part) === 'Out of Stock').length}\n\n`;
    
    report += 'DETAILED INVENTORY:\n';
    report += '-'.repeat(100) + '\n';
    report += 'Part ID'.padEnd(10) + 'Name'.padEnd(30) + 'Brand'.padEnd(15) + 'Category'.padEnd(20) + 'Quantity'.padEnd(10) + 'Status\n';
    report += '-'.repeat(100) + '\n';
    
    inventory.forEach(part => {
        report += part.partId.padEnd(10) + 
                 part.name.substring(0, 28).padEnd(30) + 
                 part.brand.substring(0, 13).padEnd(15) + 
                 part.category.substring(0, 18).padEnd(20) + 
                 part.quantity.toString().padEnd(10) + 
                 getStockLevel(part) + '\n';
    });
    
    downloadReport(report, 'inventory-report.txt');
}

function generateOrderReport() {
    let report = 'PC PARTS ORDER REPORT\n';
    report += '====================\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    report += 'SUMMARY:\n';
    report += `Total Orders: ${orders.length}\n`;
    report += `Pending Orders: ${orders.filter(order => order.status === 'Pending').length}\n`;
    report += `Completed Orders: ${orders.filter(order => order.status === 'Completed').length}\n`;
    report += `Cancelled Orders: ${orders.filter(order => order.status === 'Cancelled').length}\n\n`;
    
    report += 'DETAILED ORDERS:\n';
    report += '-'.repeat(100) + '\n';
    report += 'Order ID'.padEnd(12) + 'Part Name'.padEnd(30) + 'Date'.padEnd(12) + 'Quantity'.padEnd(10) + 'Status\n';
    report += '-'.repeat(100) + '\n';
    
    orders.forEach(order => {
        report += order.orderId.padEnd(12) + 
                 order.partName.substring(0, 28).padEnd(30) + 
                 order.date.padEnd(12) + 
                 order.quantity.toString().padEnd(10) + 
                 order.status + '\n';
    });
    
    downloadReport(report, 'order-report.txt');
}

function downloadReport(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('Report downloaded successfully!', 'success');
}

// Low Stock Alert Functions
function showLowStockAlert() {
    const lowStockItems = inventory.filter(part => {
        const stockLevel = getStockLevel(part);
        return stockLevel === 'Low Stock' || stockLevel === 'Out of Stock';
    });
    
    const alertContent = document.getElementById('lowStockList');
    alertContent.innerHTML = '';
    
    if (lowStockItems.length === 0) {
        alertContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #27ae60;">
                <div style="font-size: 3rem; margin-bottom: 10px;">✅</div>
                <div style="font-size: 1.2rem; font-weight: 600;">All items are well stocked!</div>
                <div style="color: #7f8c8d; margin-top: 5px;">No items require immediate attention.</div>
            </div>
        `;
    } else {
        lowStockItems.forEach(part => {
            const stockLevel = getStockLevel(part);
            const urgencyClass = stockLevel === 'Out of Stock' ? 'error' : 'warning';
            
            const alertItem = document.createElement('div');
            alertItem.className = 'alert-item';
            alertItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${part.name}</strong> (${part.partId})<br>
                        <small>Current: ${part.quantity} | Threshold: ${part.alertThreshold}</small>
                    </div>
                    <span style="color: ${urgencyClass === 'error' ? '#e74c3c' : '#f39c12'}; font-weight: bold;">
                        ${stockLevel}
                    </span>
                </div>
            `;
            alertContent.appendChild(alertItem);
        });
    }
    
    document.getElementById('lowStockModal').style.display = 'block';
}

function closeLowStockModal() {
    document.getElementById('lowStockModal').style.display = 'none';
}

// Modal Functions
function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    const confirmBtn = document.getElementById('confirmYes');
    confirmBtn.onclick = function() {
        closeConfirmModal();
        onConfirm();
    };
    
    document.getElementById('confirmModal').style.display = 'block';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// Toast Notifications
function showToast(message, type = 'success', title = null) {
    // Ensure toast container exists
    setupToastContainer();
    
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Define icons and titles for each type
    const toastConfig = {
        success: {
            icon: '✓',
            defaultTitle: 'Success Alert'
        },
        error: {
            icon: '!',
            defaultTitle: 'Error Alert'
        },
        warning: {
            icon: '!',
            defaultTitle: 'Warning Alert'
        },
        info: {
            icon: 'i',
            defaultTitle: 'Info Alert'
        }
    };
    
    const config = toastConfig[type] || toastConfig.success;
    const toastTitle = title || config.defaultTitle;
    
    toast.innerHTML = `
        <div class="toast-icon">${config.icon}</div>
        <div class="toast-content">
            <div class="toast-title">${toastTitle}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="closeToast(this)">×</button>
    `;
    
    // Add to container (will appear at bottom due to flex-direction: column-reverse)
    toastContainer.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto-hide toast after 4 seconds
    setTimeout(() => {
        closeToast(toast.querySelector('.toast-close'));
    }, 4000);
    
    // Limit to 5 toasts maximum
    const toasts = toastContainer.querySelectorAll('.toast');
    if (toasts.length > 5) {
        // Remove the oldest toast (first in container)
        closeToast(toasts[0].querySelector('.toast-close'));
    }
}

function closeToast(closeButton) {
    const toast = closeButton.closest('.toast');
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            const toastContainer = document.getElementById('toastContainer');
            if (toastContainer && toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }
}

// Low Stock Notification System
function checkLowStockNotifications() {
    const lowStockItems = inventory.filter(part => {
        const stockLevel = getStockLevel(part);
        return stockLevel === 'Low Stock' || stockLevel === 'Out of Stock';
    });
    
    if (lowStockItems.length > 0) {
        const outOfStockCount = lowStockItems.filter(part => getStockLevel(part) === 'Out of Stock').length;
        const lowStockCount = lowStockItems.filter(part => getStockLevel(part) === 'Low Stock').length;
        
        let message = '';
        let type = 'warning';
        
        if (outOfStockCount > 0 && lowStockCount > 0) {
            message = `${outOfStockCount} items out of stock, ${lowStockCount} items low stock`;
            type = 'error';
        } else if (outOfStockCount > 0) {
            message = `${outOfStockCount} item${outOfStockCount > 1 ? 's' : ''} out of stock`;
            type = 'error';
        } else {
            message = `${lowStockCount} item${lowStockCount > 1 ? 's' : ''} running low on stock`;
            type = 'warning';
        }
        
        // Show notification with click action
        showToast(`${message}. Click notification bell to view details.`, type, 'Stock Alert');
    }
}

// Enhanced notification check after inventory changes
function triggerStockNotification() {
    // Small delay to ensure UI updates first
    setTimeout(() => {
        checkLowStockNotifications();
    }, 500);
}

// Logout function
function logout() {
    showConfirmModal(
        'Confirm Logout',
        'Are you sure you want to logout?',
        function() {
            // Clear session data if needed
            showToast('Logged out successfully!', 'info');
            
            // Could redirect to login page if needed
            // window.location.href = 'login.html';
        }
    );
}
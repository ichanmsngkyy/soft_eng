// Enhanced handleOrderFormSubmit to handle multiple categories
function handleOrderFormSubmit(e) {
    e.preventDefault();
    
    const orderIdElement = document.getElementById('orderId');
    const orderDateElement = document.getElementById('orderDate');
    const orderStatusElement = document.getElementById('orderStatus');
    
    if (!orderIdElement || !orderDateElement) {
        showToast('Required form elements not found', 'error');
        return;
    }
    
    const orderId = orderIdElement.value.trim();
    const date = orderDateElement.value;
    const status = currentEditOrderId && orderStatusElement ? orderStatusElement.value : 'Pending';
    
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
    if (!tableBody) return;
    
    const activityDateFrom = document.getElementById('activityDateFrom');
    const activityDateTo = document.getElementById('activityDateTo');
    const actionTypeFilter = document.getElementById('actionTypeFilter');
    
    const dateFrom = activityDateFrom ? activityDateFrom.value : '';
    const dateTo = activityDateTo ? activityDateTo.value : '';
    const actionTypeFilterValue = actionTypeFilter ? actionTypeFilter.value : '';
    
    let filteredActivity = activityHistory.filter(activity => {
        const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
        const matchesDateFrom = !dateFrom || activityDate >= dateFrom;
        const matchesDateTo = !dateTo || activityDate <= dateTo;
        const matchesActionType = !actionTypeFilterValue || activity.actionType === actionTypeFilterValue;
        
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
    const activityDateFrom = document.getElementById('activityDateFrom');
    const activityDateTo = document.getElementById('activityDateTo');
    const actionTypeFilter = document.getElementById('actionTypeFilter');
    
    if (activityDateFrom) activityDateFrom.value = '';
    if (activityDateTo) activityDateTo.value = '';
    if (actionTypeFilter) actionTypeFilter.value = '';
    
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

    const reportTotalParts = document.getElementById('reportTotalParts');
    const reportTotalValue = document.getElementById('reportTotalValue');
    const reportCategories = document.getElementById('reportCategories');

    if (reportTotalParts) reportTotalParts.textContent = totalParts.toLocaleString();
    if (reportTotalValue) reportTotalValue.textContent = `₱${totalValue.toLocaleString('en-PH')}`;
    if (reportCategories) reportCategories.textContent = categories;
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
    
    const inStockCount = document.getElementById('inStockCount');
    const lowStockCount = document.getElementById('lowStockCount');
    const outStockCount = document.getElementById('outStockCount');
    const discontinuedCount = document.getElementById('discontinuedCount');

    if (inStockCount) inStockCount.textContent = stockCounts.inStock;
    if (lowStockCount) lowStockCount.textContent = stockCounts.lowStock;
    if (outStockCount) outStockCount.textContent = stockCounts.outStock;
    if (discontinuedCount) discontinuedCount.textContent = stockCounts.discontinued;
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
    
    const pendingOrdersCount = document.getElementById('pendingOrdersCount');
    const completedOrdersCount = document.getElementById('completedOrdersCount');
    const completedOrdersValueElement = document.getElementById('completedOrdersValue');
    const cancelledOrdersCount = document.getElementById('cancelledOrdersCount');

    if (pendingOrdersCount) pendingOrdersCount.textContent = orderCounts.pending;
    if (completedOrdersCount) completedOrdersCount.textContent = orderCounts.completed;
    if (completedOrdersValueElement) completedOrdersValueElement.textContent = `₱${completedOrdersValue.toLocaleString('en-PH')}`;
    if (cancelledOrdersCount) cancelledOrdersCount.textContent = orderCounts.cancelled;
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
    
    const detailsModalTitle = document.getElementById('detailsModalTitle');
    if (detailsModalTitle) detailsModalTitle.textContent = title;
    
    const container = document.getElementById('detailsTableContainer');
    if (!container) return;
    
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
    
    const detailsModal = document.getElementById('detailsModal');
    if (detailsModal) detailsModal.style.display = 'block';
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
    
    const detailsModalTitle = document.getElementById('detailsModalTitle');
    if (detailsModalTitle) detailsModalTitle.textContent = title;
    
    const container = document.getElementById('detailsTableContainer');
    if (!container) return;
    
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
    
    const detailsModal = document.getElementById('detailsModal');
    if (detailsModal) detailsModal.style.display = 'block';
}

function closeDetailsModal() {
    const detailsModal = document.getElementById('detailsModal');
    if (detailsModal) detailsModal.style.display = 'none';
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

// Enhanced Low Stock Alert Functions
function showLowStockAlert() {
    const lowStockItems = inventory.filter(part => {
        const stockLevel = getStockLevel(part);
        return stockLevel === 'Low Stock' || stockLevel === 'Out of Stock';
    });
    
    const alertContent = document.getElementById('lowStockList');
    if (!alertContent) return;
    
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
    
    const lowStockModal = document.getElementById('lowStockModal');
    if (lowStockModal) lowStockModal.style.display = 'block';
}

function closeLowStockModal() {
    const lowStockModal = document.getElementById('lowStockModal');
    if (lowStockModal) lowStockModal.style.display = 'none';
}

// Modal Functions
function showConfirmModal(title, message, onConfirm) {
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmYes');
    const confirmModal = document.getElementById('confirmModal');
    
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    
    if (confirmBtn) {
        confirmBtn.onclick = function() {
            closeConfirmModal();
            onConfirm();
        };
    }
    
    if (confirmModal) confirmModal.style.display = 'block';
}

function closeConfirmModal() {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) confirmModal.style.display = 'none';
}

// Enhanced Toast Notifications
function showToast(message, type = 'success', title = null) {
    // Ensure toast container exists
    setupToastContainer();
    
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
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
    
    // Add to container
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
        // Remove the oldest toast
        closeToast(toasts[0].querySelector('.toast-close'));
    }
}

function closeToast(closeButton) {
    if (!closeButton) return;
    
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

// Enhanced notification check after inventory changes
function triggerStockNotification() {
    // Small delay to ensure UI updates first
    setTimeout(() => {
        checkLowStockNotifications();
    }, 500);
}

// Updated logout function with proper session cleanup
function logout() {
    showConfirmModal(
        'Confirm Logout',
        'Are you sure you want to logout?',
        function() {
            // Stop any active monitoring
            stopNotificationMonitoring();
            
            // Clear all session data
            clearStoredSessions();
            localStorage.removeItem('savedUsername');
            
            showToast('Logged out successfully!', 'info');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        }
    );
}

// Production Ready Features
console.log('%c PC Inventory Management System ', 'background: #3498db; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
console.log('%c ✅ Authentication Protected ', 'background: #2ecc71; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
console.log('%c 🔔 Enhanced Notifications ', 'background: #f39c12; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
console.log('%c 📊 Advanced Analytics ', 'background: #9b59b6; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
console.log('%c 🚀 Production Ready ', 'background: #e74c3c; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');// PC Inventory Management System - Main Application
// Production ready with authentication protection, enhanced notifications, and pie chart

// Session Authentication Check - Prevents content flash
function checkAuthentication() {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    
    if (!sessionData) {
        // No session found, redirect to login
        redirectToLogin();
        return false;
    }
    
    try {
        const session = JSON.parse(sessionData);
        const loginTime = new Date(session.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        // Check if session is still valid (24 hours for localStorage, 8 hours for sessionStorage)
        const maxHours = localStorage.getItem('userSession') ? 24 : 8;
        
        if (hoursDiff >= maxHours) {
            // Session expired, clear and redirect to login
            clearStoredSessions();
            redirectToLogin('Session expired. Please login again.');
            return false;
        }
        
        // Valid session - show the main content
        showMainContent();
        
        // Show welcome message for new sessions (less than 5 minutes old)
        if (hoursDiff < (5/60)) {
            const username = session.username || 'User';
            setTimeout(() => {
                showToast(`Welcome back, ${username}!`, 'success');
            }, 1500);
        }
        
        return true;
    } catch (error) {
        // Invalid session data, clear and redirect
        console.error('Session validation error:', error);
        clearStoredSessions();
        redirectToLogin();
        return false;
    }
}

// Function to show main content and hide loading screen
function showMainContent() {
    const loadingScreen = document.getElementById('authLoading');
    const mainContainer = document.querySelector('.container');
    
    if (loadingScreen) {
        // Fade out loading screen
        loadingScreen.style.transition = 'opacity 0.3s ease';
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 300);
    }
    
    if (mainContainer) {
        // Show main content with smooth transition
        setTimeout(() => {
            mainContainer.classList.add('loaded');
        }, 200);
    }
}

// Function to redirect to login with optional message
function redirectToLogin(message = null) {
    if (message) {
        // Store message to show on login page
        sessionStorage.setItem('loginMessage', message);
    }
    window.location.href = 'login.html';
}

// Clear all stored sessions
function clearStoredSessions() {
    localStorage.removeItem('userSession');
    sessionStorage.removeItem('userSession');
}

// Global variables
let inventory = [];
let orders = [];
let activityHistory = [];
let currentEditPartId = null;
let currentEditOrderId = null;
let currentOrderStatusFilter = '';
let currentOrderCategories = [];

// Enhanced notification system variables
let hasActiveNotifications = false;
let notificationCheckInterval = null;
let manualActionsBlocked = false;

// Initialize the application - Entry point
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first - this will handle showing/hiding content
    if (!checkAuthentication()) {
        return; // Stop initialization if not authenticated
    }
    
    // Initialize app after authentication is confirmed
    setTimeout(() => {
        initializeApp();
    }, 500); // Small delay to ensure smooth transition
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
    
    const titleElement = document.getElementById('pageTitle');
    if (titleElement) {
        titleElement.textContent = titles[page] || 'Dashboard';
    }
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
            const partIdInput = document.getElementById('partId');
            if (partIdInput) {
                partIdInput.value = generatePartId();
            }
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
    const dateTimeElement = document.getElementById('dateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
    }
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
        },
        {
            id: generateId(),
            orderId: 'ORD004',
            partId: 'SSD001',
            partName: 'Samsung 980 PRO 1TB',
            date: '2024-01-12',
            quantity: 5,
            status: 'Completed'
        },
        {
            id: generateId(),
            orderId: 'ORD005',
            partId: 'COOL001',
            partName: 'Noctua NH-D15',
            date: '2024-01-11',
            quantity: 3,
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
    
    const categoryElement = document.getElementById('partCategory');
    const category = categoryElement ? categoryElement.value : '';
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

// Enhanced Low Stock Notification System with Manual Addition Prevention
function checkLowStockNotifications() {
    const lowStockItems = inventory.filter(part => {
        const stockLevel = getStockLevel(part);
        return stockLevel === 'Low Stock' || stockLevel === 'Out of Stock';
    });
    
    const previousNotificationState = hasActiveNotifications;
    hasActiveNotifications = lowStockItems.length > 0;
    
    // Update UI elements based on notification state
    updateUIForNotificationState();
    
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
        
        // Only show notification if this is a new notification state or initial load
        if (!previousNotificationState || !notificationCheckInterval) {
            showToast(`${message}. System alerts are active - click notification bell for details.`, type, 'Stock Alert');
        }
        
        // Start continuous monitoring if not already active
        startNotificationMonitoring();
    } else {
        // Clear notifications when all items are well stocked
        if (previousNotificationState) {
            showToast('All items are now well stocked! Manual controls restored.', 'success', 'Stock Status');
        }
        stopNotificationMonitoring();
    }
    
    // Update notification badge
    updateNotificationBadge(lowStockItems.length);
}

// Start continuous notification monitoring
function startNotificationMonitoring() {
    if (notificationCheckInterval) return; // Already monitoring
    
    // Check every 30 seconds for stock changes
    notificationCheckInterval = setInterval(() => {
        const lowStockItems = inventory.filter(part => {
            const stockLevel = getStockLevel(part);
            return stockLevel === 'Low Stock' || stockLevel === 'Out of Stock';
        });
        
        // Update badge and UI state
        updateNotificationBadge(lowStockItems.length);
        updateUIForNotificationState();
        
        if (lowStockItems.length === 0) {
            hasActiveNotifications = false;
            stopNotificationMonitoring();
            showToast('Stock levels normalized. Monitoring stopped.', 'success', 'System Update');
        }
    }, 30000);
    
    console.log('🔔 Started automatic stock monitoring');
}

// Stop notification monitoring
function stopNotificationMonitoring() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
        notificationCheckInterval = null;
        console.log('✅ Stopped automatic stock monitoring');
    }
}

// Update UI elements based on notification state
function updateUIForNotificationState() {
    const addPartButton = document.querySelector('button[onclick="openAddPartModal()"]');
    const addOrderButton = document.querySelector('button[onclick="openAddOrderModal()"]');
    const notificationBell = document.querySelector('.notification-icon');
    
    if (hasActiveNotifications) {
        // Style notification bell as active
        if (notificationBell) {
            notificationBell.style.color = '#e74c3c';
            notificationBell.style.animation = 'pulse 2s infinite';
        }
        
        // Show blocking overlay with message when manual actions are attempted
        manualActionsBlocked = true;
        
        // Add visual indicators to buttons (but don't actually disable them)
        if (addPartButton) {
            addPartButton.title = 'Automatic inventory alerts are active - manual additions restricted';
            addPartButton.style.position = 'relative';
            if (!addPartButton.querySelector('.alert-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'alert-indicator';
                indicator.innerHTML = '🚨';
                indicator.style.cssText = 'position: absolute; top: -5px; right: -5px; font-size: 1rem; animation: pulse 2s infinite;';
                addPartButton.appendChild(indicator);
            }
        }
        
        if (addOrderButton) {
            addOrderButton.title = 'System monitoring active - use notification panel for stock management';
            addOrderButton.style.position = 'relative';
            if (!addOrderButton.querySelector('.alert-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'alert-indicator';
                indicator.innerHTML = '🚨';
                indicator.style.cssText = 'position: absolute; top: -5px; right: -5px; font-size: 1rem; animation: pulse 2s infinite;';
                addOrderButton.appendChild(indicator);
            }
        }
    } else {
        // Reset UI to normal state
        if (notificationBell) {
            notificationBell.style.color = '';
            notificationBell.style.animation = '';
        }
        
        manualActionsBlocked = false;
        
        // Remove visual indicators
        if (addPartButton) {
            addPartButton.title = 'Add New Part';
            const indicator = addPartButton.querySelector('.alert-indicator');
            if (indicator) indicator.remove();
        }
        
        if (addOrderButton) {
            addOrderButton.title = 'Create New Order';
            const indicator = addOrderButton.querySelector('.alert-indicator');
            if (indicator) indicator.remove();
        }
    }
}

// Enhanced Category Management Functions

// Toggle the inline category form
function toggleCategoryForm() {
    const formContainer = document.getElementById('categoryFormContainer');
    const button = event.target;
    
    if (formContainer && button) {
        if (formContainer.style.display === 'none' || formContainer.style.display === '') {
            formContainer.style.display = 'block';
            button.textContent = 'HIDE FORM';
            button.style.background = '#95a5a6';
        } else {
            formContainer.style.display = 'none';
            button.textContent = 'ADD CATEGORY';
            button.style.background = '#2c3e50';
            
            // Reset form when hiding
            const inlineCategorySelect = document.getElementById('inlineCategorySelect');
            const inlineCategoryPart = document.getElementById('inlineCategoryPart');
            const inlineCategoryQuantity = document.getElementById('inlineCategoryQuantity');
            
            if (inlineCategorySelect) inlineCategorySelect.value = '';
            if (inlineCategoryPart) {
                inlineCategoryPart.innerHTML = '<option value="">Select Category First</option>';
                inlineCategoryPart.disabled = true;
            }
            if (inlineCategoryQuantity) inlineCategoryQuantity.value = '';
        }
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
    
    if (!partSelect) return;
    
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
    const categorySelect = document.getElementById('inlineCategorySelect');
    const partSelect = document.getElementById('inlineCategoryPart');
    const quantityInput = document.getElementById('inlineCategoryQuantity');
    
    if (!categorySelect || !partSelect || !quantityInput) {
        showToast('Form elements not found', 'error');
        return;
    }
    
    const category = categorySelect.value;
    const partId = partSelect.value;
    const quantity = parseInt(quantityInput.value);
    
    // Validation
    if (!category) {
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
        id: generateId(),
        partId: partId,
        partName: part.name,
        category: category,
        quantity: quantity,
        price: part.price,
        maxStock: part.quantity
    });
    
    updateCategoriesList();
    
    // Reset form
    categorySelect.value = '';
    partSelect.innerHTML = '<option value="">Select Category First</option>';
    partSelect.disabled = true;
    quantityInput.value = '';
    
    showToast('Category added successfully!', 'success');
}

// Enhanced updateCategoriesList function
function updateCategoriesList() {
    const container = document.getElementById('orderCategoriesList');
    
    if (!container) return;
    
    if (currentOrderCategories.length === 0) {
        container.innerHTML = '<div class="no-categories">No categories added yet. Click "ADD CATEGORY" to add parts.</div>';
        return;
    }
    
    container.innerHTML = '';
    currentOrderCategories.forEach((category, index) => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.style.marginBottom = '15px';
        
        categoryItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: white; border: 1px solid #e0e6ed; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 1.5rem; color: #3498db;">📦</div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0; color: #2c3e50; font-weight: 600; font-size: 1rem;">${category.partName}</h4>
                            <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 0.9rem;">
                                <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 10px; font-size: 0.8rem; margin-right: 10px;">${category.category}</span>
                                Part ID: ${category.partId} | Stock: ${category.maxStock}
                            </p>
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="font-size: 0.9rem; color: #7f8c8d; font-weight: 600;">Qty:</label>
                        <span style="background: #f8f9fa; padding: 6px 10px; border-radius: 6px; font-weight: 600; min-width: 40px; text-align: center;">${category.quantity}</span>
                    </div>
                    <button onclick="removeCategory(${index})" title="Remove" style="background: #e74c3c; color: white; border: none; border-radius: 4px; padding: 8px 12px; font-size: 1rem; cursor: pointer; transition: background 0.3s ease;">
                        🗑️
                    </button>
                </div>
            </div>
        `;
        container.appendChild(categoryItem);
    });
}

// Remove category function
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

    const totalPartsElement = document.getElementById('totalParts');
    const totalValueElement = document.getElementById('totalValue');
    const lowStockItemsElement = document.getElementById('lowStockItems');
    const pendingOrdersElement = document.getElementById('pendingOrders');

    if (totalPartsElement) totalPartsElement.textContent = totalParts.toLocaleString();
    if (totalValueElement) totalValueElement.textContent = `₱${totalValue.toLocaleString('en-PH')}`;
    if (lowStockItemsElement) lowStockItemsElement.textContent = lowStockItems;
    if (pendingOrdersElement) pendingOrdersElement.textContent = pendingOrders;
    
    // Update notification badge
    updateNotificationBadge(lowStockItems);
    
    // Update charts
    renderCategoryChart();
    renderStockChart();
    renderStockPieChart();
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

function renderCategoryChart() {
    const categoryData = {};
    inventory.forEach(part => {
        categoryData[part.category] = (categoryData[part.category] || 0) + part.quantity;
    });

    const chartContainer = document.getElementById('categoryChart');
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

// Enhanced Stock Level Distribution Pie Chart
function renderStockPieChart() {
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
    
    const pieChartContainers = ['stockChart', 'reportsStockChart'];
    
    pieChartContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Remove existing pie chart if any
        const existingPie = container.querySelector('.pie-chart-canvas');
        if (existingPie) existingPie.remove();
        
        // Create pie chart canvas
        const pieCanvas = document.createElement('div');
        pieCanvas.className = 'pie-chart-canvas';
        
        const total = inventory.length;
        const inStockPercent = (stockData['In Stock'] / total) * 100;
        const lowStockPercent = (stockData['Low Stock'] / total) * 100;
        const outStockPercent = (stockData['Out of Stock'] / total) * 100;
        const discontinuedPercent = (stockData['Discontinued'] / total) * 100;
        
        let cumulativePercent = 0;
        const inStockEnd = cumulativePercent + inStockPercent;
        cumulativePercent = inStockEnd;
        const lowStockEnd = cumulativePercent + lowStockPercent;
        cumulativePercent = lowStockEnd;
        const outStockEnd = cumulativePercent + outStockPercent;
        
        pieCanvas.style.cssText = `
            width: 160px;
            height: 160px;
            border-radius: 50%;
            position: relative;
            background: conic-gradient(
                #2ecc71 0% ${inStockEnd}%,
                #f39c12 ${inStockEnd}% ${lowStockEnd}%,
                #e74c3c ${lowStockEnd}% ${outStockEnd}%,
                #95a5a6 ${outStockEnd}% 100%
            );
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            flex-shrink: 0;
            transition: transform 0.3s ease;
        `;
        
        // Add center circle with total count
        const centerCircle = document.createElement('div');
        centerCircle.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70px;
            height: 70px;
            background: white;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
        `;
        
        centerCircle.innerHTML = `
            <div style="font-size: 1.3rem; color: #2c3e50;">${total}</div>
            <div style="font-size: 0.75rem; color: #7f8c8d;">TOTAL</div>
        `;
        
        pieCanvas.appendChild(centerCircle);
        
        // Insert pie chart at the beginning of the container, before legend
        container.insertBefore(pieCanvas, container.firstChild);
        
        // Update legend with counts
        const legendItems = container.querySelectorAll('.legend-item');
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
    });
}

// Inventory Management Functions
function displayInventoryTable() {
    const tableBody = document.getElementById('partsTableBody');
    if (!tableBody) return;
    
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const categoryFilterValue = categoryFilter ? categoryFilter.value : '';
    const statusFilterValue = statusFilter ? statusFilter.value : '';
    
    const filteredInventory = inventory.filter(part => {
        const matchesSearch = part.name.toLowerCase().includes(searchTerm) ||
                            part.brand.toLowerCase().includes(searchTerm) ||
                            part.partId.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilterValue || part.category === categoryFilterValue;
        const stockLevel = getStockLevel(part);
        const matchesStatus = !statusFilterValue || stockLevel === statusFilterValue;
        
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
        const isDiscontinued = stockLevel === 'Discontinued';

        const row = document.createElement('tr');
        
        // Apply gray styling to discontinued items
        if (isDiscontinued) {
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
    // Check if manual actions are blocked due to active notifications
    if (manualActionsBlocked) {
        showToast('Manual inventory additions are restricted while stock alerts are active. Please use the notification system to manage critical stock levels.', 'warning', 'Action Restricted');
        return;
    }
    
    currentEditPartId = null;
    const partModalTitle = document.getElementById('partModalTitle');
    const partForm = document.getElementById('partForm');
    const partModal = document.getElementById('partModal');
    
    if (partModalTitle) partModalTitle.textContent = 'Add New Part';
    if (partForm) partForm.reset();
    
    // Auto-generate Part ID
    setTimeout(() => {
        const categoryElement = document.getElementById('partCategory');
        if (categoryElement && categoryElement.value) {
            const partIdElement = document.getElementById('partId');
            if (partIdElement) partIdElement.value = generatePartId();
        }
    }, 100);
    
    if (partModal) partModal.style.display = 'block';
}

function editPart(id) {
    currentEditPartId = id;
    const part = inventory.find(p => p.id === id);
    
    if (!part) {
        showToast('Part not found', 'error');
        return;
    }
    
    const partModalTitle = document.getElementById('partModalTitle');
    if (partModalTitle) partModalTitle.textContent = 'Edit Part';
    
    // Populate form fields
    const fields = ['partId', 'partName', 'partBrand', 'partCategory', 'partPrice', 'partQuantity', 'partAlertThreshold', 'partStatus'];
    const values = [part.partId, part.name, part.brand, part.category, part.price, part.quantity, part.alertThreshold, part.status];
    
    fields.forEach((fieldId, index) => {
        const element = document.getElementById(fieldId);
        if (element) element.value = values[index];
    });
    
    const partModal = document.getElementById('partModal');
    if (partModal) partModal.style.display = 'block';
}

function closePartModal() {
    const partModal = document.getElementById('partModal');
    if (partModal) partModal.style.display = 'none';
    currentEditPartId = null;
}

function handlePartFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const partIdElement = document.getElementById('partId');
    const partNameElement = document.getElementById('partName');
    const partBrandElement = document.getElementById('partBrand');
    const partCategoryElement = document.getElementById('partCategory');
    const partPriceElement = document.getElementById('partPrice');
    const partQuantityElement = document.getElementById('partQuantity');
    const partAlertThresholdElement = document.getElementById('partAlertThreshold');
    const partStatusElement = document.getElementById('partStatus');
    
    if (!partIdElement || !partNameElement || !partBrandElement || !partCategoryElement || 
        !partPriceElement || !partQuantityElement || !partAlertThresholdElement || !partStatusElement) {
        showToast('Form elements not found', 'error');
        return;
    }
    
    const partId = partIdElement.value.trim();
    const name = partNameElement.value.trim();
    const brand = partBrandElement.value.trim();
    const category = partCategoryElement.value;
    const price = parseFloat(partPriceElement.value);
    const quantity = parseInt(partQuantityElement.value);
    const alertThreshold = parseInt(partAlertThresholdElement.value);
    const status = partStatusElement.value;
    
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
    if (!tableBody) return;
    
    const orderSearchInput = document.getElementById('orderSearchInput');
    const orderDateFilter = document.getElementById('orderDateFilter');
    
    const searchTerm = orderSearchInput ? orderSearchInput.value.toLowerCase() : '';
    const dateFilter = orderDateFilter ? orderDateFilter.value : '';
    
    let filteredOrders = orders.filter(order => {
        const matchesSearch = order.orderId.toLowerCase().includes(searchTerm) ||
                            order.partName.toLowerCase().includes(searchTerm);
        const matchesStatus = !currentOrderStatusFilter || order.status === currentOrderStatusFilter;
        const matchesDate = !dateFilter || order.date === dateFilter;
        
        return matchesSearch && matchesStatus && matchesDate;
    });
    
    // Separate orders by status
    const pendingOrders = filteredOrders.filter(order => order.status === 'Pending');
    const otherOrders = filteredOrders.filter(order => order.status !== 'Pending');
    
    // Sort each group by date (newest first)
    pendingOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    otherOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Clear existing content
    tableBody.innerHTML = '';

    // Handle empty state
    if (filteredOrders.length === 0) {
        const emptyRow = createEmptyStateRow();
        tableBody.appendChild(emptyRow);
        return;
    }

    // Add pending orders
    pendingOrders.forEach(order => {
        const row = createOrderRowFromTemplate(order);
        tableBody.appendChild(row);
    });

    // Add divider if both sections exist and not filtering
    if (pendingOrders.length > 0 && otherOrders.length > 0 && !currentOrderStatusFilter) {
        const divider = createDividerRow();
        tableBody.appendChild(divider);
    }

    // Add other orders
    otherOrders.forEach(order => {
        const row = createOrderRowFromTemplate(order);
        tableBody.appendChild(row);
    });
}

// Create order row using template
function createOrderRowFromTemplate(order) {
    const template = document.getElementById('order-row-template');
    if (!template) return null;
    
    const row = template.content.cloneNode(true);
    
    // Get the actual tr element
    const trElement = row.querySelector('.order-row');
    
    // Apply status-specific classes
    const statusClass = order.status.toLowerCase();
    const isCancelled = order.status === 'Cancelled';
    const isCompleted = order.status === 'Completed';
    const isPending = order.status === 'Pending';
    
    if (isCancelled) {
        trElement.classList.add('order-cancelled');
    } else if (isCompleted) {
        trElement.classList.add('order-completed');
    } else if (isPending) {
        trElement.classList.add('order-pending');
    }
    
    // Format date
    const formattedDate = new Date(order.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    // Populate data using template selectors
    const orderIdElement = row.querySelector('.order-id');
    const partNameElement = row.querySelector('.part-name');
    const orderDateElement = row.querySelector('.order-date');
    const quantityBadgeElement = row.querySelector('.quantity-badge');
    const statusBadgeElement = row.querySelector('.status-badge');
    
    if (orderIdElement) orderIdElement.textContent = order.orderId;
    if (partNameElement) partNameElement.textContent = order.partName;
    if (orderDateElement) orderDateElement.textContent = formattedDate;
    if (quantityBadgeElement) quantityBadgeElement.textContent = order.quantity;
    
    // Set up status badge
    if (statusBadgeElement) {
        statusBadgeElement.textContent = order.status;
        statusBadgeElement.className = `status-badge status-${statusClass}`;
    }
    
    // Set up quantity badge classes with themed colors
    if (quantityBadgeElement) {
        if (isPending) {
            quantityBadgeElement.style.background = '#fff3cd';
            quantityBadgeElement.style.color = '#856404';
        } else if (isCompleted) {
            quantityBadgeElement.style.background = '#e8f5e9';
            quantityBadgeElement.style.color = '#2e7d32';
        } else if (isCancelled) {
            quantityBadgeElement.style.background = '#ffebee';
            quantityBadgeElement.style.color = '#c62828';
        }
    }
    
    // Set up action buttons
    const editBtn = row.querySelector('.edit-btn');
    const deleteBtn = row.querySelector('.delete-btn');
    
    if (editBtn) {
        if (isCancelled) {
            editBtn.disabled = true;
            editBtn.classList.add('order-disabled');
            editBtn.title = 'Cannot edit cancelled orders';
        } else {
            editBtn.addEventListener('click', () => editOrder(order.id));
        }
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => confirmDeleteOrder(order.id));
    }
    
    return row;
}

// Create divider row using template
function createDividerRow() {
    const template = document.getElementById('orders-divider-template');
    return template ? template.content.cloneNode(true) : null;
}

// Create empty state row using template
function createEmptyStateRow() {
    const template = document.getElementById('empty-orders-template');
    return template ? template.content.cloneNode(true) : null;
}

function filterOrdersByStatus(status) {
    currentOrderStatusFilter = status;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    displayOrdersTable();
}

function openAddOrderModal() {
    // Check if manual actions are blocked due to active notifications
    if (manualActionsBlocked) {
        showToast('Order creation is managed automatically during stock alerts. Use the notification system to view and manage critical stock levels.', 'warning', 'Action Restricted');
        return;
    }
    
    currentEditOrderId = null;
    currentOrderCategories = [];
    
    const orderModalTitle = document.getElementById('orderModalTitle');
    const orderForm = document.getElementById('orderForm');
    const orderIdElement = document.getElementById('orderId');
    const orderDateElement = document.getElementById('orderDate');
    const orderStatusGroup = document.getElementById('orderStatusGroup');
    const orderModal = document.getElementById('orderModal');
    
    if (orderModalTitle) orderModalTitle.textContent = 'CREATE ORDER';
    if (orderForm) orderForm.reset();
    
    // Set default values
    if (orderIdElement) orderIdElement.value = generateOrderId();
    if (orderDateElement) orderDateElement.value = new Date().toISOString().split('T')[0];
    
    // Hide status field for new orders (always defaults to Pending)
    if (orderStatusGroup) orderStatusGroup.style.display = 'none';
    
    // Clear categories list and hide category form
    updateCategoriesList();
    const formContainer = document.getElementById('categoryFormContainer');
    if (formContainer) formContainer.style.display = 'none';
    
    // Reset ADD CATEGORY button
    const addCategoryBtn = document.querySelector('.btn-category');
    if (addCategoryBtn) {
        addCategoryBtn.textContent = 'ADD CATEGORY';
        addCategoryBtn.style.background = '#2c3e50';
    }
    
    if (orderModal) orderModal.style.display = 'block';
    
    // Initialize category system for this modal instance
    initializeOrderCategorySystem();
}

function editOrder(id) {
    const order = orders.find(o => o.id === id);
    
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    // Prevent editing cancelled orders
    if (order.status === 'Cancelled') {
        showToast('Cannot edit cancelled orders', 'warning', 'Edit Restricted');
        return;
    }
    
    currentEditOrderId = id;
    
    const orderModalTitle = document.getElementById('orderModalTitle');
    const orderIdElement = document.getElementById('orderId');
    const orderDateElement = document.getElementById('orderDate');
    const orderStatusElement = document.getElementById('orderStatus');
    const orderStatusGroup = document.getElementById('orderStatusGroup');
    const orderModal = document.getElementById('orderModal');
    
    if (orderModalTitle) orderModalTitle.textContent = 'Edit Order';
    if (orderIdElement) orderIdElement.value = order.orderId;
    if (orderDateElement) orderDateElement.value = order.date;
    if (orderStatusElement) orderStatusElement.value = order.status;
    
    // Show status field for editing existing orders
    if (orderStatusGroup) orderStatusGroup.style.display = 'block';
    
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
    
    if (orderModal) orderModal.style.display = 'block';
}

function closeOrderModal() {
    const orderModal = document.getElementById('orderModal');
    if (orderModal) orderModal.style.display = 'none';
    currentEditOrderId = null;
    currentOrderCategories = [];
}

//
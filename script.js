  // ========================================
  // CORE CRUD OPERATIONS
  // ========================================
  
  // ========================================
  // INVENTORY MANAGEMENT (PARTS)
  // ========================================
  
  // ===== READ OPERATIONS =====
  function displayInventoryTable() {
    const tableBody = document.getElementById("partsTableBody");
    if (!tableBody) return;
    
    const filteredInventory = filterInventory();
    renderInventoryTable(tableBody, filteredInventory);
  }

  function filterInventory() {
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const statusFilter = document.getElementById("statusFilter");

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const categoryFilterValue = categoryFilter ? categoryFilter.value : "";
    const statusFilterValue = statusFilter ? statusFilter.value : "";

    return inventory.filter((part) => {
      const matchesSearch =
        part.name.toLowerCase().includes(searchTerm) ||
        part.brand.toLowerCase().includes(searchTerm) ||
        part.categoryId.toLowerCase().includes(searchTerm);
      const matchesCategory =
        !categoryFilterValue || part.category === categoryFilterValue;
      const stockLevel = getStockLevel(part);
      const matchesStatus =
        !statusFilterValue || stockLevel === statusFilterValue;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  function renderInventoryTable(tableBody, filteredInventory) {
    tableBody.innerHTML = "";

    if (filteredInventory.length === 0) {
      const emptyRow = createInventoryEmptyRow();
      tableBody.appendChild(emptyRow);
      return;
    }

    filteredInventory.forEach((part) => {
      const row = createInventoryRow(part);
      tableBody.appendChild(row);
    });
  }

  function createInventoryEmptyRow() {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="9" style="text-align: center; padding: 40px;">
        <div style="color: #7f8c8d; font-size: 1.1rem;">
          ${inventory.length === 0
            ? 'No parts found. Click "Add New Part" to get started.'
            : "No parts match your search criteria."}
        </div>
      </td>
    `;
    return row;
  }

  function createInventoryRow(part) {
    const stockLevel = getStockLevel(part);
    const statusClass = stockLevel.toLowerCase().replace(/\s+/g, "-");
    const isDiscontinued = stockLevel === "Discontinued";
    const statusColor = getStatusColor(stockLevel);
    
    const row = document.createElement("tr");
    if (isDiscontinued) {
      row.style.opacity = "0.6";
      row.style.background = "#f8f9fa";
    }
    
    row.innerHTML = `
      <td><strong>${part.categoryId}</strong></td>
      <td><div style="font-weight: 600;">${part.name}</div></td>
      <td>${part.brand}</td>
      <td><span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${part.category}</span></td>
      <td style="font-weight: 600; color: #27ae60;">₱${parseInt(part.price).toLocaleString("en-PH")}</td>
      <td style="font-weight: 600; font-size: 1.1rem;">${part.quantity}</td>
      <td>${part.alertThreshold}</td>
      <td><span class="status-badge status-${statusClass}" style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.9rem;">${stockLevel}</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-warning btn-sm" onclick="editPart('${part.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeletePart('${part.categoryId}')">🗑️</button>
        </div>
      </td>
    `;
    return row;
  }

  function getStatusColor(stockLevel) {
    switch (stockLevel) {
      case "In Stock": return "#27ae60";
      case "Out of Stock": return "#e74c3c";
      default: return "#7f8c8d";
    }
  }

  // ===== CREATE OPERATIONS =====
  function openAddPartModal() {
    document.getElementById("partForm").reset();
    document.getElementById("partModalTitle").textContent = "Add New Part";
    const partCategory = document.getElementById("partCategory");
    const partIdInput = document.getElementById("partId");
    partIdInput.readOnly = true;
    partCategory.addEventListener("change", function () {
      const selectedCategory = partCategory.value;
      if (!selectedCategory) {
        partIdInput.value = "";
        return;
      }
      const prefix = selectedCategory.split(" ")[0].toUpperCase();
      let maxNum = 0;
      inventory.forEach((p) => {
        if (p.partId && p.partId.startsWith(prefix)) {
          const num = parseInt(p.partId.replace(prefix, ""));
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const newId = prefix + String(maxNum + 1).padStart(3, "0");
      partIdInput.value = newId;
    });
    partCategory.dispatchEvent(new Event("change"));
    document.getElementById("partModal").style.display = "block";
    currentEditPartId = null; // Ensure this is null for new parts
  }

  async function handlePartFormSubmit(e) {
    e.preventDefault();
    
    const formData = validatePartForm();
    if (!formData) return;

    try {
      if (currentEditPartId) {
        await updateExistingPart(formData);
      } else {
        await createNewPart(formData);
      }

      await refreshPartData();
    } catch (error) {
      console.error("Part form submission error:", error);
      showToast(`Error saving part: ${error.message}`, "error");
    }
  }

  function validatePartForm() {
    const partIdElement = document.getElementById("partId");
    const partNameElement = document.getElementById("partName");
    const partBrandElement = document.getElementById("partBrand");
    const partCategoryElement = document.getElementById("partCategory");
    const partPriceElement = document.getElementById("partPrice");
    const partQuantityElement = document.getElementById("partQuantity");
    const partAlertThresholdElement = document.getElementById("partAlertThreshold");
    const partStatusElement = document.getElementById("partStatus");
    
    if (!partIdElement || !partNameElement || !partBrandElement || !partCategoryElement || 
        !partPriceElement || !partQuantityElement || !partAlertThresholdElement || !partStatusElement) {
      showToast("Form elements not found", "error");
      return null;
    }

    const categoryId = partIdElement.value.trim();
    const name = partNameElement.value.trim();
    const brand = partBrandElement.value.trim();
    const category = partCategoryElement.value;
    const price = parseFloat(partPriceElement.value);
    const quantity = parseInt(partQuantityElement.value);
    const alertThreshold = parseInt(partAlertThresholdElement.value);
    const status = partStatusElement.value;

    if (!categoryId || !name || !brand || !category || isNaN(price) || isNaN(quantity) || isNaN(alertThreshold)) {
      showToast("Please fill in all required fields", "error");
      return null;
    }

    const partData = { categoryId, name, brand, category, price, quantity, alertThreshold };
    if (status === "Discontinued") {
      partData.status = "Discontinued";
    }

    return partData;
  }

  async function createNewPart(formData) {
    const responseData = await apiCall("/parts", {
      method: "POST",
      body: JSON.stringify(formData)
    });
    
    if (responseData && (responseData.success || responseData.id || responseData.categoryId)) {
      await logActivityAPI(
        formData.name,
        formData.categoryId,
        "Addition",
        `Added new part to inventory`,
        null
      );
      showToast("Part added successfully!", "success");
    } else {
      throw new Error("Part creation failed - invalid response");
    }
  }

  // ===== UPDATE OPERATIONS =====
  function editPart(id) {
    const part = inventory.find(
      (p) => p.id == id || p.partId === id || p.categoryId === id
    );
    if (!part) return;
    document.getElementById("partModalTitle").textContent = "Edit Part";
    document.getElementById("partId").value = part.categoryId; // Always use categoryId
    document.getElementById("partId").readOnly = true;
    document.getElementById("partName").value = part.name;
    document.getElementById("partBrand").value = part.brand;
    const partCategory = document.getElementById("partCategory");
    if (partCategory) {
      let attempts = 0;
      const setCategory = () => {
        partCategory.value = part.category;
        if (partCategory.value !== part.category && attempts < 5) {
          attempts++;
          setTimeout(setCategory, 50);
        } else {
          partCategory.dispatchEvent(new Event("change"));
        }
      };
      setCategory();
    }
    document.getElementById("partPrice").value = part.price;
    document.getElementById("partQuantity").value = part.quantity;
    document.getElementById("partAlertThreshold").value = part.alertThreshold;
    // Set stock level dropdown
    const partStatusDropdown = document.getElementById("partStatus");
    if (partStatusDropdown) {
      if (part.status === "Discontinued") {
        partStatusDropdown.value = "Discontinued";
      } else {
        partStatusDropdown.value = "Auto (Based on Quantity)"; // Match the option value exactly
      }
    }
    const partModal = document.getElementById("partModal");
    if (partModal) partModal.style.display = "block";
    currentEditPartId = part.categoryId; // Use categoryId for updates
  }

  function closePartModal() {
    const partModal = document.getElementById("partModal");
    if (partModal) partModal.style.display = "none";
    currentEditPartId = null;
  }

  async function updateExistingPart(formData) {
    const responseData = await apiCall(`/parts/${currentEditPartId}`, {
      method: "PUT",
      body: JSON.stringify(formData)
    });
    
    if (responseData && (responseData.success || responseData.id || responseData.categoryId)) {
      await logActivityAPI(
        formData.name,
        formData.categoryId,
        "Update",
        `Updated part details`,
        null
      );
      showToast("Part updated successfully!", "success");
    } else {
      throw new Error("Part update failed - invalid response");
    }
  }

  async function refreshPartData() {
    closePartModal();
    await fetchInventory();
    displayInventoryTable();
    await fetchActivity();
    displayActivityHistory();
    updateDashboard();
    triggerStockNotification();
    updateReports();
  }

  // ===== DELETE OPERATIONS =====
  async function deletePart(categoryId) {
    const part = inventory.find((p) => p.categoryId === categoryId);
    if (!part) {
      showToast("Part not found", "error");
      return;
    }
    
    try {
      await apiCall(`/parts/${categoryId}`, { method: 'DELETE' });
      await logActivityAPI(
        part.name,
        part.categoryId,
        "Deletion",
        `Removed part from inventory`,
        null
      );
      showToast("Part deleted successfully!", "success");
      await fetchInventory();
      displayInventoryTable();
      await fetchActivity();
      displayActivityHistory();
    } catch (err) {
      showToast("Error deleting part", "error");
    }
  }

  // ========================================
  // ORDER MANAGEMENT
  // ========================================
  
  // ===== READ OPERATIONS =====
  function displayOrdersTable() {
    const tableBody = document.getElementById("ordersTableBody");
    if (!tableBody) return;
    
    const filteredOrders = filterOrders();
    const { pendingOrders, otherOrders } = separateOrdersByStatus(filteredOrders);
    
    renderOrdersTable(tableBody, pendingOrders, otherOrders);
  }

  function filterOrders() {
    const orderSearchInput = document.getElementById("orderSearchInput");
    const orderDateFilter = document.getElementById("orderDateFilter");

    const searchTerm = orderSearchInput ? orderSearchInput.value.toLowerCase() : "";
    const dateFilter = orderDateFilter ? orderDateFilter.value : "";

    return orders.filter((order) => {
      const matchesSearch =
        order.orderId.toLowerCase().includes(searchTerm) ||
        order.partName.toLowerCase().includes(searchTerm);
      const matchesStatus =
        !currentOrderStatusFilter || order.status === currentOrderStatusFilter;
      const matchesDate = !dateFilter || order.date === dateFilter;
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }

  function separateOrdersByStatus(filteredOrders) {
    const pendingOrders = filteredOrders.filter(
      (order) => order.status === "Pending"
    );
    const otherOrders = filteredOrders.filter(
      (order) => order.status !== "Pending"
    );
    
    // Sort each group by date (newest first)
    pendingOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    otherOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return { pendingOrders, otherOrders };
  }

  function renderOrdersTable(tableBody, pendingOrders, otherOrders) {
    tableBody.innerHTML = "";

    // Handle empty state
    if (pendingOrders.length === 0 && otherOrders.length === 0) {
      const emptyRow = createEmptyStateRow();
      tableBody.appendChild(emptyRow);
      return;
    }

    // Add pending orders
    pendingOrders.forEach((order) => {
      const row = createOrderRowFromTemplate(order);
      tableBody.appendChild(row);
    });

    // Add divider if both sections exist and not filtering
    if (
      pendingOrders.length > 0 &&
      otherOrders.length > 0 &&
      !currentOrderStatusFilter
    ) {
      const divider = createDividerRow();
      tableBody.appendChild(divider);
    }

    // Add other orders
    otherOrders.forEach((order) => {
      const row = createOrderRowFromTemplate(order);
      tableBody.appendChild(row);
    });
  }

  function createOrderRowFromTemplate(order) {
    const row = document.createElement("tr");
    const statusClass = order.status.toLowerCase().replace(/\s+/g, "-");
    const statusColor =
      order.status === "Completed"
        ? "#27ae60"
        : order.status === "Pending"
        ? "#f39c12"
        : "#e74c3c";
    
    row.innerHTML = `
      <td><strong>${order.orderId}</strong></td>
      <td><div style="font-weight: 600;">${order.partName}</div></td>
      <td>${order.date}</td>
      <td style="font-weight: 600; font-size: 1.1rem;">${order.quantity}</td>
      <td><span class="status-badge status-${statusClass}" style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.9rem;">${order.status}</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-warning btn-sm" onclick="editOrder('${order.orderId}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteOrder('${order.orderId}')">🗑️</button>
        </div>
      </td>
    `;
    return row;
  }

  function createDividerRow() {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="6" style="background: #f8f9fa; padding: 8px; text-align: center; color: #6c757d; font-weight: 600;">
        ─── Other Orders ───
      </td>
    `;
    return row;
  }

  function createEmptyStateRow() {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="6" style="text-align: center; padding: 40px;">
        <div style="color: #7f8c8d; font-size: 1.1rem;">
          ${orders.length === 0
            ? 'No orders found. Click "Add New Order" to get started.'
            : "No orders match your search criteria."}
        </div>
      </td>
    `;
    return row;
  }

  function filterOrdersByStatus(status) {
    currentOrderStatusFilter = status;
    
    // Update active button
    document
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
    if (event && event.target) {
      event.target.classList.add("active");
    }
    
    displayOrdersTable();
  }

  // ===== CREATE OPERATIONS =====
  async function openAddOrderModal() {
    currentOrderCategories = []; // Clear cart for new order
    await populateOrderPartDropdown();
    const orderIdElement = document.getElementById("orderId");
    if (orderIdElement) orderIdElement.value = await generateNextOrderId();
    const orderDateElement = document.getElementById("orderDate");
    if (orderDateElement)
      orderDateElement.value = new Date().toISOString().split("T")[0];
    const orderStatusElement = document.getElementById("orderStatus");
    if (orderStatusElement) orderStatusElement.value = "Pending";
    const orderCategoryElement = document.getElementById("orderCategory");
    if (orderCategoryElement) orderCategoryElement.value = "";
    const orderPartElement = document.getElementById("orderPart");
    if (orderPartElement) orderPartElement.value = "";
    const orderQuantityElement = document.getElementById("orderQuantity");
    if (orderQuantityElement) orderQuantityElement.value = "";
    updateCategoriesList(); // Ensure cart UI is cleared
    document.getElementById("orderModal").style.display = "block";
  }

  async function handleOrderFormSubmit(e) {
    e.preventDefault();

    const formData = validateOrderForm();
    if (!formData) return;

    try {
      if (currentEditOrderId && currentOrderCategories.length === 1) {
        await updateExistingOrder(formData);
      } else {
        await createNewOrders(formData);
      }

      await refreshOrderData();
    } catch (error) {
      console.error("Order form submission error:", error);
      showToast(`Error saving order: ${error.message}`, "error");
    }
  }

  function validateOrderForm() {
    const orderIdElement = document.getElementById("orderId");
    const orderDateElement = document.getElementById("orderDate");
    const orderStatusElement = document.getElementById("orderStatus");

    if (!orderIdElement || !orderDateElement) {
      showToast("Required form elements not found", "error");
      return null;
    }

    const orderId = orderIdElement.value.trim();
    const date = orderDateElement.value;
    const status = currentEditOrderId && orderStatusElement
      ? orderStatusElement.value
      : "Pending";

    if (!orderId || !date) {
      showToast("Please fill in all required fields", "error");
      return null;
    }

    if (currentOrderCategories.length === 0) {
      showToast("Please add at least one category to the order", "error");
      return null;
    }

    return { orderId, date, status };
  }

  async function createNewOrders(formData) {
    let successCount = 0;
    let errors = [];

    for (let i = 0; i < currentOrderCategories.length; i++) {
      const category = currentOrderCategories[i];
      const thisOrderId = currentOrderCategories.length > 1 
        ? `${formData.orderId}-${i + 1}` 
        : formData.orderId;
      
      const orderData = {
        orderId: thisOrderId,
        categoryId: category.partId,
        partName: category.partName,
        date: formData.date,
        quantity: category.quantity,
        status: formData.status,
      };

      try {
        const responseData = await apiCall("/orders", {
          method: "POST",
          body: JSON.stringify(orderData)
        });

        if (responseData && (responseData.success || responseData.id || responseData.orderId)) {
          await logActivityAPI(
            category.partName,
            category.partId,
            "Create Order",
            `Created order ${thisOrderId} for ${category.quantity} units (Status: ${formData.status})`,
            thisOrderId
          );
          successCount++;
        } else {
          throw new Error("Order creation failed - invalid response");
        }
      } catch (orderError) {
        console.error(`Error creating order for ${category.partName}:`, orderError);
        errors.push(`${category.partName}: ${orderError.message}`);
      }
    }

    showOrderCreationResults(successCount, errors, formData.orderId);
  }

  function showOrderCreationResults(successCount, errors, orderId) {
    if (successCount > 0 && errors.length === 0) {
      showToast(`Order ${orderId} created successfully with ${successCount} items!`, "success");
    } else if (successCount > 0 && errors.length > 0) {
      showToast(`Partially successful: ${successCount} items created, ${errors.length} failed`, "warning");
      console.error("Order creation errors:", errors);
    } else {
      showToast("All order items failed to create", "error");
      console.error("All order creation errors:", errors);
      throw new Error("All orders failed");
    }
  }

  // ===== UPDATE OPERATIONS =====
  function editOrder(orderId) {
    const order = orders.find((o) => o.orderId === orderId);
    
    if (!order) {
      showToast("Order not found", "error");
      return;
    }
    
    // Pre-populate cart with the order's part and quantity
    const part = inventory.find((p) => p.categoryId === order.partId);
      
    if (part) {
      currentOrderCategories = [
        {
          id: generateId(),
          partId: part.categoryId,
          partName: part.name,
          category: part.category,
          quantity: order.quantity,
          price: part.price,
          maxStock: part.quantity + order.quantity, // allow editing up to original + current
        },
      ];
      updateCategoriesList();
    }
      
    currentEditOrderId = order.id; // Use numeric id for backend API calls
    const orderModalTitle = document.getElementById("orderModalTitle");
    const orderIdElement = document.getElementById("orderId");
    const orderDateElement = document.getElementById("orderDate");
    const orderStatusElement = document.getElementById("orderStatus");
    const orderStatusGroup = document.getElementById("orderStatusGroup");
    const orderModal = document.getElementById("orderModal");
    
    if (orderModalTitle) orderModalTitle.textContent = "Edit Order";
    if (orderIdElement) orderIdElement.value = order.orderId;
    if (orderDateElement) orderDateElement.value = order.date;
    if (orderStatusElement) orderStatusElement.value = order.status;
    // Show status field for editing existing orders
    if (orderStatusGroup) orderStatusGroup.style.display = "block";
    
    // The modal uses inline category forms, so we don't need to set dropdown values
    // The categories will be populated through the updateCategoriesList() function above
    
    // Open the modal
    if (orderModal) {
      orderModal.style.display = "block";
    } else {
      showToast("Error: Modal element not found", "error");
    }
  }

  function closeOrderModal() {
    const orderModal = document.getElementById("orderModal");
    if (orderModal) orderModal.style.display = "none";
    currentEditOrderId = null;
    currentOrderCategories = [];
  }

  async function updateExistingOrder(formData) {
    const category = currentOrderCategories[0];
    const orderData = {
      orderId: formData.orderId,
      categoryId: category.partId,
      partName: category.partName,
      date: formData.date,
      quantity: category.quantity,
      status: formData.status,
    };

    const responseData = await apiCall(`/orders/${currentEditOrderId}`, {
      method: "PUT",
      body: JSON.stringify(orderData)
    });

    if (responseData && (responseData.success || responseData.id || responseData.orderId)) {
      await logActivityAPI(
        category.partName,
        category.partId,
        "Update Order",
        `Updated order ${formData.orderId}`,
        formData.orderId
      );
      showToast("Order updated successfully!", "success");
    } else {
      throw new Error("Order update failed - invalid response");
    }
  }

  async function refreshOrderData() {
    closeOrderModal();
    await Promise.all([fetchOrders(), fetchInventory(), fetchActivity()]);
    
    updateDashboard();
    displayOrdersTable();
    displayInventoryTable();
    displayActivityHistory();
    triggerStockNotification();
    updateReports();
  }

  // ===== DELETE OPERATIONS =====
  function confirmDelete(type, id, name, deleteFunction) {
    const modal = document.getElementById("confirmModal");
    const modalTitle = document.getElementById("confirmModalTitle");
    const modalMessage = document.getElementById("confirmModalMessage");
    const confirmButton = document.getElementById("confirmModalConfirm");
    
    if (modalTitle) modalTitle.textContent = `Confirm ${type} Deletion`;
    if (modalMessage) modalMessage.textContent = `Are you sure you want to delete ${name}? This action cannot be undone.`;
    
    if (confirmButton) {
      confirmButton.onclick = () => {
        deleteFunction();
        closeModal("confirmModal");
      };
    }
    
    showModal("confirmModal");
  }

  function confirmDeleteOrder(orderId) {
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) {
      showToast("Order not found", "error");
      return;
    }
    confirmDelete("Order", orderId, order.partName, () => deleteOrder(order.id));
  }

  async function deleteOrder(id) {
    try {
      await apiCall(`/orders/${id}`, { method: 'DELETE' });
      showToast("Order deleted successfully!", "success");
      await fetchOrders();
      displayOrdersTable();
      await fetchActivity();
      displayActivityHistory();
    } catch (err) {
      showToast("Error deleting order", "error");
    }
  }

  // ========================================
  // UNIVERSAL SYSTEMS AND UTILITIES
  // ========================================
  
  // Universal Report Generator
// Order Details Modal Functions
function showOrderDetails(status) {
    let title, items;
    
  switch (status) {
    case "pending":
      title = "Pending Orders";
      items = orders.filter((order) => order.status === "Pending");
            break;
    case "completed":
      title = "Completed Orders";
      items = orders.filter((order) => order.status === "Completed");
            break;
    case "cancelled":
      title = "Cancelled Orders";
      items = orders.filter((order) => order.status === "Cancelled");
            break;
        default:
            return;
    }
    
  const detailsModalTitle = document.getElementById("detailsModalTitle");
    if (detailsModalTitle) detailsModalTitle.textContent = title;
    
  const container = document.getElementById("detailsTableContainer");
    if (!container) return;
    
  container.innerHTML = "";
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <div style="font-size: 3rem; margin-bottom: 10px;">📋</div>
                <div>No ${title.toLowerCase()} found!</div>
            </div>
        `;
    } else {
    const table = document.createElement("table");
    table.className = "details-table";
        
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
                ${items
                  .map((order) => {
                    const part = inventory.find(
                      (p) => p.categoryId === order.categoryId
                    );
                    const unitPrice = part ? part.price : 0;
                    const totalValue = unitPrice * order.quantity;
                    const formattedDate = new Date(
                      order.date
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    
                    return `
                        <tr>
                            <td><strong>${order.orderId}</strong></td>
                            <td>${order.partName}</td>
                            <td>${formattedDate}</td>
                            <td style="font-weight: 600;">${order.quantity}</td>
                            <td style="font-weight: 600; color: #27ae60;">₱${unitPrice.toLocaleString(
                              "en-PH"
                            )}</td>
                            <td style="font-weight: 600; color: #27ae60;">₱${totalValue.toLocaleString(
                              "en-PH"
                            )}</td>
                            <td><span class="status-badge status-${status}">${
                      order.status
                    }</span></td>
                        </tr>
                    `;
                  })
                  .join("")}
            </tbody>
        `;
        
        container.appendChild(table);
    }
    
  const detailsModal = document.getElementById("detailsModal");
  if (detailsModal) detailsModal.style.display = "block";
}

function closeDetailsModal() {
  const detailsModal = document.getElementById("detailsModal");
  if (detailsModal) detailsModal.style.display = "none";
}

  // ========================================
  // UNIVERSAL SYSTEMS AND UTILITIES
  // ========================================
  
  // Universal Report Generator
  class ReportGenerator {
  static generateReport(type, data = {}) {
    const reports = {
      'stock-alert': this.generateStockAlertReport,
      'inventory': this.generateInventoryReport,
      'order': this.generateOrderReport
    };
    
    return reports[type] ? reports[type](data) : null;
  }
  
  static generateStockAlertReport() {
  const lowStockItems = inventory.filter(
    (part) => getStockLevel(part) === "Low Stock"
  );
  const outOfStockItems = inventory.filter(
    (part) => getStockLevel(part) === "Out of Stock"
  );

  let report = "HARDWARE MANAGER STOCK ALERT REPORT\n";
  report += "==============================\n\n";
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    
  report += "CRITICAL ALERTS:\n";
    report += `Out of Stock Items: ${outOfStockItems.length}\n`;
    report += `Low Stock Items: ${lowStockItems.length}\n\n`;
    
    if (outOfStockItems.length > 0) {
    report += "OUT OF STOCK ITEMS:\n";
    report += "-".repeat(80) + "\n";
    report +=
      "Part ID".padEnd(12) +
      "Name".padEnd(30) +
      "Brand".padEnd(15) +
      "Category\n";
    report += "-".repeat(80) + "\n";

    outOfStockItems.forEach((part) => {
      report +=
        part.categoryId.padEnd(12) +
                     part.name.substring(0, 28).padEnd(30) + 
                     part.brand.substring(0, 13).padEnd(15) + 
        part.category +
        "\n";
        });
    report += "\n";
    }
    
    if (lowStockItems.length > 0) {
    report += "LOW STOCK ITEMS:\n";
    report += "-".repeat(90) + "\n";
    report +=
      "Part ID".padEnd(12) +
      "Name".padEnd(30) +
      "Current".padEnd(10) +
      "Threshold".padEnd(12) +
      "Category\n";
    report += "-".repeat(90) + "\n";

    lowStockItems.forEach((part) => {
      report +=
        part.categoryId.padEnd(12) +
                     part.name.substring(0, 28).padEnd(30) + 
                     part.quantity.toString().padEnd(10) + 
                     part.alertThreshold.toString().padEnd(12) + 
        part.category +
        "\n";
        });
    }
    
  downloadReport(report, "stock-alert-report.txt");
}

  static generateInventoryReport() {
  let report = "HARDWARE MANAGER INVENTORY REPORT\n";
  report += "========================\n\n";
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    
  report += "SUMMARY:\n";
  report += `Total Parts: ${inventory.reduce(
    (sum, part) => sum + parseInt(part.partQuantity || part.quantity || 0),
    0
  )}\n`;
  report += `Total Value: ₱${inventory
    .reduce(
      (sum, part) =>
        sum +
        parseInt(part.partPrice || part.price || 0) *
          parseInt(part.partQuantity || part.quantity || 0),
      0
    )
    .toLocaleString("en-PH")}\n`;
  report += `Low Stock Items: ${
    inventory.filter((part) => getStockLevel(part) === "Low Stock").length
  }\n`;
  report += `Out of Stock Items: ${
    inventory.filter((part) => getStockLevel(part) === "Out of Stock").length
  }\n\n`;

  report += "DETAILED INVENTORY:\n";
  report += "-".repeat(100) + "\n";
  report +=
    "Part ID".padEnd(10) +
    "Name".padEnd(30) +
    "Brand".padEnd(15) +
    "Category".padEnd(20) +
    "Quantity".padEnd(10) +
    "Status\n";
  report += "-".repeat(100) + "\n";

  inventory.forEach((part) => {
    report +=
      (part.partId || part.categoryId || "").padEnd(10) +
      (part.partName || part.name || "").substring(0, 28).padEnd(30) +
      (part.partBrand || part.brand || "").substring(0, 13).padEnd(15) +
      (part.partCategory || part.category || "").substring(0, 18).padEnd(20) +
                 (part.partQuantity || part.quantity || 0).toString().padEnd(10) + 
      getStockLevel(part) +
      "\n";
    });
    
  downloadReport(report, "inventory-report.txt");
}

  static generateOrderReport() {
  let report = "HARDWARE MANAGER ORDER REPORT\n";
  report += "====================\n\n";
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    
  report += "SUMMARY:\n";
    report += `Total Orders: ${orders.length}\n`;
  report += `Pending Orders: ${
    orders.filter((order) => order.status === "Pending").length
  }\n`;
  report += `Completed Orders: ${
    orders.filter((order) => order.status === "Completed").length
  }\n`;
  report += `Cancelled Orders: ${
    orders.filter((order) => order.status === "Cancelled").length
  }\n\n`;

  report += "DETAILED ORDERS:\n";
  report += "-".repeat(100) + "\n";
  report +=
    "Order ID".padEnd(12) +
    "Part Name".padEnd(30) +
    "Date".padEnd(12) +
    "Quantity".padEnd(10) +
    "Status\n";
  report += "-".repeat(100) + "\n";

  orders.forEach((order) => {
    report +=
      order.orderId.padEnd(12) +
                 order.partName.substring(0, 28).padEnd(30) + 
                 order.date.padEnd(12) + 
                 order.quantity.toString().padEnd(10) + 
      order.status +
      "\n";
    });
    
  downloadReport(report, "order-report.txt");
  }
}

// Legacy functions for backward compatibility
function generateStockAlertReport() {
  ReportGenerator.generateReport('stock-alert');
}

function generateInventoryReport() {
  ReportGenerator.generateReport('inventory');
}

function generateOrderReport() {
  ReportGenerator.generateReport('order');
}

  async function downloadReport(content, filename) {
    try {
      // Convert filename from .txt to .pdf
      const pdfFilename = filename.replace('.txt', '.pdf');
      
      // Call backend to generate PDF
      const response = await apiCall('/reports/generate-pdf', {
        method: 'POST',
        body: JSON.stringify({
          content: content,
          filename: pdfFilename,
          reportType: filename.includes('stock-alert') ? 'stock-alert' : 
                     filename.includes('inventory') ? 'inventory' : 'order'
        })
      });
      
      if (response && response.pdf_data) {
        // Convert base64 to blob
        const byteCharacters = atob(response.pdf_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Download the PDF
    const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
    a.href = url;
        a.download = pdfFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
        showToast("PDF report downloaded successfully!", "success");
      } else {
        throw new Error("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Error generating PDF report", "error");
    }
}

// Enhanced Low Stock Alert Functions
function showLowStockAlert() {
  const lowStockItems = inventory.filter((part) => {
        const stockLevel = getStockLevel(part);
    return stockLevel === "Low Stock" || stockLevel === "Out of Stock";
    });
    
  const alertContent = document.getElementById("lowStockList");
    if (!alertContent) return;
    
  alertContent.innerHTML = "";
    
    if (lowStockItems.length === 0) {
        alertContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #27ae60;">
                <div style="font-size: 3rem; margin-bottom: 10px;">✅</div>
                <div style="font-size: 1.2rem; font-weight: 600;">All items are well stocked!</div>
                <div style="color: #7f8c8d; margin-top: 5px;">No items require immediate attention.</div>
            </div>
        `;
    } else {
    lowStockItems.forEach((part) => {
            const stockLevel = getStockLevel(part);
      const urgencyClass = stockLevel === "Out of Stock" ? "error" : "warning";
            
      const alertItem = document.createElement("div");
      alertItem.className = "alert-item";
            alertItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${part.name}</strong> (${part.categoryId})<br>
                        <small>Current: ${part.quantity} | Threshold: ${
        part.alertThreshold
      }</small>
                    </div>
                    <span style="color: ${
                      urgencyClass === "error" ? "#e74c3c" : "#f39c12"
                    }; font-weight: bold;">
                        ${stockLevel}
                    </span>
                </div>
            `;
            alertContent.appendChild(alertItem);
        });
    }
    
  const lowStockModal = document.getElementById("lowStockModal");
  if (lowStockModal) lowStockModal.style.display = "block";
}

function closeLowStockModal() {
  const lowStockModal = document.getElementById("lowStockModal");
  if (lowStockModal) lowStockModal.style.display = "none";
}

  // Enhanced Modal Manager
class ModalManager {
  static modals = new Map();
  
  static register(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return false;
    
    this.modals.set(modalId, {
      element: modal,
      titleElement: document.getElementById(modalId + "Title"),
      messageElement: document.getElementById(modalId + "Message"),
      ...options
    });
    
    return true;
  }
  
  static show(modalId, title = null, message = null, data = {}) {
    const modalInfo = this.modals.get(modalId);
    if (!modalInfo) return false;
    
    const { element, titleElement, messageElement, onShow } = modalInfo;
    
    if (title && titleElement) {
      titleElement.textContent = title;
    }
    
    if (message && messageElement) {
      messageElement.textContent = message;
    }
    
    element.style.display = "block";
    
    if (onShow) onShow(data);
    return true;
  }
  
  static close(modalId) {
    const modalInfo = this.modals.get(modalId);
    if (!modalInfo) return false;
    
    const { element, onClose } = modalInfo;
    element.style.display = "none";
    
    if (onClose) onClose();
    return true;
  }
  
  static closeAll() {
    this.modals.forEach((modalInfo, modalId) => {
      this.close(modalId);
    });
  }
  
  static isOpen(modalId) {
    const modalInfo = this.modals.get(modalId);
    return modalInfo ? modalInfo.element.style.display === "block" : false;
  }
}

// Universal Modal Functions (legacy compatibility)
function showModal(modalId, title = null, message = null) {
  return ModalManager.show(modalId, title, message);
}

function closeModal(modalId) {
  return ModalManager.close(modalId);
}

  // Specific modal functions using the universal ones
  function showConfirmModal(title, message, onConfirm) {
    if (showModal("confirmModal", title, message)) {
      const confirmBtn = document.getElementById("confirmYes");
    if (confirmBtn) {
    confirmBtn.onclick = function () {
            closeConfirmModal();
            onConfirm();
        };
    }
    }
}

function closeConfirmModal() {
    closeModal("confirmModal");
  }

  function closeDetailsModal() {
    closeModal("detailsModal");
  }

  function closeLowStockModal() {
    closeModal("lowStockModal");
  }

  function closePartModal() {
    closeModal("partModal");
    currentEditPartId = null;
  }

  function closeOrderModal() {
    closeModal("orderModal");
    currentEditOrderId = null;
    currentOrderCategories = [];
}

// Stock Details Modal Functions
function showStockDetails(type) {
    // Map type to stock level
    const statusMap = {
    out: "Out of Stock",
    low: "Low Stock",
    in: "In Stock",
    discontinued: "Discontinued",
    };
    const status = statusMap[type] || type;
  const modal = document.getElementById("detailsModal");
  const modalTitle = document.getElementById("detailsModalTitle");
  const modalBody = document.getElementById("detailsTableContainer");
    if (!modal || !modalTitle || !modalBody) return;
    modalTitle.textContent = `${status} Parts`;
    // Filter inventory for parts with the selected stock level
  const parts = Array.isArray(inventory)
    ? inventory.filter((part) => getStockLevel(part) === status)
    : [];
    if (parts.length === 0) {
        modalBody.innerHTML = `<div style="text-align:center;padding:40px;"><div style="color:#27ae60;font-size:2.5rem;">✔️</div><div style="margin-top:10px;color:#7f8c8d;">No ${status.toLowerCase()} parts found!</div></div>`;
    } else {
        let html = `<div style="max-height: 400px; overflow-y: auto; padding: 10px;">`;
        
        parts.forEach((part) => {
            const partName = part.name || part.partName || part.partId || "";
            const partId = part.categoryId || part.partId || "";
            const currentStock = part.quantity || 0;
            const threshold = part.alertThreshold || 5;
            const stockLevel = getStockLevel(part);
            
            // Determine colors based on stock level
            let borderColor, bgColor, statusColor, statusText;
            if (stockLevel === "Out of Stock") {
                borderColor = "#e74c3c";
                bgColor = "#fdf2f2";
                statusColor = "#e74c3c";
                statusText = "Out of Stock";
            } else if (stockLevel === "Low Stock") {
                borderColor = "#f39c12";
                bgColor = "#fef9e7";
                statusColor = "#f39c12";
                statusText = "Low Stock";
            } else if (stockLevel === "In Stock") {
                borderColor = "#27ae60";
                bgColor = "#f0f9f0";
                statusColor = "#27ae60";
                statusText = "In Stock";
            } else {
                borderColor = "#95a5a6";
                bgColor = "#f8f9fa";
                statusColor = "#95a5a6";
                statusText = "Discontinued";
            }
            
            html += `
                <div style="
                    background: ${bgColor};
                    border-left: 4px solid ${borderColor};
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #2c3e50; margin-bottom: 5px;">
                            ${partName} (${partId})
                        </div>
                        <div style="color: #7f8c8d; font-size: 0.9rem;">
                            Current: ${currentStock} | Threshold: ${threshold}
                        </div>
                    </div>
                    <div style="
                        font-weight: bold;
                        color: ${statusColor};
                        font-size: 0.9rem;
                        text-align: right;
                    ">
                        ${statusText}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        modalBody.innerHTML = html;
    }
  modal.style.display = "block";
}

// Enhanced Toast Notifications
function showToast(message, type = "success", title = null) {
    // Ensure toast container exists
    setupToastContainer();
    
  const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) return;
    
  const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    // Define icons and titles for each type
    const toastConfig = {
        success: {
      icon: "✓",
      defaultTitle: "Success Alert",
        },
        error: {
      icon: "!",
      defaultTitle: "Error Alert",
        },
        warning: {
      icon: "!",
      defaultTitle: "Warning Alert",
        },
        info: {
      icon: "i",
      defaultTitle: "Info Alert",
    },
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
    toast.classList.add("show");
    }, 100);
    
    // Auto-hide toast after 4 seconds
    setTimeout(() => {
    closeToast(toast.querySelector(".toast-close"));
    }, 4000);
    
    // Limit to 5 toasts maximum
  const toasts = toastContainer.querySelectorAll(".toast");
    if (toasts.length > 5) {
        // Remove the oldest toast
    closeToast(toasts[0].querySelector(".toast-close"));
    }
}

function closeToast(closeButton) {
    if (!closeButton) return;
    
  const toast = closeButton.closest(".toast");
    if (toast) {
    toast.classList.remove("show");
        setTimeout(() => {
      const toastContainer = document.getElementById("toastContainer");
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
    "Confirm Logout",
    "Are you sure you want to logout?",
    function () {
            // Stop any active monitoring
            stopNotificationMonitoring();
            
            // Clear all session data
            clearStoredSessions();
      localStorage.removeItem("savedUsername");
            
      showToast("Logged out successfully!", "info");
            
            // Redirect to login page
            setTimeout(() => {
        window.location.href = "login.html";
            }, 1500);
        }
    );
}

  // Production Ready Features // Hardware Manager - Main Application
// Production ready with authentication protection and enhanced notifications

// Session Authentication Check - Prevents content flash
function checkAuthentication() {
  const sessionData =
    localStorage.getItem("userSession") ||
    sessionStorage.getItem("userSession");
    
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
    const maxHours = localStorage.getItem("userSession") ? 24 : 8;
        
        if (hoursDiff >= maxHours) {
            // Session expired, clear and redirect to login
            clearStoredSessions();
      redirectToLogin("Session expired. Please login again.");
            return false;
        }
        
        // Valid session - show the main content
        showMainContent();
        
        // Show welcome message for new sessions (less than 5 minutes old)
    if (hoursDiff < 5 / 60) {
      const username = session.username || "User";
            setTimeout(() => {
        showToast(`Welcome back, ${username}!`, "success");
            }, 1500);
        }
        
        return true;
    } catch (error) {
        // Invalid session data, clear and redirect
    console.error("Session validation error:", error);
        clearStoredSessions();
        redirectToLogin();
        return false;
    }
}

// Function to show main content and hide loading screen
function showMainContent() {
  const loadingScreen = document.getElementById("authLoading");
  const mainContainer = document.querySelector(".container");
    
    if (loadingScreen) {
        // Fade out loading screen
    loadingScreen.style.transition = "opacity 0.3s ease";
    loadingScreen.style.opacity = "0";
        setTimeout(() => {
      loadingScreen.style.display = "none";
        }, 300);
    }
    
    if (mainContainer) {
        // Show main content with smooth transition
        setTimeout(() => {
      mainContainer.classList.add("loaded");
        }, 200);
    }
}

// Function to redirect to login with optional message
function redirectToLogin(message = null) {
    if (message) {
        // Store message to show on login page
    sessionStorage.setItem("loginMessage", message);
    }
  window.location.href = "login.html";
}

// Clear all stored sessions
function clearStoredSessions() {
  localStorage.removeItem("userSession");
  sessionStorage.removeItem("userSession");
}

// Global variables
let inventory = [];
let orders = [];
let activityHistory = [];
let currentEditPartId = null;
let currentEditOrderId = null;
let currentOrderStatusFilter = "";
let currentOrderCategories = [];

// Enhanced notification system variables
let hasActiveNotifications = false;
let notificationCheckInterval = null;

// Initialize the application - Entry point
document.addEventListener("DOMContentLoaded", function () {
    // Check authentication first - this will handle showing/hiding content
    if (!checkAuthentication()) {
        return; // Stop initialization if not authenticated
    }
    
    // Initialize app after authentication is confirmed
    setTimeout(() => {
        initializeApp();
    }, 500); // Small delay to ensure smooth transition

  const statTotalParts = document.getElementById("statTotalParts");
  const statPendingOrders = document.getElementById("statPendingOrders");
  if (statTotalParts) {
    statTotalParts.addEventListener("click", function () {
      document.querySelector('.nav-item[data-page="inventory"]').click();
    });
  }
  if (statPendingOrders) {
    statPendingOrders.addEventListener("click", function () {
      document.querySelector('.nav-item[data-page="orders"]').click();
    });
  }
});

  // Universal API Call Function
async function apiCall(endpoint, options = {}) {
    const token = getToken();
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(`http://localhost:4567${endpoint}`, {
      ...defaultOptions,
      ...options
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Check if response has content
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // For non-JSON responses (like DELETE operations), return success status
      return { success: true, status: response.status };
    }
    
    // Try to parse JSON, but handle empty responses
    const text = await response.text();
    if (!text || text.trim() === '') {
      return { success: true, status: response.status };
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

  async function fetchInventory() {
    try {
      inventory = await apiCall('/parts');
    } catch (error) {
      inventory = [];
      showToast('Failed to fetch inventory', 'error');
    }
}

  function renderDashboardWeeklyOrderChart() {
    const chartContainer = document.getElementById("dashboardWeeklyOrderChart");
    if (!chartContainer) {
      console.warn("Dashboard weekly order chart container not found");
      return;
    }
}

function updateDashboardWeeklyOrderChart() {
    renderDashboardWeeklyOrderChart();
    setupDashboardWeeklyOrderChartListeners();
}

async function fetchOrders() {
    try {
      const rawOrders = await apiCall('/orders');
    // Map backend fields to frontend expected fields
  orders = rawOrders.map((order) => ({
        id: order.id, // Include the id field for editing
        orderId: order.orderId || order.order_id || order.id,
        partId: order.partId || order.part_id || order.categoryId,
        partName: order.partName || order.part_name,
        date: order.date,
        quantity: order.quantity,
        status: order.status,
    created_at: order.created_at,
    }));
    updateOrderReports();
    updateDashboardWeeklyOrderChart();
    } catch (error) {
      orders = [];
      showToast('Failed to fetch orders', 'error');
    }
}

async function fetchActivity() {
    try {
      activityHistory = await apiCall('/activity');
    } catch (error) {
      activityHistory = [];
      showToast('Failed to fetch activity', 'error');
    }
}

function getToken() {
  const session = JSON.parse(
    localStorage.getItem("userSession") ||
      sessionStorage.getItem("userSession") ||
      "{}"
  );
  return session.token || "";
}

async function initializeApp() {
    // Initialize universal systems
    initializeUniversalSystems();
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupNavigation();
    setupEventListeners();
    setupToastContainer();
    setupCategoryFormListener();
    initializeOrderCategorySystem();
    await fetchInventory();
    await fetchOrders();
    await fetchActivity();
    updateDashboard();
    setTimeout(() => {
        checkLowStockNotifications();
    }, 2000);
}

function initializeUniversalSystems() {
    // Register all modals with the ModalManager
    ModalManager.register("partModal");
    ModalManager.register("orderModal");
    ModalManager.register("categoryModal");
    ModalManager.register("lowStockModal");
    ModalManager.register("confirmModal");
    ModalManager.register("detailsModal");
    
    // Initialize chart filters with current date
    initializeChartFilters();
    
    // Universal systems initialized
}

function initializeChartFilters() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Initialize reports page filters
    const monthFilter = document.getElementById("monthFilter");
    const yearFilter = document.getElementById("yearFilter");
    
    if (monthFilter && monthFilter.value === "") {
        monthFilter.value = currentMonth;
    }
    if (yearFilter && yearFilter.value === "") {
        yearFilter.value = currentYear;
    }
    
    // Initialize dashboard filters
    const dashboardMonthFilter = document.getElementById("dashboardMonthFilter");
    const dashboardYearFilter = document.getElementById("dashboardYearFilter");
    
    if (dashboardMonthFilter && dashboardMonthFilter.value === "") {
        dashboardMonthFilter.value = currentMonth;
    }
    if (dashboardYearFilter && dashboardYearFilter.value === "") {
        dashboardYearFilter.value = currentYear;
    }
}

function setupCategoryFormListener() {
  const categoryForm = document.getElementById("categoryForm");
    if (categoryForm) {
    categoryForm.addEventListener("submit", function (e) {
            e.preventDefault();
            
      const categorySelect = document.getElementById("categorySelect").value;
      const partId = document.getElementById("categoryPart").value;
      const quantity = parseInt(
        document.getElementById("categoryQuantity").value
      );
            
            // Validation
            if (!categorySelect) {
        showToast("Please select a category first", "error");
                return;
            }
            
            if (!partId) {
        showToast("Please select a part", "error");
                return;
            }
            
            if (isNaN(quantity) || quantity <= 0) {
        showToast("Please enter a valid quantity", "error");
                return;
            }
            
            // Find the part
      const part = inventory.find((p) => p.partId === partId);
            if (!part) {
        showToast("Selected part not found", "error");
                return;
            }
            
            // Check if order quantity exceeds available inventory
            if (quantity > part.quantity) {
        showToast(
          `Cannot add: Requested quantity (${quantity}) exceeds available stock (${part.quantity})`,
          "error"
        );
                return;
            }
            
            // Check if part is already added
      const existingCategory = currentOrderCategories.find(
        (cat) => cat.partId === partId
      );
            if (existingCategory) {
        showToast("This part is already added to the order", "error");
                return;
            }
            
            // Add category
            currentOrderCategories.push({
                partId: partId,
                partName: part.name,
                category: categorySelect,
                quantity: quantity,
        price: part.price,
            });
            
            updateCategoriesList();
            closeCategoryModal();
      showToast("Category added successfully!", "success");
        });
    }
}

// Setup toast container
function setupToastContainer() {
  if (!document.getElementById("toastContainer")) {
    const container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
        document.body.appendChild(container);
    }
}

// Navigation System
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item:not(.logout)");
    
  navItems.forEach((item) => {
    item.addEventListener("click", function (e) {
            e.preventDefault();
            
            // Remove active class from all nav items
      navItems.forEach((nav) => nav.classList.remove("active"));
            
            // Add active class to clicked item
      this.classList.add("active");
            
            // Get page to show
            const pageToShow = this.dataset.page;
            
            // Hide all pages
      const pages = document.querySelectorAll(".page");
      pages.forEach((page) => page.classList.remove("active"));
            
            // Show selected page
      const targetPage = document.getElementById(pageToShow + "-page");
            if (targetPage) {
        targetPage.classList.add("active");
            }
            
            // Update page title
            updatePageTitle(pageToShow);
            
            // Refresh data if needed
            refreshPageData(pageToShow);
        });
    });
}

  // ========================================
  // INVENTORY MANAGEMENT (PARTS)
  // ========================================
  
  // ===== READ OPERATIONS =====
function displayInventoryTable() {
  const tableBody = document.getElementById("partsTableBody");
    if (!tableBody) return;
    
  const filteredInventory = filterInventory();
  renderInventoryTable(tableBody, filteredInventory);
}

function filterInventory() {
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const statusFilter = document.getElementById("statusFilter");

  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const categoryFilterValue = categoryFilter ? categoryFilter.value : "";
  const statusFilterValue = statusFilter ? statusFilter.value : "";

  return inventory.filter((part) => {
    const matchesSearch =
      part.name.toLowerCase().includes(searchTerm) ||
                            part.brand.toLowerCase().includes(searchTerm) ||
                            part.categoryId.toLowerCase().includes(searchTerm);
    const matchesCategory =
      !categoryFilterValue || part.category === categoryFilterValue;
        const stockLevel = getStockLevel(part);
    const matchesStatus =
      !statusFilterValue || stockLevel === statusFilterValue;
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
}

function renderInventoryTable(tableBody, filteredInventory) {
  tableBody.innerHTML = "";

    if (filteredInventory.length === 0) {
    const emptyRow = createInventoryEmptyRow();
    tableBody.appendChild(emptyRow);
    return;
  }

  filteredInventory.forEach((part) => {
    const row = createInventoryRow(part);
    tableBody.appendChild(row);
  });
}

function createInventoryEmptyRow() {
    const row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="9" style="text-align: center; padding: 40px;">
                <div style="color: #7f8c8d; font-size: 1.1rem;">
        ${inventory.length === 0
                        ? 'No parts found. Click "Add New Part" to get started.'
          : "No parts match your search criteria."}
                </div>
            </td>
        `;
  return row;
    }

function createInventoryRow(part) {
        const stockLevel = getStockLevel(part);
    const statusClass = stockLevel.toLowerCase().replace(/\s+/g, "-");
    const isDiscontinued = stockLevel === "Discontinued";
  const statusColor = getStatusColor(stockLevel);
  
    const row = document.createElement("tr");
        if (isDiscontinued) {
      row.style.opacity = "0.6";
      row.style.background = "#f8f9fa";
        }
  
        row.innerHTML = `
            <td><strong>${part.categoryId}</strong></td>
            <td><div style="font-weight: 600;">${part.name}</div></td>
            <td>${part.brand}</td>
    <td><span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${part.category}</span></td>
    <td style="font-weight: 600; color: #27ae60;">₱${parseInt(part.price).toLocaleString("en-PH")}</td>
    <td style="font-weight: 600; font-size: 1.1rem;">${part.quantity}</td>
            <td>${part.alertThreshold}</td>
            <td><span class="status-badge status-${statusClass}" style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.9rem;">${stockLevel}</span></td>
            <td>
                <div class="actions">
        <button class="btn btn-warning btn-sm" onclick="editPart('${part.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeletePart('${part.categoryId}')">🗑️</button>
                </div>
            </td>
        `;
  return row;
}

function getStatusColor(stockLevel) {
  switch (stockLevel) {
    case "In Stock": return "#27ae60";
    case "Out of Stock": return "#e74c3c";
    default: return "#7f8c8d";
  }
}

  // ===== CREATE OPERATIONS =====
function openAddPartModal() {
  document.getElementById("partForm").reset();
  document.getElementById("partModalTitle").textContent = "Add New Part";
  const partCategory = document.getElementById("partCategory");
  const partIdInput = document.getElementById("partId");
    partIdInput.readOnly = true;
  partCategory.addEventListener("change", function () {
        const selectedCategory = partCategory.value;
        if (!selectedCategory) {
      partIdInput.value = "";
            return;
        }
    const prefix = selectedCategory.split(" ")[0].toUpperCase();
        let maxNum = 0;
    inventory.forEach((p) => {
            if (p.partId && p.partId.startsWith(prefix)) {
        const num = parseInt(p.partId.replace(prefix, ""));
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
    const newId = prefix + String(maxNum + 1).padStart(3, "0");
        partIdInput.value = newId;
    });
  partCategory.dispatchEvent(new Event("change"));
  document.getElementById("partModal").style.display = "block";
  currentEditPartId = null; // Ensure this is null for new parts
}

  // ===== UPDATE OPERATIONS =====
function editPart(id) {
  const part = inventory.find(
    (p) => p.id == id || p.partId === id || p.categoryId === id
  );
    if (!part) return;
  document.getElementById("partModalTitle").textContent = "Edit Part";
  document.getElementById("partId").value = part.categoryId; // Always use categoryId
  document.getElementById("partId").readOnly = true;
  document.getElementById("partName").value = part.name;
  document.getElementById("partBrand").value = part.brand;
  const partCategory = document.getElementById("partCategory");
    if (partCategory) {
    let attempts = 0;
    const setCategory = () => {
            partCategory.value = part.category;
      if (partCategory.value !== part.category && attempts < 5) {
        attempts++;
        setTimeout(setCategory, 50);
      } else {
        partCategory.dispatchEvent(new Event("change"));
      }
    };
    setCategory();
  }
  document.getElementById("partPrice").value = part.price;
  document.getElementById("partQuantity").value = part.quantity;
  document.getElementById("partAlertThreshold").value = part.alertThreshold;
  // Set stock level dropdown
  const partStatusDropdown = document.getElementById("partStatus");
  if (partStatusDropdown) {
    if (part.status === "Discontinued") {
      partStatusDropdown.value = "Discontinued";
    } else {
      partStatusDropdown.value = "Auto (Based on Quantity)"; // Match the option value exactly
    }
  }
  const partModal = document.getElementById("partModal");
  if (partModal) partModal.style.display = "block";
  currentEditPartId = part.categoryId; // Use categoryId for updates
}

function closePartModal() {
  const partModal = document.getElementById("partModal");
  if (partModal) partModal.style.display = "none";
    currentEditPartId = null;
}

async function handlePartFormSubmit(e) {
    e.preventDefault();
    
    const formData = validatePartForm();
    if (!formData) return;

    try {
      if (currentEditPartId) {
        await updateExistingPart(formData);
      } else {
        await createNewPart(formData);
      }

      await refreshPartData();
    } catch (error) {
      console.error("Part form submission error:", error);
      showToast(`Error saving part: ${error.message}`, "error");
    }
  }

  function validatePartForm() {
  const partIdElement = document.getElementById("partId");
  const partNameElement = document.getElementById("partName");
  const partBrandElement = document.getElementById("partBrand");
  const partCategoryElement = document.getElementById("partCategory");
  const partPriceElement = document.getElementById("partPrice");
  const partQuantityElement = document.getElementById("partQuantity");
    const partAlertThresholdElement = document.getElementById("partAlertThreshold");
  const partStatusElement = document.getElementById("partStatus");
    
    if (!partIdElement || !partNameElement || !partBrandElement || !partCategoryElement || 
        !partPriceElement || !partQuantityElement || !partAlertThresholdElement || !partStatusElement) {
    showToast("Form elements not found", "error");
      return null;
    }

    const categoryId = partIdElement.value.trim();
    const name = partNameElement.value.trim();
    const brand = partBrandElement.value.trim();
    const category = partCategoryElement.value;
    const price = parseFloat(partPriceElement.value);
    const quantity = parseInt(partQuantityElement.value);
    const alertThreshold = parseInt(partAlertThresholdElement.value);
    const status = partStatusElement.value;

    if (!categoryId || !name || !brand || !category || isNaN(price) || isNaN(quantity) || isNaN(alertThreshold)) {
    showToast("Please fill in all required fields", "error");
      return null;
    }

    const partData = { categoryId, name, brand, category, price, quantity, alertThreshold };
  if (status === "Discontinued") {
    partData.status = "Discontinued";
  }

    return partData;
  }

  async function updateExistingPart(formData) {
    const responseData = await apiCall(`/parts/${currentEditPartId}`, {
        method: "PUT",
      body: JSON.stringify(formData)
    });
    
    if (responseData && (responseData.success || responseData.id || responseData.categoryId)) {
      await logActivityAPI(
        formData.name,
        formData.categoryId,
        "Update",
        `Updated part details`,
        null
      );
      showToast("Part updated successfully!", "success");
        } else {
      throw new Error("Part update failed - invalid response");
    }
  }

  async function createNewPart(formData) {
    const responseData = await apiCall("/parts", {
        method: "POST",
      body: JSON.stringify(formData)
    });
    
    if (responseData && (responseData.success || responseData.id || responseData.categoryId)) {
      await logActivityAPI(
        formData.name,
        formData.categoryId,
        "Addition",
        `Added new part to inventory`,
        null
      );
      showToast("Part added successfully!", "success");
    } else {
      throw new Error("Part creation failed - invalid response");
        }
  }

  async function refreshPartData() {
        closePartModal();
        await fetchInventory();
        displayInventoryTable();
    await fetchActivity();
    displayActivityHistory();
    updateDashboard();
    triggerStockNotification();
    updateReports();
  }

  // ===== DELETE OPERATIONS =====
async function deletePart(categoryId) {
  const part = inventory.find((p) => p.categoryId === categoryId);
    if (!part) {
    showToast("Part not found", "error");
        return;
    }
  
    try {
    await apiCall(`/parts/${categoryId}`, { method: 'DELETE' });
    await logActivityAPI(
      part.name,
      part.categoryId,
      "Deletion",
      `Removed part from inventory`,
      null
    );
    showToast("Part deleted successfully!", "success");
        await fetchInventory();
        displayInventoryTable();
    await fetchActivity();
    displayActivityHistory();
    } catch (err) {
    showToast("Error deleting part", "error");
    }
}

  // ========================================
  // ORDER MANAGEMENT
  // ========================================
  
  // ===== READ OPERATIONS =====
function displayOrdersTable() {
  const tableBody = document.getElementById("ordersTableBody");
    if (!tableBody) return;
    
  const filteredOrders = filterOrders();
  const { pendingOrders, otherOrders } = separateOrdersByStatus(filteredOrders);
  
  renderOrdersTable(tableBody, pendingOrders, otherOrders);
}

function filterOrders() {
  const orderSearchInput = document.getElementById("orderSearchInput");
  const orderDateFilter = document.getElementById("orderDateFilter");

  const searchTerm = orderSearchInput ? orderSearchInput.value.toLowerCase() : "";
  const dateFilter = orderDateFilter ? orderDateFilter.value : "";

  return orders.filter((order) => {
    const matchesSearch =
      order.orderId.toLowerCase().includes(searchTerm) ||
                            order.partName.toLowerCase().includes(searchTerm);
    const matchesStatus =
      !currentOrderStatusFilter || order.status === currentOrderStatusFilter;
        const matchesDate = !dateFilter || order.date === dateFilter;
        
        return matchesSearch && matchesStatus && matchesDate;
    });
}
    
function separateOrdersByStatus(filteredOrders) {
  const pendingOrders = filteredOrders.filter(
    (order) => order.status === "Pending"
  );
  const otherOrders = filteredOrders.filter(
    (order) => order.status !== "Pending"
  );
    
    // Sort each group by date (newest first)
    pendingOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    otherOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { pendingOrders, otherOrders };
}

function renderOrdersTable(tableBody, pendingOrders, otherOrders) {
  tableBody.innerHTML = "";

    // Handle empty state
  if (pendingOrders.length === 0 && otherOrders.length === 0) {
        const emptyRow = createEmptyStateRow();
        tableBody.appendChild(emptyRow);
        return;
    }

    // Add pending orders
  pendingOrders.forEach((order) => {
        const row = createOrderRowFromTemplate(order);
        tableBody.appendChild(row);
    });

    // Add divider if both sections exist and not filtering
  if (
    pendingOrders.length > 0 &&
    otherOrders.length > 0 &&
    !currentOrderStatusFilter
  ) {
        const divider = createDividerRow();
        tableBody.appendChild(divider);
    }

    // Add other orders
  otherOrders.forEach((order) => {
        const row = createOrderRowFromTemplate(order);
        tableBody.appendChild(row);
    });
}

// Create order row using template
function createOrderRowFromTemplate(order) {
  const template = document.getElementById("order-row-template");
    if (!template) return null;
    
    const row = template.content.cloneNode(true);
    
    // Get the actual tr element
  const trElement = row.querySelector(".order-row");
    
    // Apply status-specific classes
    const statusClass = order.status.toLowerCase();
  const isCancelled = order.status === "Cancelled";
  const isCompleted = order.status === "Completed";
  const isPending = order.status === "Pending";
    
    if (isCancelled) {
    trElement.classList.add("order-cancelled");
    } else if (isCompleted) {
    trElement.classList.add("order-completed");
    } else if (isPending) {
    trElement.classList.add("order-pending");
    }
    
    // Format date
  const formattedDate = new Date(order.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    });
    
    // Populate data using template selectors
  const orderIdElement = row.querySelector(".order-id");
  const partNameElement = row.querySelector(".part-name");
  const orderDateElement = row.querySelector(".order-date");
  const quantityBadgeElement = row.querySelector(".quantity-badge");
  const statusBadgeElement = row.querySelector(".status-badge");
    
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
      quantityBadgeElement.style.background = "#fff3cd";
      quantityBadgeElement.style.color = "#856404";
        } else if (isCompleted) {
      quantityBadgeElement.style.background = "#e8f5e9";
      quantityBadgeElement.style.color = "#2e7d32";
        } else if (isCancelled) {
      quantityBadgeElement.style.background = "#ffebee";
      quantityBadgeElement.style.color = "#c62828";
        }
    }
    
    // Set up action buttons
  const editBtn = row.querySelector(".edit-btn");
  const deleteBtn = row.querySelector(".delete-btn");
    
    if (editBtn) {
        if (isCancelled) {
            editBtn.disabled = true;
      editBtn.classList.add("order-disabled");
      editBtn.title = "Cannot edit cancelled orders";
        }
    }
    
    if (deleteBtn) {
        if (isCancelled) {
            deleteBtn.disabled = true;
            deleteBtn.classList.add("order-disabled");
            deleteBtn.title = "Cannot delete cancelled orders";
        }
    }
    
    return row;
}

// Create divider row using template
function createDividerRow() {
  const template = document.getElementById("orders-divider-template");
    return template ? template.content.cloneNode(true) : null;
}

// Create empty state row using template
function createEmptyStateRow() {
  const template = document.getElementById("empty-orders-template");
    return template ? template.content.cloneNode(true) : null;
}

function filterOrdersByStatus(status) {
    currentOrderStatusFilter = status;
    
    // Update active button
  document
    .querySelectorAll(".filter-btn")
    .forEach((btn) => btn.classList.remove("active"));
    if (event && event.target) {
    event.target.classList.add("active");
    }
    
    displayOrdersTable();
}

  // ===== CREATE OPERATIONS =====
async function openAddOrderModal() {
  currentOrderCategories = []; // Clear cart for new order
  await populateOrderPartDropdown();
  const orderIdElement = document.getElementById("orderId");
  if (orderIdElement) orderIdElement.value = await generateNextOrderId();
  const orderDateElement = document.getElementById("orderDate");
  if (orderDateElement)
    orderDateElement.value = new Date().toISOString().split("T")[0];
  const orderStatusElement = document.getElementById("orderStatus");
  if (orderStatusElement) orderStatusElement.value = "Pending";
  const orderCategoryElement = document.getElementById("orderCategory");
  if (orderCategoryElement) orderCategoryElement.value = "";
  const orderPartElement = document.getElementById("orderPart");
  if (orderPartElement) orderPartElement.value = "";
  const orderQuantityElement = document.getElementById("orderQuantity");
  if (orderQuantityElement) orderQuantityElement.value = "";
  updateCategoriesList(); // Ensure cart UI is cleared
  document.getElementById("orderModal").style.display = "block";
}

  // ===== UPDATE OPERATIONS =====
function editOrder(orderId) {
  const order = orders.find((o) => o.orderId === orderId);
  
  if (!order) {
    showToast("Order not found", "error");
    return;
  }
  
  // Pre-populate cart with the order's part and quantity
  const part = inventory.find((p) => p.categoryId === order.partId);
  
  if (part) {
    currentOrderCategories = [
      {
        id: generateId(),
        partId: part.categoryId,
        partName: part.name,
        category: part.category,
        quantity: order.quantity,
        price: part.price,
        maxStock: part.quantity + order.quantity, // allow editing up to original + current
      },
    ];
    updateCategoriesList();
  }
  
  currentEditOrderId = order.id; // Use numeric id for backend API calls
  const orderModalTitle = document.getElementById("orderModalTitle");
  const orderIdElement = document.getElementById("orderId");
  const orderDateElement = document.getElementById("orderDate");
  const orderStatusElement = document.getElementById("orderStatus");
  const orderStatusGroup = document.getElementById("orderStatusGroup");
  const orderModal = document.getElementById("orderModal");
  
  if (orderModalTitle) orderModalTitle.textContent = "Edit Order";
  if (orderIdElement) orderIdElement.value = order.orderId;
  if (orderDateElement) orderDateElement.value = order.date;
  if (orderStatusElement) orderStatusElement.value = order.status;
  // Show status field for editing existing orders
  if (orderStatusGroup) orderStatusGroup.style.display = "block";
  
  // The modal uses inline category forms, so we don't need to set dropdown values
  // The categories will be populated through the updateCategoriesList() function above
  
  // Open the modal
  if (orderModal) {
    orderModal.style.display = "block";
  } else {
    showToast("Error: Modal element not found", "error");
  }
}

function closeOrderModal() {
  const orderModal = document.getElementById("orderModal");
  if (orderModal) orderModal.style.display = "none";
    currentEditOrderId = null;
    currentOrderCategories = [];
}

async function handleOrderFormSubmit(e) {
    e.preventDefault();

  const formData = validateOrderForm();
  if (!formData) return;

  try {
    if (currentEditOrderId && currentOrderCategories.length === 1) {
      await updateExistingOrder(formData);
    } else {
      await createNewOrders(formData);
    }

    await refreshOrderData();
  } catch (error) {
    console.error("Order form submission error:", error);
    showToast(`Error saving order: ${error.message}`, "error");
  }
}

function validateOrderForm() {
  const orderIdElement = document.getElementById("orderId");
  const orderDateElement = document.getElementById("orderDate");
  const orderStatusElement = document.getElementById("orderStatus");

    if (!orderIdElement || !orderDateElement) {
    showToast("Required form elements not found", "error");
    return null;
    }

    const orderId = orderIdElement.value.trim();
    const date = orderDateElement.value;
  const status = currentEditOrderId && orderStatusElement
      ? orderStatusElement.value
      : "Pending";

    if (!orderId || !date) {
    showToast("Please fill in all required fields", "error");
    return null;
    }

    if (currentOrderCategories.length === 0) {
    showToast("Please add at least one category to the order", "error");
    return null;
    }

  return { orderId, date, status };
}

async function updateExistingOrder(formData) {
            const category = currentOrderCategories[0];
      const orderData = {
    orderId: formData.orderId,
        categoryId: category.partId,
        partName: category.partName,
    date: formData.date,
        quantity: category.quantity,
    status: formData.status,
  };

  const responseData = await apiCall(`/orders/${currentEditOrderId}`, {
          method: "PUT",
    body: JSON.stringify(orderData)
  });

  if (responseData && (responseData.success || responseData.id || responseData.orderId)) {
      await logActivityAPI(
        category.partName,
        category.partId,
        "Update Order",
      `Updated order ${formData.orderId}`,
      formData.orderId
      );
      showToast("Order updated successfully!", "success");
        } else {
    throw new Error("Order update failed - invalid response");
  }
}

async function createNewOrders(formData) {
      let successCount = 0;
      let errors = [];

            for (let i = 0; i < currentOrderCategories.length; i++) {
                const category = currentOrderCategories[i];
    const thisOrderId = currentOrderCategories.length > 1 
      ? `${formData.orderId}-${i + 1}` 
      : formData.orderId;
    
        const orderData = {
          orderId: thisOrderId,
          categoryId: category.partId,
          partName: category.partName,
      date: formData.date,
          quantity: category.quantity,
      status: formData.status,
        };

        try {
      const responseData = await apiCall("/orders", {
            method: "POST",
        body: JSON.stringify(orderData)
      });

      if (responseData && (responseData.success || responseData.id || responseData.orderId)) {
          await logActivityAPI(
            category.partName,
            category.partId,
            "Create Order",
          `Created order ${thisOrderId} for ${category.quantity} units (Status: ${formData.status})`,
            thisOrderId
          );
          successCount++;
      } else {
        throw new Error("Order creation failed - invalid response");
      }
        } catch (orderError) {
      console.error(`Error creating order for ${category.partName}:`, orderError);
          errors.push(`${category.partName}: ${orderError.message}`);
        }
      }

  showOrderCreationResults(successCount, errors, formData.orderId);
}

function showOrderCreationResults(successCount, errors, orderId) {
      if (successCount > 0 && errors.length === 0) {
    showToast(`Order ${orderId} created successfully with ${successCount} items!`, "success");
      } else if (successCount > 0 && errors.length > 0) {
    showToast(`Partially successful: ${successCount} items created, ${errors.length} failed`, "warning");
        console.error("Order creation errors:", errors);
      } else {
        showToast("All order items failed to create", "error");
        console.error("All order creation errors:", errors);
        throw new Error("All orders failed");
      }
    }

async function refreshOrderData() {
        closeOrderModal();
    await Promise.all([fetchOrders(), fetchInventory(), fetchActivity()]);

        updateDashboard();
        displayOrdersTable();
        displayInventoryTable();
    displayActivityHistory();
        triggerStockNotification();
        updateReports();
}

  // Universal Delete Confirmation Function
  function confirmDelete(type, id, name, deleteFunction) {
    const messages = {
      'part': `Are you sure you want to delete part ${name}? This action cannot be undone.`,
      'order': `Are you sure you want to delete order ${name}? This action cannot be undone.`
    };
    
    const titles = {
      'part': 'Delete Part',
      'order': 'Delete Order'
    };
    
    showConfirmModal(
      titles[type] || 'Confirm Delete',
      messages[type] || `Are you sure you want to delete this ${type}?`,
      () => deleteFunction(id)
    );
  }

  // ===== DELETE OPERATIONS =====
function confirmDeleteOrder(orderId) {
  const order = orders.find((o) => o.orderId === orderId);
  if (!order) {
    showToast("Order not found", "error");
    return;
  }
  
    confirmDelete('order', order.id, order.orderId, deleteOrder);
}

async function deleteOrder(id) {
  const order = orders.find((o) => o.id === id);
    if (!order) {
    showToast("Order not found", "error");
        return;
    }
    
    try {
      await apiCall(`/orders/${id}`, { method: 'DELETE' });
    await logActivityAPI(
      order.partName,
      order.partId,
      "Deleted",
      `Deleted order ${order.orderId}`,
      order.orderId
    );
    showToast("Order deleted successfully!", "success");
        await fetchOrders();
        await fetchInventory();
        updateDashboard();
        displayOrdersTable();
        displayInventoryTable();
        triggerStockNotification();
        updateReports();
    } catch (err) {
    showToast("Error deleting order", "error");
  }
}

async function logActivityAPI(
  partName,
  categoryId,
  actionType,
  details,
  orderId = null
) {
  const body = { partName, categoryId, actionType, details };
  if (orderId) body.orderId = orderId;
  
  try {
    await apiCall("/activity", {
    method: "POST",
      body: JSON.stringify(body)
    });
    await fetchActivity();
    displayActivityHistory();
  } catch (error) {
    throw new Error("Activity log failed");
  }
}

// Activity History Functions
function displayActivityHistory() {
  const tableBody = document.getElementById("activityTableBody");
    if (!tableBody) return;
    
  const activityDateFrom = document.getElementById("activityDateFrom");
  const activityDateTo = document.getElementById("activityDateTo");
  const actionTypeFilter = document.getElementById("actionTypeFilter");

  const dateFrom = activityDateFrom ? activityDateFrom.value : "";
  const dateTo = activityDateTo ? activityDateTo.value : "";
  const actionTypeFilterValue = actionTypeFilter ? actionTypeFilter.value : "";

  // Map dropdown filter to actual actionType values in the database
  const actionTypeMap = {
    "Stock Added": "Stock Added",
    "Update Order": "Stock Updated",
    "Create Order": "Order Created",
    Completed: "Completed",
    Deleted: "Deletion",
  };
  let filteredActivity = activityHistory.filter((activity) => {
    const activityDate = new Date(activity.created_at)
      .toISOString()
      .split("T")[0];
        const matchesDateFrom = !dateFrom || activityDate >= dateFrom;
        const matchesDateTo = !dateTo || activityDate <= dateTo;
    let matchesActionType = true;
    if (actionTypeFilterValue) {
      if (actionTypeMap[actionTypeFilterValue]) {
        matchesActionType =
          activity.actionType === actionTypeMap[actionTypeFilterValue];
      } else {
        matchesActionType = activity.actionType === actionTypeFilterValue;
      }
    }
        return matchesDateFrom && matchesDateTo && matchesActionType;
    });

  tableBody.innerHTML = "";

    if (filteredActivity.length === 0) {
    const row = document.createElement("tr");
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

  filteredActivity.forEach((activity) => {
    const timestamp = new Date(activity.created_at);
    const formattedTime = timestamp.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
        });

        const actionIcon = {
      "Stock Added": "➕",
      "Stock Updated": "✏️",
      "Order Created": "📦",
      Completed: "✅",
      Deletion: "🗑️",
    };

    const row = document.createElement("tr");
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td><strong>${activity.partName}</strong></td>
            <td><code>${activity.categoryId}</code></td>
            <td><code>${activity.orderId ? activity.orderId : ""}</code></td>
            <td>
                <span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">
                    ${actionIcon[activity.actionType] || "📝"} ${
      activity.actionType
    }
                </span>
            </td>
            <td style="color: #7f8c8d;">${activity.details}</td>
        `;
        tableBody.appendChild(row);
    });
}

function clearActivityFilters() {
  const activityDateFrom = document.getElementById("activityDateFrom");
  const activityDateTo = document.getElementById("activityDateTo");
  const actionTypeFilter = document.getElementById("actionTypeFilter");

  if (activityDateFrom) activityDateFrom.value = "";
  if (activityDateTo) activityDateTo.value = "";
  if (actionTypeFilter) actionTypeFilter.value = "";
    
    displayActivityHistory();
}

function updateWeeklyOrderChart() {
  renderWeeklyOrderChart();
}

function updateReports() {
    // Update reports
  updateInventoryReports();
  updateStockLevelReports(); 
  updateOrderReports();
  updateWeeklyOrderChart();
  renderReportsAnalytics();
  updateReportSummaryFromBackend();
}


// Fetch report summary from backend and update DOM
async function updateReportSummaryFromBackend() {
    try {
        const summary = await apiCall("/reports/summary");
        // Update summary values
    const totalPartsEl = document.getElementById("reportTotalParts");
        if (totalPartsEl) totalPartsEl.textContent = summary.total_parts || 0;
    const totalValueEl = document.getElementById("reportTotalValue");
    if (totalValueEl)
      totalValueEl.textContent = `₱${(summary.total_value || 0).toLocaleString(
        "en-PH",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}`;
        // Categories: count unique categories in inventory
    const categoriesEl = document.getElementById("reportCategories");
        if (categoriesEl && Array.isArray(inventory)) {
      const uniqueCategories = new Set(
        inventory.map((part) => part.category || "Unknown")
      );
            categoriesEl.textContent = uniqueCategories.size;
        }
        // Stock level counts
    const outStockCountEl = document.getElementById("outStockCount");
    const lowStockCountEl = document.getElementById("lowStockCount");
    const inStockCountEl = document.getElementById("inStockCount");
    const discontinuedCountEl = document.getElementById("discontinuedCount");
        if (Array.isArray(inventory)) {
      let out = 0,
        low = 0,
        inStock = 0,
        discontinued = 0;
      inventory.forEach((part) => {
                const level = getStockLevel(part);
        if (level === "Out of Stock") out++;
        else if (level === "Low Stock") low++;
        else if (level === "In Stock") inStock++;
        else if (level === "Discontinued") discontinued++;
            });
            if (outStockCountEl) outStockCountEl.textContent = out;
            if (lowStockCountEl) lowStockCountEl.textContent = low;
            if (inStockCountEl) inStockCountEl.textContent = inStock;
            if (discontinuedCountEl) discontinuedCountEl.textContent = discontinued;
        }
    } catch (err) {
        // Optionally show error
        // showToast('Failed to load report summary', 'error');
    }
}

function renderReportsAnalytics() {
  renderReportsStockChart();
  renderReportsCategoryChart();
}

// Reports stock chart (uses the universal function)
function renderReportsStockChart() {
  // Add a small delay to ensure DOM is ready
  setTimeout(() => {
    const chartContainer = document.getElementById("reportsStockChart");
    
    if (chartContainer) {
      // If donut container doesn't exist, create it
      let donutContainer = document.getElementById("reportsStockDonut");
      if (!donutContainer) {
        donutContainer = document.createElement('div');
        donutContainer.id = 'reportsStockDonut';
        chartContainer.appendChild(donutContainer);
      }
      
      renderStockChartUniversal("reportsStockChart", "reportsStockDonut", "reports");
    }
  }, 100);
}

function renderReportsCategoryChart() {
  renderCategoryChartUniversal("reportsCategoryChart", "reports");
}




function updatePageTitle(page) {
    const titles = {
    dashboard: "📊 Dashboard Overview",
    inventory: "📦 Inventory Management",
    orders: "📋 Order Management",
    activity: "📝 Activity History",
    reports: "📈 Reports & Analytics",
  };

  const titleElement = document.getElementById("pageTitle");
    if (titleElement) {
    titleElement.textContent = titles[page] || "Dashboard";
    }
}

function refreshPageData(page) {
  switch (page) {
    case "dashboard":
            updateDashboard();
            break;
    case "inventory":
            displayInventoryTable();
            break;
    case "orders":
            displayOrdersTable();
            break;
    case "activity":
            displayActivityHistory();
            break;
    case "reports":
            updateReports();
            break;
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Search and filter functionality
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const statusFilter = document.getElementById("statusFilter");
  const orderSearchInput = document.getElementById("orderSearchInput");
  const orderDateFilter = document.getElementById("orderDateFilter");
  const activityDateFrom = document.getElementById("activityDateFrom");
  const activityDateTo = document.getElementById("activityDateTo");
  const actionTypeFilter = document.getElementById("actionTypeFilter");
    
    if (searchInput) {
    searchInput.addEventListener("input", displayInventoryTable);
    }
    
    if (categoryFilter) {
    categoryFilter.addEventListener("change", displayInventoryTable);
    }
    
    if (statusFilter) {
    statusFilter.addEventListener("change", displayInventoryTable);
    }
    
    if (orderSearchInput) {
    orderSearchInput.addEventListener("input", displayOrdersTable);
    }
    
    if (orderDateFilter) {
    orderDateFilter.addEventListener("change", displayOrdersTable);
    }
    
    if (activityDateFrom) {
    activityDateFrom.addEventListener("change", displayActivityHistory);
    }
    
    if (activityDateTo) {
    activityDateTo.addEventListener("change", displayActivityHistory);
    }
    
    if (actionTypeFilter) {
    actionTypeFilter.addEventListener("change", displayActivityHistory);
    }
    
    // Report filters
  const monthFilter = document.getElementById("monthFilter");
  const yearFilter = document.getElementById("yearFilter");
  const dashboardMonthFilter = document.getElementById("dashboardMonthFilter");
  const dashboardYearFilter = document.getElementById("dashboardYearFilter");
    
    if (monthFilter) {
    monthFilter.addEventListener("change", () =>
      renderWeeklyChart("monthFilter", "yearFilter", "weeklyOrderChart")
    );
    }
    
    if (yearFilter) {
    yearFilter.addEventListener("change", () =>
      renderWeeklyChart("monthFilter", "yearFilter", "weeklyOrderChart")
    );
    }
    
    if (dashboardMonthFilter) {
    dashboardMonthFilter.addEventListener("change", () =>
      renderWeeklyChart(
        "dashboardMonthFilter",
        "dashboardYearFilter",
        "dashboardWeeklyOrderChart"
      )
    );
    }
    
    if (dashboardYearFilter) {
    dashboardYearFilter.addEventListener("change", () =>
      renderWeeklyChart(
        "dashboardMonthFilter",
        "dashboardYearFilter",
        "dashboardWeeklyOrderChart"
      )
    );
    }
    
    // Form submissions
  const partForm = document.getElementById("partForm");
    if (partForm) {
    partForm.addEventListener("submit", handlePartFormSubmit);
    }
    
  const orderForm = document.getElementById("orderForm");
    if (orderForm) {
    orderForm.addEventListener("submit", handleOrderFormSubmit);
    }
    
    // Modal close events
  window.addEventListener("click", function (event) {
    const modals = [
      "partModal",
      "orderModal",
      "categoryModal",
      "lowStockModal",
      "confirmModal",
      "detailsModal",
    ];
    modals.forEach((modalId) => {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
        modal.style.display = "none";
            }
        });
    });
    
    // Auto-generate Part ID when category changes
  document.addEventListener("change", function (e) {
    if (e.target.id === "partCategory" && !currentEditPartId) {
      const partIdInput = document.getElementById("partId");
            if (partIdInput) {
                partIdInput.value = generatePartId();
            }
        }
    });

    // Add clickable functionality to dashboard cards
  const totalValueCard = document.querySelector(".stat-card.green");
  const lowStockCard = document.querySelector(".stat-card.orange");
    
    if (totalValueCard) {
    totalValueCard.style.cursor = "pointer";
    totalValueCard.addEventListener("click", function () {
            // Navigate to reports page
            document.querySelector('.nav-item[data-page="reports"]').click();
        });
    }
    
    if (lowStockCard) {
    lowStockCard.style.cursor = "pointer";
    lowStockCard.addEventListener("click", function () {
            showLowStockAlert();
        });
    }
}

  // Universal Date Formatting Functions
  function formatDate(date, format = 'full') {
    const dateObj = new Date(date);
    const formats = {
      'short': { month: 'short', day: 'numeric', year: 'numeric' },
      'full': { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      },
      'dateOnly': { year: 'numeric', month: 'short', day: 'numeric' },
      'timeOnly': { hour: '2-digit', minute: '2-digit', hour12: true }
    };
    
    return dateObj.toLocaleDateString('en-US', formats[format] || formats.full);
  }

// Date and Time
function updateDateTime() {
    const now = new Date();
  const dateTimeElement = document.getElementById("dateTime");
    if (dateTimeElement) {
      dateTimeElement.textContent = formatDate(now, 'full');
    }
  }

  // Universal Table Renderer
class TableRenderer {
  static renderTable(containerId, data, columns, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const {
      emptyMessage = "No data available",
      rowClass = "",
      headerClass = "",
      emptyRowClass = ""
    } = options;
    
    container.innerHTML = "";
    
    if (!data || data.length === 0) {
      const emptyRow = document.createElement("tr");
      emptyRow.className = emptyRowClass;
      emptyRow.innerHTML = `
        <td colspan="${columns.length}" style="text-align: center; padding: 40px;">
          <div style="color: #7f8c8d; font-size: 1.1rem;">${emptyMessage}</div>
        </td>
      `;
      container.appendChild(emptyRow);
      return;
    }
    
    data.forEach(item => {
      const row = document.createElement("tr");
      row.className = rowClass;
      
      columns.forEach(column => {
        const cell = document.createElement("td");
        const value = column.render ? column.render(item) : item[column.key];
        cell.innerHTML = value;
        if (column.className) cell.className = column.className;
        if (column.style) Object.assign(cell.style, column.style);
        row.appendChild(cell);
      });
      
      container.appendChild(row);
    });
  }
  
  static createColumn(key, title, options = {}) {
    return {
      key,
      title,
      render: options.render,
      className: options.className,
      style: options.style
    };
  }
}

// Universal Filter Manager
class FilterManager {
  static filterData(data, filters) {
    return data.filter(item => {
      return filters.every(filter => {
        const { key, value, operator = 'includes' } = filter;
        
        if (!value || value === '') return true;
        
        const itemValue = item[key];
        
        switch (operator) {
          case 'includes':
            return itemValue && itemValue.toString().toLowerCase().includes(value.toLowerCase());
          case 'equals':
            return itemValue === value;
          case 'startsWith':
            return itemValue && itemValue.toString().toLowerCase().startsWith(value.toLowerCase());
          case 'dateRange':
            if (!filter.startDate || !filter.endDate) return true;
            const itemDate = new Date(itemValue);
            const startDate = new Date(filter.startDate);
            const endDate = new Date(filter.endDate);
            return itemDate >= startDate && itemDate <= endDate;
          default:
            return true;
        }
      });
    });
  }
  
  static createFilter(key, value, operator = 'includes') {
    return { key, value, operator };
  }
  
  static createDateRangeFilter(key, startDate, endDate) {
    return { key, value: null, operator: 'dateRange', startDate, endDate };
  }
}

// Universal Form Validation Function
function validateFormFields(fields, showErrors = true) {
  const errors = [];
  
  fields.forEach(field => {
    const { element, name, required = true, type = 'text', min = null, max = null } = field;
    
    if (!element) {
      errors.push(`${name} field not found`);
      return;
    }
    
    const value = element.value.trim();
    
    if (required && !value) {
      errors.push(`${name} is required`);
      return;
    }
    
    if (type === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        errors.push(`${name} must be a valid number`);
        return;
      }
      if (min !== null && numValue < min) {
        errors.push(`${name} must be at least ${min}`);
        return;
      }
      if (max !== null && numValue > max) {
        errors.push(`${name} must be at most ${max}`);
        return;
      }
    }
  });
  
  if (showErrors && errors.length > 0) {
    showToast(errors[0], "error");
  }
  
  return errors.length === 0;
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generatePartId() {
    const categories = {
    "Processor (CPU)": "CPU",
    "Memory (RAM)": "RAM",
    "Graphic Card (GPU)": "GPU",
    Storage: "SSD",
    Motherboard: "MB",
    "Power Supply": "PSU",
    "Cooling System": "COOL",
    "Computer Case": "CASE",
    Peripheral: "PER",
  };

  const categoryElement = document.getElementById("partCategory");
  const category = categoryElement ? categoryElement.value : "";
  const prefix = categories[category] || "GEN";
  const number = String(
    inventory.filter((p) => p.categoryId.startsWith(prefix)).length + 1
  ).padStart(3, "0");
    
    return `${prefix}${number}`;
}

function generateOrderId() {
  const number = String(orders.length + 1).padStart(3, "0");
    return `ORD${number}`;
}

function getStockLevel(part) {
  if (part.status === "Discontinued") {
    return "Discontinued";
    }
    
    const quantity = parseInt(part.quantity || 0);
    const alertThreshold = parseInt(part.alertThreshold || 0);
    
    if (quantity === 0) {
    return "Out of Stock";
    } else if (quantity <= alertThreshold) {
    return "Low Stock";
    } else {
    return "In Stock";
    }
}

function logActivity(partName, categoryId, actionType, details) {
    activityHistory.unshift({
        id: generateId(),
        timestamp: new Date().toISOString(),
        partName,
        categoryId,
        actionType,
    details,
    });
}

// Enhanced Low Stock Notification System
function checkLowStockNotifications() {
  const lowStockItems = inventory.filter((part) => {
        const stockLevel = getStockLevel(part);
    return stockLevel === "Low Stock" || stockLevel === "Out of Stock";
    });
    
    const previousNotificationState = hasActiveNotifications;
    hasActiveNotifications = lowStockItems.length > 0;
    
    // Update UI elements based on notification state
    updateUIForNotificationState();
    
    if (lowStockItems.length > 0) {
    const outOfStockCount = lowStockItems.filter(
      (part) => getStockLevel(part) === "Out of Stock"
    ).length;
    const lowStockCount = lowStockItems.filter(
      (part) => getStockLevel(part) === "Low Stock"
    ).length;

    let message = "";
    let type = "warning";
        
        if (outOfStockCount > 0 && lowStockCount > 0) {
            message = `${outOfStockCount} items out of stock, ${lowStockCount} items low stock`;
      type = "error";
        } else if (outOfStockCount > 0) {
      message = `${outOfStockCount} item${
        outOfStockCount > 1 ? "s" : ""
      } out of stock`;
      type = "error";
        } else {
      message = `${lowStockCount} item${
        lowStockCount > 1 ? "s" : ""
      } running low on stock`;
      type = "warning";
        }
        
        // Only show notification if this is a new notification state or initial load
        if (!previousNotificationState || !notificationCheckInterval) {
      showToast(
        `${message}. Click notification bell for details.`,
        type,
        "Stock Alert"
      );
        }
        
        // Start continuous monitoring if not already active
        startNotificationMonitoring();
    } else {
        // Clear notifications when all items are well stocked
        if (previousNotificationState) {
      showToast("All items are now well stocked!", "success", "Stock Status");
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
    const lowStockItems = inventory.filter((part) => {
            const stockLevel = getStockLevel(part);
      return stockLevel === "Low Stock" || stockLevel === "Out of Stock";
        });
        
        // Update badge and UI state
        updateNotificationBadge(lowStockItems.length);
        updateUIForNotificationState();
        
        if (lowStockItems.length === 0) {
            hasActiveNotifications = false;
            stopNotificationMonitoring();
      showToast(
        "Stock levels normalized. Monitoring stopped.",
        "success",
        "System Update"
      );
        }
    }, 30000);
    
    // Started automatic stock monitoring
}

// Stop notification monitoring
function stopNotificationMonitoring() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
        notificationCheckInterval = null;
      // Stopped automatic stock monitoring
    }
}

// Update UI elements based on notification state
function updateUIForNotificationState() {
  const notificationBell = document.querySelector(".notification-icon");
    
    if (hasActiveNotifications) {
        // Style notification bell as active
        if (notificationBell) {
      notificationBell.style.color = "#e74c3c";
      notificationBell.style.animation = "pulse 2s infinite";
        }
    } else {
        // Reset UI to normal state
        if (notificationBell) {
      notificationBell.style.color = "";
      notificationBell.style.animation = "";
        }
    }
}

// Enhanced Category Management Functions

// Toggle the inline category form
function toggleCategoryForm() {
  const formContainer = document.getElementById("categoryFormContainer");
    const button = event.target;
    
    if (formContainer && button) {
    if (
      formContainer.style.display === "none" ||
      formContainer.style.display === ""
    ) {
      formContainer.style.display = "block";
      button.textContent = "HIDE FORM";
      button.style.background = "#95a5a6";
        } else {
      formContainer.style.display = "none";
      button.textContent = "ADD CATEGORY";
      button.style.background = "#2c3e50";
            
            // Reset form when hiding
      const inlineCategorySelect = document.getElementById(
        "inlineCategorySelect"
      );
      const inlineCategoryPart = document.getElementById("inlineCategoryPart");
      const inlineCategoryQuantity = document.getElementById(
        "inlineCategoryQuantity"
      );

      if (inlineCategorySelect) inlineCategorySelect.value = "";
            if (inlineCategoryPart) {
        inlineCategoryPart.innerHTML =
          '<option value="">Select Category First</option>';
                inlineCategoryPart.disabled = true;
            }
      if (inlineCategoryQuantity) inlineCategoryQuantity.value = "";
        }
    }
}

// Initialize the enhanced functionality
function initializeOrderCategorySystem() {
    setupInlineCategoryListener();
    
    // Hide the category form initially
  const formContainer = document.getElementById("categoryFormContainer");
    if (formContainer) {
    formContainer.style.display = "none";
    }
}

// Populate parts when category is selected in inline form - FIXED VERSION
function setupInlineCategoryListener() {
  const categorySelect = document.getElementById("inlineCategorySelect");
    if (categorySelect) {
    categorySelect.addEventListener("change", function () {
            populateInlinePartsForCategory(this.value);
        });
    }
}

function populateInlinePartsForCategory(selectedCategory) {
  const partSelect = document.getElementById("inlineCategoryPart");
    if (!partSelect) return;
    if (!selectedCategory) {
        partSelect.innerHTML = '<option value="">Select Category First</option>';
        partSelect.disabled = true;
        return;
    }
    // Get parts for the selected category
  let categoryParts = inventory.filter(
    (part) => part.category === selectedCategory
  );
    if (currentEditOrderId) {
    const currentOrder = orders.find((o) => o.id === currentEditOrderId);
        if (currentOrder) {
      const currentOrderPart = inventory.find(
        (p) => p.categoryId === currentOrder.categoryId
      );
            if (currentOrderPart && currentOrderPart.category === selectedCategory) {
        if (
          !categoryParts.find(
            (p) => p.categoryId === currentOrderPart.categoryId
          )
        ) {
                    categoryParts.push(currentOrderPart);
                }
            }
        }
    } else {
    categoryParts = categoryParts.filter((part) => part.quantity > 0);
    }
    partSelect.innerHTML = '<option value="">Select Part</option>';
    partSelect.disabled = false;
  categoryParts.forEach((part) => {
    const option = document.createElement("option");
    option.value = part.categoryId;
        let availableStock = part.quantity;
        let displayText = `${part.name}`;
        if (currentEditOrderId) {
      const currentOrder = orders.find((o) => o.id === currentEditOrderId);
      if (currentOrder && currentOrder.categoryId === part.categoryId) {
                availableStock += currentOrder.quantity;
                if (part.quantity === 0) {
                    displayText += ` (Currently: ${part.quantity}, Ordered: ${currentOrder.quantity})`;
          option.style.color = "#666";
          option.style.fontStyle = "italic";
                } else {
                    displayText += ` (Available: ${availableStock})`;
                }
            } else {
                displayText += ` (Available: ${availableStock})`;
            }
        } else {
            displayText += ` (Available: ${availableStock})`;
        }
        option.textContent = displayText;
        partSelect.appendChild(option);
    });
    if (categoryParts.length === 0) {
    partSelect.innerHTML =
      '<option value="">No parts available in this category</option>';
        partSelect.disabled = true;
    }
}

// Add category from inline form
function addInlineCategory() {
  const categorySelect = document.getElementById("inlineCategorySelect");
  const partSelect = document.getElementById("inlineCategoryPart");
  const quantityInput = document.getElementById("inlineCategoryQuantity");
    if (!categorySelect || !partSelect || !quantityInput) {
    showToast("Form elements not found", "error");
        return;
    }
    const category = categorySelect.value;
    const partId = partSelect.value;
    const quantity = parseInt(quantityInput.value);
    if (!category) {
    showToast("Please select a category first", "error");
        return;
    }
    if (!partId) {
    showToast("Please select a part", "error");
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
    showToast("Please enter a valid quantity", "error");
        return;
    }
  // Use latestPartsFromDB if available, otherwise fallback to inventory
  const parts = window.latestPartsFromDB || inventory;
  const part = parts.find((p) => p.categoryId === partId);
    if (!part) {
    showToast("Selected part not found", "error");
        return;
    }
    let availableStock = part.quantity;
    if (currentEditOrderId) {
    const currentOrder = orders.find((o) => o.id === currentEditOrderId);
    if (currentOrder && currentOrder.categoryId === partId) {
            availableStock += currentOrder.quantity;
        }
    }
    if (quantity > availableStock) {
    showToast(
      `Cannot add: Requested quantity (${quantity}) exceeds available stock (${availableStock})`,
      "error"
    );
        return;
    }
  const existingCategoryIndex = currentOrderCategories.findIndex(
    (cat) => cat.partId === partId
  );
    if (existingCategoryIndex !== -1) {
    showToast("This part is already added to the order", "error");
        return;
    }
    currentOrderCategories.push({
        id: generateId(),
    partId: part.categoryId,
        partName: part.name,
    category: part.category,
        quantity: quantity,
        price: part.price,
    maxStock: availableStock,
    });
    updateCategoriesList();
  showToast("Category added successfully!", "success");
}

// Enhanced updateCategoriesList function with editable dropdowns
function updateCategoriesList() {
  const container = document.getElementById("orderCategoriesList");
    
    if (!container) return;
    
    if (currentOrderCategories.length === 0) {
    container.innerHTML =
      '<div class="no-categories">No categories added yet. Click "ADD CATEGORY" to add parts.</div>';
        return;
    }
    
  container.innerHTML = "";
    currentOrderCategories.forEach((category, index) => {
    const categoryItem = document.createElement("div");
    categoryItem.className = "category-item";
    categoryItem.style.marginBottom = "15px";
        
        // Create dropdown options for parts in the same category
    let categoryParts = inventory.filter(
      (part) => part.category === category.category
    );
        
        // If editing and this is the current order's part, include it even if out of stock
        if (currentEditOrderId) {
      const currentOrder = orders.find((o) => o.id === currentEditOrderId);
            if (currentOrder && currentOrder.partId === category.partId) {
        const currentPart = inventory.find(
          (p) => p.partId === currentOrder.partId
        );
        if (
          currentPart &&
          !categoryParts.find((p) => p.partId === currentPart.partId)
        ) {
                    categoryParts.push(currentPart);
                }
            }
            // For editing, show all parts in category
        } else {
            // For new orders, only show parts with stock
      categoryParts = categoryParts.filter((part) => part.quantity > 0);
        }
        
    const partOptions = categoryParts
      .map((part) => {
            let stockDisplay = part.quantity;
        let optionStyle = "";
            
            // If editing and this is the current part, calculate effective stock
            if (currentEditOrderId) {
          const currentOrder = orders.find((o) => o.id === currentEditOrderId);
                if (currentOrder && currentOrder.partId === part.partId) {
                    stockDisplay = part.quantity + currentOrder.quantity;
                    if (part.quantity === 0) {
                        optionStyle = 'style="color: #666; font-style: italic;"';
                    }
                }
            }
            
        return `<option value="${part.partId}" ${
          part.partId === category.partId ? "selected" : ""
        } ${optionStyle}>
                ${part.name} (Stock: ${stockDisplay})
            </option>`;
      })
      .join("");
        
        categoryItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: white; border: 1px solid #e0e6ed; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 1.5rem; color: #3498db;">📦</div>
                        <div style="flex: 1;">
                            <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 10px; font-size: 0.8rem; margin-bottom: 5px; display: inline-block;">${category.category}</span>
                            <select onchange="updateCategoryPart(${index}, this.value)" style="width: 100%; padding: 5px; margin-top: 5px; border: 1px solid #e0e6ed; border-radius: 4px;">
                                ${partOptions}
                            </select>
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="font-size: 0.9rem; color: #7f8c8d; font-weight: 600;">Qty:</label>
                        <input type="number" value="${category.quantity}" min="1" max="${category.maxStock}" onchange="updateCategoryQuantity(${index}, this.value)" style="width: 60px; padding: 6px; border: 1px solid #e0e6ed; border-radius: 4px; text-align: center; font-weight: 600;">
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

// Update category part when dropdown changes
function updateCategoryPart(index, newPartId) {
    if (index >= 0 && index < currentOrderCategories.length) {
    const part = inventory.find((p) => p.partId === newPartId);
        if (part) {
            // Calculate max stock for the new part
            let maxStock = part.quantity;
            if (currentEditOrderId) {
        const currentOrder = orders.find((o) => o.id === currentEditOrderId);
                if (currentOrder && currentOrder.partId === newPartId) {
                    maxStock += currentOrder.quantity;
                }
            }
            
            currentOrderCategories[index].partId = newPartId;
            currentOrderCategories[index].partName = part.name;
            currentOrderCategories[index].price = part.price;
            currentOrderCategories[index].maxStock = maxStock;
            
            // Reset quantity to 1 if current quantity exceeds new part's available stock
            if (currentOrderCategories[index].quantity > maxStock) {
                currentOrderCategories[index].quantity = Math.min(1, maxStock);
            }
            
            updateCategoriesList();
      showToast("Part updated successfully", "success");
        }
    }
}

// Update category quantity when input changes
function updateCategoryQuantity(index, newQuantity) {
    if (index >= 0 && index < currentOrderCategories.length) {
        const quantity = parseInt(newQuantity);
        const category = currentOrderCategories[index];
        
        if (quantity > 0 && quantity <= category.maxStock) {
            currentOrderCategories[index].quantity = quantity;
      showToast("Quantity updated successfully", "success");
        } else {
      showToast(`Quantity must be between 1 and ${category.maxStock}`, "error");
            updateCategoriesList(); // Reset to previous value
        }
    }
}

// Remove category function
function removeCategory(index) {
    if (index >= 0 && index < currentOrderCategories.length) {
        const category = currentOrderCategories[index];
        currentOrderCategories.splice(index, 1);
        updateCategoriesList();
    showToast(`${category.partName} removed from order`, "info");
    }
}

// Dashboard Functions
function updateDashboard() {
  const totalParts = inventory.reduce(
    (sum, part) => sum + parseInt(part.quantity || 0),
    0
  );
  const totalValue = inventory.reduce(
    (sum, part) =>
      sum + parseInt(part.price || 0) * parseInt(part.quantity || 0),
    0
  );
  const lowStockItems = inventory.filter((part) => {
        const stockLevel = getStockLevel(part);
    return stockLevel === "Low Stock" || stockLevel === "Out of Stock";
    }).length;
  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const totalPartsElement = document.getElementById("totalParts");
  const totalValueElement = document.getElementById("totalValue");
  const lowStockItemsElement = document.getElementById("lowStockItems");
  const pendingOrdersElement = document.getElementById("pendingOrders");

  if (totalPartsElement)
    totalPartsElement.textContent = totalParts.toLocaleString();
  if (totalValueElement)
    totalValueElement.textContent = `₱${totalValue.toLocaleString("en-PH")}`;
    if (lowStockItemsElement) lowStockItemsElement.textContent = lowStockItems;
    if (pendingOrdersElement) pendingOrdersElement.textContent = pendingOrders;
    
    // Update notification badge
    updateNotificationBadge(lowStockItems);
    
    // Update charts
    renderCategoryChart();
    renderStockChart();
    updateWeeklyOrderChart();
}

function updateNotificationBadge(count) {
  const badge = document.getElementById("notificationBadge");
    if (badge) {
        badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
    }
}

  // Universal Category Chart Renderer
function renderCategoryChartUniversal(containerId, context = 'dashboard') {
    const categoryData = {};
    
  inventory.forEach((part) => {
        const quantity = parseInt(part.quantity || 0);
    const category = part.category || "Unknown";
        categoryData[category] = (categoryData[category] || 0) + quantity;
    });

  const chartContainer = document.getElementById(containerId);
    if (!chartContainer) return;
    
  chartContainer.innerHTML = "";

    if (Object.keys(categoryData).length === 0) {
    chartContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No data available</p>';
        return;
    }

    const maxValue = Math.max(...Object.values(categoryData));
    
    Object.entries(categoryData).forEach(([category, count]) => {
    const bar = document.createElement("div");
    bar.className = "bar";
        bar.style.height = `${(count / maxValue) * 160}px`;
        
    const label = document.createElement("div");
    label.className = "bar-label";
    label.textContent = category.split(" ")[0];

    const value = document.createElement("div");
    value.className = "bar-value";
        value.textContent = count;
        
        bar.appendChild(label);
        bar.appendChild(value);
        chartContainer.appendChild(bar);
    });
}

function renderCategoryChart() {
  renderCategoryChartUniversal("categoryChart", "dashboard");
}

// Modified renderStockChart function to work on both dashboard and reports pages
// Universal stock chart renderer function
function renderStockChartUniversal(chartContainerId, donutContainerId, context = 'dashboard') {
  const stockData = {
      "In Stock": 0,
      "Low Stock": 0,
      "Out of Stock": 0,
      "Discontinued": 0,
  };
  
  // Check if inventory is truly empty
  if (!inventory || inventory.length === 0) {
      const chartContainer = document.getElementById(chartContainerId);
      const donutContainer = document.getElementById(donutContainerId);
      if (donutContainer) {
          donutContainer.innerHTML = '<div style="text-align: center; color: #e74c3c; padding: 20px;"><strong>No Data Available</strong></div>';
      }
      if (chartContainer) chartContainer.style.display = 'none';
      return;
  }
  
  inventory.forEach((part) => {
      const stockLevel = getStockLevel(part);
      stockData[stockLevel]++;
  });
  
  const statusOrder = ["In Stock", "Low Stock", "Out of Stock", "Discontinued"];
  const colors = ["#27ae60", "#f39c12", "#e74c3c", "#95a5a6"];
  const total = statusOrder.reduce((sum, status) => sum + (stockData[status] || 0), 0);
  
  const chartContainer = document.getElementById(chartContainerId);
  const donutContainer = document.getElementById(donutContainerId);
  
  if (!chartContainer || !donutContainer) {
      return;
  }
  
  chartContainer.style.display = '';
  
  // CRITICAL: Clear only the donut container, preserve legend
  // The legend should be outside the donut container, so we only clear the donut
  donutContainer.innerHTML = "";
  
  // Set up proper positioning for the donut container
  donutContainer.style.position = "relative";
  donutContainer.style.width = "140px";
  donutContainer.style.height = "140px";
  
  if (total === 0) {
      donutContainer.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #e74c3c;">
              <div style="text-align: center;">
                  <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                  <strong>No Data</strong>
              </div>
          </div>
      `;
      return;
  }
  
  // Create SVG donut chart
  const size = 140;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  let currentAngle = -90;
  
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  
  statusOrder.forEach((status, i) => {
      const count = stockData[status] || 0;
      if (count > 0) {
          const angle = (count / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          const largeArc = angle > 180 ? 1 : 0;
          
          const start = polarToCartesian(center, center, radius, startAngle);
          const end = polarToCartesian(center, center, radius, endAngle);
          
          const d = [
              `M ${start.x} ${start.y}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
          ].join(" ");
          
          const path = document.createElementNS(svgNS, "path");
          path.setAttribute("d", d);
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", colors[i]);
          path.setAttribute("stroke-width", strokeWidth);
          path.setAttribute("stroke-linecap", "butt");
          
          svg.appendChild(path);
          currentAngle += angle;
      }
  });
  
  // Add center total with improved styling
  const totalDiv = document.createElement("div");
  totalDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 10;
      text-align: center;
  `;
  totalDiv.innerHTML = `
      <span style="font-size: 2rem; font-weight: 800; color: #2c3e50; line-height: 1;">${total}</span>
      <span style="font-size: 0.8rem; color: #7f8c8d; font-weight: 600; letter-spacing: 1px; line-height: 1; margin-top: 2px;">TOTAL</span>
  `;
  
  donutContainer.appendChild(svg);
  donutContainer.appendChild(totalDiv);
  
  // Update legend with counts (legend is separate in HTML)
  // Look for legend items in the parent container (pie-chart), not just the chart container
  const pieChartContainer = chartContainer.closest('.pie-chart') || chartContainer;
  
  let legendItems = pieChartContainer.querySelectorAll(".legend-item");
  
  // Try a more specific search for reports context
  if (context === 'reports') {
    const reportsPage = document.getElementById("reports-page");
    const reportsLegendItems = reportsPage.querySelectorAll(".legend-item");
    
    if (reportsLegendItems.length > 0) {
      // Use the reports legend items instead
      legendItems = reportsLegendItems;
    } else {
      // Create legend items dynamically if they don't exist
      let pieLegend = pieChartContainer.querySelector('.pie-legend');
      
      // Create pie-legend container if it doesn't exist
      if (!pieLegend) {
        pieLegend = document.createElement('div');
        pieLegend.className = 'pie-legend';
        pieChartContainer.appendChild(pieLegend);
      }
      
      if (pieLegend) {
        // Clear existing content
        pieLegend.innerHTML = '';
        
        // Create legend items
        const legendData = [
          { class: 'in-stock', text: 'In Stock' },
          { class: 'low-stock', text: 'Low Stock' },
          { class: 'out-stock', text: 'Out of Stock' },
          { class: 'discontinued', text: 'Discontinued' }
        ];
        
        legendData.forEach(data => {
          const legendItem = document.createElement('div');
          legendItem.className = 'legend-item';
          legendItem.innerHTML = `
            <span class="legend-color ${data.class}"></span>
            <span>${data.text}</span>
          `;
          pieLegend.appendChild(legendItem);
        });
        
        // Update legendItems to use the newly created ones
        legendItems = pieChartContainer.querySelectorAll(".legend-item");
      }
    }
  }
  
  legendItems.forEach((item, index) => {
      const spans = item.querySelectorAll("span");
      if (spans.length > 1) {
          const status = statusOrder[index];
          if (status) {
              const newText = `${status} (${stockData[status] || 0})`;
              spans[1].textContent = newText;
          }
      }
  });
  

}

// Dashboard stock chart (uses the universal function)
function renderStockChart() {
  renderStockChartUniversal("stockChart", "stockDonut", "dashboard");
}

// Helper function for polar to cartesian conversion (used by both stock charts)
function polarToCartesian(cx, cy, r, angle) {
    const rad = ((angle - 90) * Math.PI) / 180.0;
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}


function renderWeeklyChart(monthFilterId, yearFilterId, chartContainerId) {
    const monthFilter = document.getElementById(monthFilterId);
    const yearFilter = document.getElementById(yearFilterId);
    const chartContainer = document.getElementById(chartContainerId);
    
    if (!monthFilter || !yearFilter || !chartContainer) {
        console.log('Chart elements not found:', { monthFilterId, yearFilterId, chartContainerId });
        return;
    }
    
    const selectedMonth = parseInt(monthFilter.value);
    const selectedYear = parseInt(yearFilter.value);
    
    // Get orders for selected month/year
    const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate.getMonth() === selectedMonth && orderDate.getFullYear() === selectedYear;
    });
    
    // Group orders by week
    const weekData = [0, 0, 0, 0];
    
    monthOrders.forEach(order => {
        const orderDate = new Date(order.date);
        const dayOfMonth = orderDate.getDate();
        const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
        weekData[weekIndex]++;
    });
    
    // Clear and render
    chartContainer.innerHTML = '';
    
    const hasAnyData = weekData.some(week => week > 0);
    const maxValue = hasAnyData ? Math.max(...weekData) : 1;
    
    const weekBar = document.createElement('div');
    weekBar.className = 'week-bar';
    
    weekData.forEach((count, index) => {
        const weekItem = document.createElement('div');
        weekItem.className = 'week-bar-item';
        
        const column = document.createElement('div');
        column.className = 'week-bar-column';
        
        // Consistent height calculation
        let height;
        if (hasAnyData) {
            height = count === 0 ? 12 : Math.max((count / maxValue) * 60, 12);
        } else {
            height = 16;
        }
        
        column.style.height = `${height}px`;
        
        // Consistent styling
        if (count === 0 || !hasAnyData) {
            column.style.background = 'linear-gradient(180deg, #e8f4fd 0%, #d1e7f7 100%)';
            column.style.border = '1px solid #b3d9f2';
        } else {
            column.style.background = 'linear-gradient(180deg, #2196f3 0%, #1976d2 100%)';
            column.style.border = '1px solid #1565c0';
        }
        
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

function renderWeeklyOrderChart() {
    const chartContainer = document.getElementById("weeklyOrderChart");
    if (!chartContainer) {
        return;
    }

    chartContainer.innerHTML = "";
    // Use different variable name to avoid conflicts
    const reportsBarLabels = ["W1", "W2", "W3", "W4"];
    let weeks = [0, 0, 0, 0];

    if (Array.isArray(orders) && orders.length > 0) {
        const monthFilter = document.getElementById("monthFilter");
        const yearFilter = document.getElementById("yearFilter");

        const now = new Date();
          
          // Set default values if filters are empty
          if (monthFilter && monthFilter.value === "") {
              monthFilter.value = now.getMonth();
          }
          if (yearFilter && yearFilter.value === "") {
              yearFilter.value = now.getFullYear();
          }
          
        const selectedMonth = monthFilter && monthFilter.value !== "" 
            ? parseInt(monthFilter.value) 
            : now.getMonth();
        const selectedYear = yearFilter && yearFilter.value !== "" 
            ? parseInt(yearFilter.value) 
            : now.getFullYear();

        weeks = [0, 0, 0, 0];
        orders.forEach((order) => {
            if (!order.date) return;

            const date = new Date(order.date);
              if (date.getMonth() === selectedMonth && 
                  date.getFullYear() === selectedYear && 
                  order.status === "Completed") {
                const week = Math.min(Math.floor((date.getDate() - 1) / 7), 3);
                weeks[week]++;
            }
        });
    }

    // Check if all values are zero
    const hasAnyData = weeks.some((week) => week > 0);
    const max = hasAnyData ? Math.max(...weeks) : 1;

    const barChart = document.createElement("div");
    barChart.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        height: 160px;
        margin-top: 20px;
        width: 100%;
    `;

    for (let i = 0; i < 4; i++) {
        const barWrapper = document.createElement("div");
        barWrapper.style.cssText = `
            width: 22%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
        `;

        const valueLabel = document.createElement("span");
        valueLabel.style.cssText = `
            font-size: 1.1rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
        `;
        valueLabel.textContent = weeks[i];

        const bar = document.createElement("div");
        bar.style.width = "100%";

        // Consistent height calculation
        let barHeight;
        if (hasAnyData) {
            barHeight = weeks[i] === 0 ? 12 : Math.max((weeks[i] / max) * 120, 12);
        } else {
            barHeight = 16;
        }

        bar.style.height = barHeight + "px";

        // Consistent styling
        if (weeks[i] === 0 || !hasAnyData) {
            bar.style.background = "linear-gradient(180deg, #e8f4fd 0%, #d1e7f7 100%)";
            bar.style.border = "1px solid #b3d9f2";
        } else {
            bar.style.background = "linear-gradient(180deg, #2196f3 0%, #1976d2 100%)";
            bar.style.border = "1px solid #1565c0";
        }

        bar.style.borderRadius = "6px 6px 0 0";
        bar.style.boxSizing = "border-box";

        const barLabel = document.createElement("span");
        barLabel.style.cssText = `
            font-size: 0.9rem;
            color: #7f8c8d;
            margin-top: 8px;
            font-weight: 500;
        `;
        barLabel.textContent = reportsBarLabels[i];

        barWrapper.appendChild(valueLabel);
        barWrapper.appendChild(bar);
        barWrapper.appendChild(barLabel);
        barChart.appendChild(barWrapper);
    }

    chartContainer.appendChild(barChart);
}

// --- INVENTORY SUMMARY LOGIC ---
function updateInventoryReports() {
    // Total inventory value
  const totalValue = Array.isArray(inventory)
    ? inventory.reduce(
        (sum, part) =>
          sum + parseFloat(part.price || 0) * parseInt(part.quantity || 0),
        0
      )
    : 0;
  const totalValueEl = document.getElementById("reportTotalValue");
  if (totalValueEl)
    totalValueEl.textContent = `₱${totalValue.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    // Total parts
  const totalParts = Array.isArray(inventory)
    ? inventory.reduce((sum, part) => sum + parseInt(part.quantity || 0), 0)
    : 0;
  const totalPartsEl = document.getElementById("reportTotalParts");
    if (totalPartsEl) totalPartsEl.textContent = totalParts;
    // Categories
  const categoriesEl = document.getElementById("reportCategories");
    if (categoriesEl && Array.isArray(inventory)) {
    const uniqueCategories = new Set(
      inventory.map((part) => part.category || "Unknown")
    );
        categoriesEl.textContent = uniqueCategories.size;
    }
    // Bar chart: parts per category
    renderReportsCategoryChart();
}

// --- ORDER SUMMARY LOGIC ---
function updateOrderReports() {
    // Total orders
    const totalOrders = Array.isArray(orders) ? orders.length : 0;
  const totalOrdersEl = document.getElementById("reportTotalOrders");
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    // Pending, Cancelled, Completed
  let pending = 0,
    cancelled = 0,
    completed = 0,
    completedValue = 0;
    if (Array.isArray(orders)) {
    orders.forEach((order) => {
      if (order.status === "Pending") pending++;
      else if (order.status === "Cancelled") cancelled++;
      else if (order.status === "Completed") {
                completed++;
                // Find part price by partId or partName
                let part = null;
                if (Array.isArray(inventory)) {
          part = inventory.find(
            (p) =>
              (p.partId && order.partId && p.partId == order.partId) ||
              (p.name && order.partName && p.name == order.partName)
          );
        }
        completedValue +=
          (part ? parseFloat(part.price || 0) : 0) *
          parseInt(order.quantity || 0);
            }
        });
    }
    // Update DOM
  const pendingEl = document.getElementById("reportPendingOrders");
    if (pendingEl) pendingEl.textContent = pending;
  const cancelledEl = document.getElementById("reportCancelledOrders");
    if (cancelledEl) cancelledEl.textContent = cancelled;
  const completedEl = document.getElementById("reportCompletedOrders");
    if (completedEl) completedEl.textContent = completed;
  const completedValueEl = document.getElementById("reportCompletedValue");
  if (completedValueEl)
    completedValueEl.textContent = `₱${completedValue.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    // Add click handlers for popups
  if (pendingEl) pendingEl.onclick = () => showOrderDetailsPopup("Pending");
  if (cancelledEl)
    cancelledEl.onclick = () => showOrderDetailsPopup("Cancelled");
  if (completedEl)
    completedEl.onclick = () => showOrderDetailsPopup("Completed");
    // Bar chart: orders per week
    renderWeeklyOrderChart();
}

function updateStockLevelReports() {
  let out = 0, low = 0, inStock = 0, discontinued = 0;
  
  if (Array.isArray(inventory)) {
      inventory.forEach((part) => {
          if (part.status === "Discontinued") discontinued++;
          else if (parseInt(part.quantity || 0) === 0) out++;
          else if (
              parseInt(part.quantity || 0) > 0 &&
              parseInt(part.quantity || 0) <= parseInt(part.alertThreshold || 0)
          )
              low++;
          else if (
              parseInt(part.quantity || 0) > parseInt(part.alertThreshold || 0)
          )
              inStock++;
      });
  }
  
  // Update DOM counts
  const outStockCountEl = document.getElementById("outStockCount");
  if (outStockCountEl) outStockCountEl.textContent = out;
  
  const lowStockCountEl = document.getElementById("lowStockCount");
  if (lowStockCountEl) lowStockCountEl.textContent = low;
  
  const inStockCountEl = document.getElementById("inStockCount");
  if (inStockCountEl) inStockCountEl.textContent = inStock;
  
  const discontinuedCountEl = document.getElementById("discontinuedCount");
  if (discontinuedCountEl) discontinuedCountEl.textContent = discontinued;
  
}

// --- POPUP LOGIC FOR ORDER DETAILS ---
function showOrderDetailsPopup(status) {
  const modal = document.getElementById("detailsModal");
  const modalTitle = document.getElementById("detailsModalTitle");
  const modalBody = document.getElementById("detailsTableContainer");
    if (!modal || !modalTitle || !modalBody) return;
    modalTitle.textContent = `${status} Orders`;
  const filtered = Array.isArray(orders)
    ? orders.filter((order) => order.status === status)
    : [];
    if (filtered.length === 0) {
        modalBody.innerHTML = `<div style="text-align:center;padding:40px;"><div style="color:#27ae60;font-size:2.5rem;">✔️</div><div style="margin-top:10px;color:#7f8c8d;">No ${status.toLowerCase()} orders found!</div></div>`;
    } else {
        let html = `<table style="width:100%;border-collapse:collapse;"><thead><tr><th style='text-align:left;padding:8px;'>Order ID</th><th style='text-align:left;padding:8px;'>Part</th><th style='text-align:left;padding:8px;'>Quantity</th><th style='text-align:left;padding:8px;'>Date</th></tr></thead><tbody>`;
    filtered.forEach((order) => {
      html += `<tr><td style='padding:8px;'>${
        order.orderId || order.id || ""
      }</td><td style='padding:8px;'>${
        order.partName || order.partId || ""
      }</td><td style='padding:8px;'>${
        order.quantity || 0
      }</td><td style='padding:8px;'>${order.created_at || ""}</td></tr>`;
    });
    html += "</tbody></table>";
        modalBody.innerHTML = html;
    }
  modal.style.display = "block";
}

// --- WEEKLY ORDERS BAR CHART ---
function renderDashboardWeeklyOrderChart() {
    const chartContainer = document.getElementById("dashboardWeeklyOrderChart");
    if (!chartContainer) {
        return;
    }

    chartContainer.innerHTML = "";
    // Use different variable name to avoid conflicts
    const dashboardBarLabels = ["W1", "W2", "W3", "W4"];
    let weeks = [0, 0, 0, 0];

    if (Array.isArray(orders) && orders.length > 0) {
        const monthFilter = document.getElementById("dashboardMonthFilter");
        const yearFilter = document.getElementById("dashboardYearFilter");

        const now = new Date();
          
          // Set default values if filters are empty
          if (monthFilter && monthFilter.value === "") {
              monthFilter.value = now.getMonth();
          }
          if (yearFilter && yearFilter.value === "") {
              yearFilter.value = now.getFullYear();
          }
          
        const selectedMonth = monthFilter && monthFilter.value !== "" 
            ? parseInt(monthFilter.value) 
            : now.getMonth();
        const selectedYear = yearFilter && yearFilter.value !== "" 
            ? parseInt(yearFilter.value) 
            : now.getFullYear();

        weeks = [0, 0, 0, 0];
        orders.forEach((order) => {
            if (!order.date) return;

            const date = new Date(order.date);
              if (date.getMonth() === selectedMonth && 
                  date.getFullYear() === selectedYear && 
                  order.status === "Completed") {
                const week = Math.min(Math.floor((date.getDate() - 1) / 7), 3);
                weeks[week]++;
            }
        });
    }

    // Check if all values are zero
    const hasAnyData = weeks.some((week) => week > 0);
    const max = hasAnyData ? Math.max(...weeks) : 1;

    const barChart = document.createElement("div");
    barChart.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        height: 160px;
        margin-top: 20px;
        width: 100%;
    `;

    for (let i = 0; i < 4; i++) {
        const barWrapper = document.createElement("div");
        barWrapper.style.cssText = `
            width: 22%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
        `;

        // Number at the top
        const valueLabel = document.createElement("span");
        valueLabel.style.cssText = `
            font-size: 1.1rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
        `;
        valueLabel.textContent = weeks[i];

        // Bar
        const bar = document.createElement("div");
        bar.style.width = "100%";

        // Consistent height calculation
        let barHeight;
        if (hasAnyData) {
            barHeight = weeks[i] === 0 ? 12 : Math.max((weeks[i] / max) * 120, 12);
        } else {
            barHeight = 16;
        }

        bar.style.height = barHeight + "px";

        // Consistent styling
        if (weeks[i] === 0 || !hasAnyData) {
            bar.style.background = "linear-gradient(180deg, #e8f4fd 0%, #d1e7f7 100%)";
            bar.style.border = "1px solid #b3d9f2";
        } else {
            bar.style.background = "linear-gradient(180deg, #2196f3 0%, #1976d2 100%)";
            bar.style.border = "1px solid #1565c0";
        }

        bar.style.borderRadius = "6px 6px 0 0";
        bar.style.boxSizing = "border-box";

        // Week label at the bottom
        const barLabel = document.createElement("span");
        barLabel.style.cssText = `
            font-size: 0.9rem;
            color: #7f8c8d;
            margin-top: 8px;
            font-weight: 500;
        `;
        barLabel.textContent = dashboardBarLabels[i];

        barWrapper.appendChild(valueLabel);
        barWrapper.appendChild(bar);
        barWrapper.appendChild(barLabel);
        barChart.appendChild(barWrapper);
    }

    chartContainer.appendChild(barChart);
}

  // Add event listeners for dashboard filters
  function setupDashboardWeeklyOrderChartListeners() {
    const monthFilter = document.getElementById("dashboardMonthFilter");
    const yearFilter = document.getElementById("dashboardYearFilter");

    if (monthFilter) {
        monthFilter.removeEventListener("change", renderDashboardWeeklyOrderChart); // Remove existing listener
      monthFilter.addEventListener("change", renderDashboardWeeklyOrderChart);
    }

    if (yearFilter) {
      yearFilter.removeEventListener("change", renderDashboardWeeklyOrderChart); // Remove existing listener
      yearFilter.addEventListener("change", renderDashboardWeeklyOrderChart);
    }
  }

  // In confirmDeletePart, ensure it calls deletePart with categoryId
  function confirmDeletePart(categoryId) {
      const part = inventory.find((p) => p.categoryId === categoryId);
    if (!part) {
        showToast("Part not found", "error");
      return;
    }

      confirmDelete('part', categoryId, part.name, deletePart);
    }

  // 1. Fetch parts from backend (XAMPP MySQL)
  async function fetchPartsFromDB() {
    return await apiCall("/parts");
  }

  // 2. Populate dropdown with live data
  async function populateOrderPartDropdown() {
    const partDropdown = document.getElementById("orderPart");
    const categoryDropdown = document.getElementById("orderCategory");
    if (!partDropdown) return;
    const parts = await fetchPartsFromDB();
      // Parts from DB loaded
    partDropdown.innerHTML = '<option value="">Select Part</option>';
    parts.forEach((part) => {
      partDropdown.innerHTML += `<option value="${part.categoryId}">${part.name} (Available: ${part.quantity})</option>`;
    });
    partDropdown.addEventListener("change", function () {
      const selectedPart = parts.find((p) => p.categoryId === this.value);
      if (selectedPart && categoryDropdown) {
        categoryDropdown.value = selectedPart.category;
      }
    });
    window.latestPartsFromDB = parts;
  }

  // Generate next order ID from DB
  async function generateNextOrderId() {
    const orders = await apiCall("/orders");
    let maxNum = 0;
    orders.forEach((order) => {
      const match = order.orderId && order.orderId.match(/ORD(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `ORD${String(maxNum + 1).padStart(3, "0")}`;
  }

  // 4. In openAddOrderModal, call await populateOrderPartDropdown() and set orderId/date
  async function openAddOrderModal() {

    // 1. CRITICAL: Reset all edit state
    currentEditOrderId = null;
    currentOrderCategories = [];

    // 2. Reset modal title to "Add New Order"
    const orderModalTitle = document.getElementById("orderModalTitle");
    if (orderModalTitle) orderModalTitle.textContent = "Add New Order";

    // 3. Hide status field (only show for editing existing orders)
    const orderStatusGroup = document.getElementById("orderStatusGroup");
    if (orderStatusGroup) orderStatusGroup.style.display = "none";

    // 4. Reset the entire form first
    const orderForm = document.getElementById("orderForm");
    if (orderForm) orderForm.reset();

    // 5. Set fresh values for new order
    const orderIdElement = document.getElementById("orderId");
    if (orderIdElement) orderIdElement.value = await generateNextOrderId();

    const orderDateElement = document.getElementById("orderDate");
    if (orderDateElement)
      orderDateElement.value = new Date().toISOString().split("T")[0];

    // 6. Explicitly clear all form fields
    const orderStatusElement = document.getElementById("orderStatus");
    if (orderStatusElement) orderStatusElement.value = "Pending";

    const orderCategoryElement = document.getElementById("orderCategory");
    if (orderCategoryElement) orderCategoryElement.value = "";

    const orderPartElement = document.getElementById("orderPart");
    if (orderPartElement) orderPartElement.value = "";

    const orderQuantityElement = document.getElementById("orderQuantity");
    if (orderQuantityElement) orderQuantityElement.value = "";

    // 7. Hide and reset inline category form
    const categoryFormContainer = document.getElementById(
      "categoryFormContainer"
    );
    if (categoryFormContainer) {
      categoryFormContainer.style.display = "none";

      // Reset inline form fields
      const inlineCategorySelect = document.getElementById(
        "inlineCategorySelect"
      );
      const inlineCategoryPart = document.getElementById("inlineCategoryPart");
      const inlineCategoryQuantity = document.getElementById(
        "inlineCategoryQuantity"
      );

      if (inlineCategorySelect) inlineCategorySelect.value = "";
      if (inlineCategoryPart) {
        inlineCategoryPart.innerHTML =
          '<option value="">Select Category First</option>';
        inlineCategoryPart.disabled = true;
      }
      if (inlineCategoryQuantity) inlineCategoryQuantity.value = "";

      // Reset the toggle button
      const toggleButton = document.querySelector(
        '[onclick="toggleCategoryForm()"]'
      );
      if (toggleButton) {
        toggleButton.textContent = "ADD CATEGORY";
        toggleButton.style.background = "#2c3e50";
      }
    }

    // 8. Populate fresh dropdown data
    await populateOrderPartDropdown();

    // 9. Clear the categories list and show empty state
    updateCategoriesList();

    // 10. Show the modal
    document.getElementById("orderModal").style.display = "block";

      // New order modal opened
}
// ... existing code ...

  // ... existing code ...
  // Example fix for partDropdown usage:
  function handleAddPartToOrder() {
    const partDropdown = document.getElementById("orderPart");
    if (!partDropdown) {
      showToast("Part dropdown not found", "error");
      return;
    }
    const partId = partDropdown.value;
    const parts = window.latestPartsFromDB || [];
    const part = parts.find((p) => p.categoryId == partId);
    const categorySelect = document.getElementById("orderCategory");
    const quantityInput = document.getElementById("orderQuantity");
    const category = categorySelect.value;
    const quantity = parseInt(quantityInput.value, 10);
    if (!category) {
      showToast("Please select a category first", "error");
      return;
    }
    if (!partId) {
      showToast("Please select a part", "error");
      return;
    }
    if (isNaN(quantity) || quantity <= 0) {
      showToast("Please enter a valid quantity", "error");
      return;
    }
    if (!part) {
      showToast("Selected part not found", "error");
      return;
    }
    if (quantity > part.quantity) {
      showToast(
        `Cannot add: Requested quantity (${quantity}) exceeds available stock (${part.quantity})`,
        "error"
      );
      return;
    }
    if (currentOrderCategories.some((cat) => cat.partId === partId)) {
      showToast("This part is already added to the order", "error");
      return;
    }
    currentOrderCategories.push({
      id: generateId(),
      partId: part.categoryId,
      partName: part.name,
      category: part.category,
      quantity: quantity,
      price: part.price,
      maxStock: part.quantity,
    });
    updateCategoriesList();
    showToast("Part added to cart!", "success");
}

  

// Handle edit button click from HTML onclick
function handleEditClick(button) {
  // Find the order row
  const row = button.closest('tr');
  if (!row) {
    return;
  }
  
  // Get the order ID from the row
  const orderIdElement = row.querySelector('.order-id');
  if (!orderIdElement) {
    return;
  }
  
  const orderId = orderIdElement.textContent;
  
  // Call the edit function
  editOrder(orderId);
}

// Handle delete button click from HTML onclick
function handleDeleteClick(button) {
  // Find the order row
  const row = button.closest('tr');
  if (!row) {
    return;
  }
  
  // Get the order ID from the row
  const orderIdElement = row.querySelector('.order-id');
  if (!orderIdElement) {
    return;
  }
  
  const orderId = orderIdElement.textContent;
  
  // Call the delete confirmation function
  confirmDeleteOrder(orderId);
}

function cleanupCharts() {
  // Clear dashboard charts when switching away
  const stockDonut = document.getElementById("stockDonut");
  if (stockDonut) stockDonut.innerHTML = "";
  
  // Clear reports charts when switching away  
  const reportsStock = document.getElementById("reportsStockChart");
  if (reportsStock) reportsStock.innerHTML = "";
}

function refreshPageData(page) {
  // Clean up previous charts to prevent conflicts
  if (page !== 'dashboard') cleanupCharts();
  
  switch (page) {
      case "dashboard":
          updateDashboard();
          break;
      case "inventory":
          displayInventoryTable();
          break;
      case "orders":
          displayOrdersTable();
          break;
      case "activity":
          displayActivityHistory();
          break;
      case "reports":
          updateReports();
          break;
  }
}

  // Universal weekly chart renderer - replaces duplicate functions
  function renderWeeklyChartUniversal(monthFilterId, yearFilterId, chartContainerId, context = 'reports') {
      const monthFilter = document.getElementById(monthFilterId);
      const yearFilter = document.getElementById(yearFilterId);
      const chartContainer = document.getElementById(chartContainerId);
      
      if (!monthFilter || !yearFilter || !chartContainer) {
          return;
      }
      
      // Default to current month/year if no filter is set
      const now = new Date();
      const selectedMonth = monthFilter.value !== "" 
          ? parseInt(monthFilter.value) 
          : now.getMonth();
      const selectedYear = yearFilter.value !== "" 
          ? parseInt(yearFilter.value) 
          : now.getFullYear();
      
      // Get completed orders for selected month/year
      const monthOrders = orders.filter(order => {
          const orderDate = new Date(order.date);
          return orderDate.getMonth() === selectedMonth && 
                 orderDate.getFullYear() === selectedYear && 
                 order.status === "Completed";
      });
      
      // Group orders by week
      const weekData = [0, 0, 0, 0];
      
      monthOrders.forEach(order => {
          const orderDate = new Date(order.date);
          const dayOfMonth = orderDate.getDate();
          const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
          weekData[weekIndex]++;
      });
      
      // Clear and render
      chartContainer.innerHTML = '';
      
      const hasAnyData = weekData.some(week => week > 0);
      const maxValue = hasAnyData ? Math.max(...weekData) : 1;
      
      const weekBar = document.createElement('div');
      weekBar.className = 'week-bar';
      
      weekData.forEach((count, index) => {
          const weekItem = document.createElement('div');
          weekItem.className = 'week-bar-item';
          
          const column = document.createElement('div');
          column.className = 'week-bar-column';
          
          // Consistent height calculation
          let height;
          if (hasAnyData) {
              height = count === 0 ? 12 : Math.max((count / maxValue) * 60, 12);
          } else {
              height = 16;
          }
          
          column.style.height = `${height}px`;
          
          // Consistent styling
          if (count === 0 || !hasAnyData) {
              column.style.background = 'linear-gradient(180deg, #e8f4fd 0%, #d1e7f7 100%)';
              column.style.border = '1px solid #b3d9f2';
          } else {
              column.style.background = 'linear-gradient(180deg, #2196f3 0%, #1976d2 100%)';
              column.style.border = '1px solid #1565c0';
          }
          
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

  // Updated functions to use the universal renderer
  function renderWeeklyChart(monthFilterId, yearFilterId, chartContainerId) {
      renderWeeklyChartUniversal(monthFilterId, yearFilterId, chartContainerId, 'reports');
  }

  function renderWeeklyOrderChart() {
      renderWeeklyChartUniversal("monthFilter", "yearFilter", "weeklyOrderChart", 'reports');
  }

  function renderDashboardWeeklyOrderChart() {
      renderWeeklyChartUniversal("dashboardMonthFilter", "dashboardYearFilter", "dashboardWeeklyOrderChart", 'dashboard');
}

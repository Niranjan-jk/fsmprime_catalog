document.addEventListener('DOMContentLoaded', async () => {
    // Store product data and quantities
    let productData = {};
    const quantities = {};
    const categoryTotals = {};
    let currentCategory = '';
    let selectedProducts = new Set();
    let currentCategoryProducts = [];
      
    // Test query with proper error handling
    console.log("Running test query...");
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1);
    
    console.log("Query completed. Results:", {
      data: data ? "Received data" : "NO DATA",
      error: error || "No error"
    });
    
    if (error) {
      console.error("Detailed Supabase error:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
    }

    // Wait for supabase to be available
    function ensureSupabase() {
      return new Promise((resolve) => {
        if (window.supabase) {
          resolve(window.supabase);
        } else {
          const checkInterval = setInterval(() => {
            if (window.supabase) {
              clearInterval(checkInterval);
              resolve(window.supabase);
            }
          }, 100);
        }
      });
    }
    
    // Custom notification system
    function showNotification(message, type = 'success') {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `
        <div class="notification-content">
          <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
          <span>${message}</span>
        </div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);
      
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }
    
    async function fetchCategories() {
      try {
        console.log('Starting to fetch categories...');
        await ensureSupabase();
        console.log('Supabase client confirmed available');
        
        const { data, error } = await window.supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });
    
        console.log('Categories query completed', { data, error });
    
        if (error) {
          console.error('Supabase categories error:', error);
          throw error;
        }
    
        console.log('Categories fetched successfully:', data);
        return data;
    
      } catch (error) {
        console.error('Error in fetchCategories:', error);
        showNotification('Failed to load categories', 'error');
        throw error;
      }
    }
    
    async function fetchProductsByCategory(category) {
      try {
        console.log(`Fetching products for category: ${category}`);
    
        // First get the category ID
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .eq('name', category)
          .single();
    
        if (categoryError || !categoryData) {
          console.error('Error finding category:', categoryError || 'Category not found');
          throw categoryError || new Error('Category not found');
        }
    
        // Then get products for this category
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, weight, image_url')
          .eq('category_id', categoryData.id);
    
        if (productsError) {
          console.error('Supabase products error:', productsError);
          throw productsError;
        }
    
        console.log(`Products for ${category}:`, productsData);
    
        return productsData.map(item => ({
          id: item.id,
          'Product Name': item.name,
          'Price': item.price.toString(),
          'Weight/Volume': item.weight,
          'Product Image URL': item.image_url || 'https://via.placeholder.com/200',
          'Description': `Premium quality ${item.name.split(' ')[0]} with exquisite taste.`
        }));
    
      } catch (error) {
        console.error('Error in fetchProductsByCategory:', error);
        showNotification(`Failed to load ${category} products`, 'error');
        throw error;
      }
    }
    
    async function addProduct(product) {
      try {
        // Show loading state
        const submitBtn = document.getElementById('submitProduct');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    
        // Get category ID
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .eq('name', product.category)
          .single();
    
        if (categoryError || !categoryData) {
          throw categoryError || new Error('Category not found');
        }
    
        const { error } = await supabase
          .from('products')
          .insert([{
            name: product.product_name,
            price: parseFloat(product.price),
            weight: product.weight_volume,
            image_url: product.product_image_url || '',
            category_id: categoryData.id
          }]);
    
        if (error) throw error;
    
        showNotification('Product added successfully!', 'success');
        await renderCategories();
        
        // Close modal and reset form
        document.getElementById('addProductModal').classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('addProductForm').reset();
        
      } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Failed to add product: ' + error.message, 'error');
      } finally {
        const submitBtn = document.getElementById('submitProduct');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Product';
      }
    }
    
    async function deleteSelectedProducts() {
      if (selectedProducts.size === 0) {
        showNotification('Please select products to delete', 'warning');
        return;
      }
    
      if (!confirm(`Are you sure you want to delete ${selectedProducts.size} product(s)?`)) {
        return;
      }
    
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', Array.from(selectedProducts));
    
        if (error) throw error;
    
        showNotification(`${selectedProducts.size} product(s) deleted successfully!`, 'success');
        selectedProducts.clear();
        document.getElementById('selectAllCheckbox').checked = false;
        await renderCategories();
      } catch (error) {
        console.error('Error deleting products:', error);
        showNotification('Failed to delete products: ' + error.message, 'error');
      }
    }

    async function renderCategories() {
      try {
        console.log('[1] Starting renderCategories');
        
        await ensureSupabase();
        console.log('[2] Supabase connection verified');
    
        const categoriesGrid = document.getElementById('categoriesGrid');
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        
        console.log('[3] DOM elements:', {
          categoriesGridExists: !!categoriesGrid,
          loadingExists: !!loading,
          errorExists: !!error
        });
    
        categoriesGrid.innerHTML = '';
        loading.style.display = 'block';
        error.style.display = 'none';
        console.log('[4] Reset UI elements');
    
        const categories = await fetchCategories();
        console.log('[5] Fetched categories:', categories);
    
        loading.style.display = 'none';
        
        if (!categories || categories.length === 0) {
          console.warn('[6] No categories found');
          error.textContent = 'No categories found. Add products to display categories.';
          error.style.display = 'block';
          return;
        }
    
        console.log('[7] Processing categories...');
        for (const [index, category] of categories.entries()) {
          console.log(`[7.${index}] Processing category: ${category.name}`);
          
          const products = await fetchProductsByCategory(category.name);
          console.log(`[7.${index}.1] Products for ${category.name}:`, products);
          
          productData[category.name] = products;
    
          const categoryCard = document.createElement('div');
          categoryCard.className = 'category-card';
          categoryCard.onclick = () => showProducts(category.name);
          categoryCard.innerHTML = `
            <h2>${category.name}</h2>
            <div class="product-count">${products.length} products</div>
            <div class="category-total" id="categoryTotal-${category.name.replace(/ /g, '-')}">Total: ₹0</div>
          `;
          
          console.log(`[7.${index}.2] Created card for ${category.name}`);
          categoriesGrid.appendChild(categoryCard);
          console.log(`[7.${index}.3] Appended card to DOM`);
        }
    
        console.log('[8] Initializing quantities');
        initializeQuantities();
        console.log('[9] Render completed successfully');
    
        // Debug: Verify DOM actually contains cards
        console.log('[10] Current categoriesGrid children:', 
          categoriesGrid.children.length, 
          Array.from(categoriesGrid.children).map(el => el.outerHTML.slice(0, 50) + '...'
        ))
    
      } catch (err) {
        console.error('[ERROR] In renderCategories:', {
          error: err,
          message: err.message,
          stack: err.stack
        });
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').textContent = 'Failed to load categories: ' + err.message;
        document.getElementById('error').style.display = 'block';
      }
    }
    
    function initializeQuantities() {
      for (const category in productData) {
        quantities[category] = {};
        categoryTotals[category] = 0;
        
        productData[category].forEach(product => {
          quantities[category][product['Product Name']] = 0;
        });
      }
    }
    
    function showProducts(category) {
        // Reset products view first
        const productsView = document.getElementById('productsView');
        productsView.style.opacity = '0';
        productsView.style.transform = 'translateY(20px)';
        
        // Clear previous content immediately
        const productsGrid = document.getElementById('productsGrid');
        productsGrid.innerHTML = '';
        
        // Update current category
        currentCategory = category;
        
        // After a brief delay, load new products
        setTimeout(() => {
            // Set up the UI
            const categoriesView = document.getElementById('categoriesView');
            const categoryTitle = document.getElementById('categoryTitle');
            const bulkQuantitySelector = document.getElementById('bulkQuantitySelector');
            
            categoryTitle.textContent = category;
            bulkQuantitySelector.style.display = 'flex';
            
            // Reset selection when changing category
            selectedProducts.clear();
            
            // Bulk quantity selector setup
            bulkQuantitySelector.innerHTML = `
                <span class="bulk-quantity-label">Apply quantity to all products:</span>
                <input type="number" min="0" value="0" class="bulk-quantity-input" id="bulkQuantityInput">
                <button class="apply-bulk-btn" id="applyBulkBtn">Apply</button>
                <button class="delete-selected-btn" id="deleteSelectedBtn">
                    <i class="fas fa-trash"></i> Delete Selected
                </button>
                <label class="select-all-checkbox">
                    <input type="checkbox" id="selectAllCheckbox">
                    <span class="custom-checkbox"></span>
                    Select All
                </label>
            `;
    
            // Add fresh event listeners
            const applyBtn = document.getElementById('applyBulkBtn');
            applyBtn.replaceWith(applyBtn.cloneNode(true)); // Remove old listeners
            document.getElementById('applyBulkBtn').addEventListener('click', applyBulkQuantity);
            
            const deleteBtn = document.getElementById('deleteSelectedBtn');
            deleteBtn.replaceWith(deleteBtn.cloneNode(true));
            document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedProducts);
            
            const selectAll = document.getElementById('selectAllCheckbox');
            selectAll.replaceWith(selectAll.cloneNode(true));
            document.getElementById('selectAllCheckbox').addEventListener('change', function(e) {
                const checkboxes = document.querySelectorAll('.product-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                    const productId = checkbox.dataset.productId;
                    if (checkbox.checked) {
                        selectedProducts.add(productId);
                    } else {
                        selectedProducts.delete(productId);
                    }
                });
            });
    
            // Load and display products
            const products = productData[category];
            currentCategoryProducts = products;
            
            if (!products || products.length === 0) {
                productsGrid.innerHTML = '<div class="error">No products found in this category</div>';
            } else {
                products.forEach((product, index) => {
                    const productId = product.id;
                    const cleanPrice = product['Price'].replace(/₹/g, '').trim();
                    const price = parseFloat(cleanPrice);
                    const productCardId = `${category.replace(/ /g, '-')}-${index}`;
                    
                    const productCard = document.createElement('div');
                    productCard.className = 'product-card';
                    productCard.innerHTML = `
                        <label class="product-checkbox-container">
                            <input type="checkbox" class="product-checkbox" data-product-id="${productId}">
                            <span class="custom-checkbox"></span>
                        </label>
                        <img src="${product['Product Image URL']}" alt="${product['Product Name']}" class="product-image" onerror="this.src='https://via.placeholder.com/200';">
                        <div class="product-info">
                            <div class="product-name">${product['Product Name']}</div>
                            <div class="product-price" id="price-${productCardId}">${price.toFixed(2)}</div>
                            <div class="product-weight">${product['Weight/Volume']}</div>
                            <div class="quantity-selector">
                                <button class="quantity-btn minus" data-id="${productCardId}" data-price="${price}">-</button>
                                <input type="number" min="0" value="${quantities[category][product['Product Name']]}" class="quantity-input" id="quantity-${productCardId}">
                                <button class="quantity-btn plus" data-id="${productCardId}" data-price="${price}">+</button>
                            </div>
                        </div>
                    `;
                    
                    // Add event listeners to the new card
                    const checkbox = productCard.querySelector('.product-checkbox');
                    checkbox.addEventListener('change', function(e) {
                        if (e.target.checked) {
                            selectedProducts.add(productId);
                        } else {
                            selectedProducts.delete(productId);
                            document.getElementById('selectAllCheckbox').checked = false;
                        }
                    });
    
                    productCard.querySelector('.minus').addEventListener('click', (e) => {
                        updateQuantity(e.target.dataset.id, -1, parseFloat(e.target.dataset.price));
                    });
                    
                    productCard.querySelector('.plus').addEventListener('click', (e) => {
                        updateQuantity(e.target.dataset.id, 1, parseFloat(e.target.dataset.price));
                    });
                    
                    productCard.querySelector('.quantity-input').addEventListener('change', (e) => {
                        const newQuantity = parseInt(e.target.value) || 0;
                        const productId = e.target.id.replace('quantity-', '');
                        const price = parseFloat(document.getElementById(`price-${productId}`).textContent.replace(/₹/g, ''));
                        setQuantity(productId, newQuantity, price);
                    });
                    
                    productCard.addEventListener('click', (e) => {
                        if (!e.target.closest('.quantity-selector') && !e.target.closest('.product-checkbox-container')) {
                            showProductModal(product, category, price);
                        }
                    });
                    
                    productsGrid.appendChild(productCard);
                });
            }
            
            // Show the products view with animation
            categoriesView.style.display = 'none';
            productsView.style.display = 'block';
            setTimeout(() => {
                productsView.style.opacity = '1';
                productsView.style.transform = 'translateY(0)';
            }, 10);
            
            updateCategoryTotal(category);
        }, 50); // Small delay to allow CSS transitions
    }
    
    function showProductModal(product, category, price) {
      const modal = document.getElementById('productModal');
      const modalContent = document.getElementById('modalContent');
      
      modalContent.innerHTML = `
        <div class="modal-images">
          <img src="${product['Product Image URL']}" alt="${product['Product Name']}" class="modal-main-image" onerror="this.src='https://via.placeholder.com/400';">
        </div>
        <div class="modal-details">
          <h1 class="modal-title">${product['Product Name']}</h1>
          <span class="modal-category">${category}</span>
          <div class="modal-price">${price.toFixed(2)}</div>
          <div class="modal-weight">${product['Weight/Volume']}</div>
          <p class="modal-description">${product['Description']}</p>
          <div class="modal-quantity">
            <span class="modal-quantity-label">Quantity:</span>
            <div class="quantity-selector">
              <button class="quantity-btn minus" id="modalMinus">-</button>
              <input type="number" min="0" value="${quantities[category][product['Product Name']]}" class="quantity-input" id="modalQuantity">
              <button class="quantity-btn plus" id="modalPlus">+</button>
            </div>
          </div>
        </div>
      `;
      
      document.getElementById('modalMinus').addEventListener('click', () => {
        const input = document.getElementById('modalQuantity');
        let newQuantity = (parseInt(input.value) || 0) - 1;
        newQuantity = Math.max(0, newQuantity);
        input.value = newQuantity;
        updateQuantityFromModal(product['Product Name'], category, newQuantity, price);
      });
      
      document.getElementById('modalPlus').addEventListener('click', () => {
        const input = document.getElementById('modalQuantity');
        let newQuantity = (parseInt(input.value) || 0) + 1;
        input.value = newQuantity;
        updateQuantityFromModal(product['Product Name'], category, newQuantity, price);
      });
      
      document.getElementById('modalQuantity').addEventListener('change', (e) => {
        const newQuantity = parseInt(e.target.value) || 0;
        updateQuantityFromModal(product['Product Name'], category, newQuantity, price);
      });
      
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    
    function updateQuantityFromModal(productName, category, quantity, price) {
      quantities[category][productName] = quantity;
      updateCategoryTotal(category);
      
      // Find and update the corresponding product card input
      const productCards = document.querySelectorAll('.product-card');
      productCards.forEach(card => {
        const productTitle = card.querySelector('.product-name');
        if (productTitle && productTitle.textContent === productName) {
          const input = card.querySelector('.quantity-input');
          if (input) {
            input.value = quantity;
          }
        }
      });
    }
    
    function updateQuantity(productId, change, price) {
      const input = document.getElementById(`quantity-${productId}`);
      if (!input) {
        console.error('Quantity input not found for:', productId);
        return;
      }
      
      let newQuantity = (parseInt(input.value) || 0) + change;
      newQuantity = Math.max(0, newQuantity);
      input.value = newQuantity;
      
      setQuantity(productId, newQuantity, price);
    }
    
    function setQuantity(productId, quantity, price) {
      try {
        const parts = productId.split('-');
        const category = parts.slice(0, -1).join(' ');
        const index = parseInt(parts[parts.length - 1]);
        
        if (!productData[category] || !productData[category][index]) {
          console.error('Invalid product reference:', {category, index});
          return false;
        }
        
        const productName = productData[category][index]['Product Name'];
        quantities[category][productName] = quantity;
        
        const quantityInput = document.getElementById(`quantity-${productId}`);
        if (quantityInput) {
          quantityInput.value = quantity;
        }
        
        updateCategoryTotal(category);
        return true;
      } catch (error) {
        console.error('Error in setQuantity:', error);
        return false;
      }
    }
    
    function applyBulkQuantity() {
        const bulkQuantity = parseInt(document.getElementById('bulkQuantityInput').value) || 0;
        console.log('Applying bulk quantity:', bulkQuantity);
        
        if (isNaN(bulkQuantity)) {  // Fixed: Added missing closing parenthesis
            showNotification('Please enter a valid quantity', 'warning');
            return;
        }
        
        const products = currentCategoryProducts;
        if (!products || products.length === 0) {
            console.error('No products to update');
            return;
        }
        
        products.forEach((product, index) => {
            const productCardId = `${currentCategory.replace(/ /g, '-')}-${index}`;
            const cleanPrice = product['Price'].replace(/₹/g, '').trim();
            const price = parseFloat(cleanPrice);
            
            // Update the quantities object
            quantities[currentCategory][product['Product Name']] = bulkQuantity;
            
            // Update the DOM input if it exists
            const input = document.getElementById(`quantity-${productCardId}`);
            if (input) {
                input.value = bulkQuantity;
            }
        });
        
        updateCategoryTotal(currentCategory);
        showNotification(`Applied quantity ${bulkQuantity} to all products`, 'success');
    }
    
    function updateCategoryTotal(category) {
      let total = 0;
      
      if (!quantities[category] || !productData[category]) {
        console.error('Invalid category reference:', category);
        return;
      }

      for (const product in quantities[category]) {
        const productObj = productData[category].find(p => p['Product Name'] === product);
        if (!productObj) continue;
        
        const cleanPrice = productObj['Price'].replace(/₹/g, '').trim();
        const price = parseFloat(cleanPrice);
        total += price * quantities[category][product];
      }
      
      categoryTotals[category] = total;
      const totalElement = document.getElementById(`categoryTotal-${category.replace(/ /g, '-')}`);
      if (totalElement) {
        totalElement.textContent = `Total: ₹${total.toFixed(2)}`;
      }
      updateSummary();
    }
    
    function updateSummary() {
      const categorySummaries = document.getElementById('categorySummaries');
      let grandTotal = 0;
      
      categorySummaries.innerHTML = '';
      
      for (const category in categoryTotals) {
        if (categoryTotals[category] > 0) {
          const summaryItem = document.createElement('div');
          summaryItem.className = 'category-summary';
          summaryItem.innerHTML = `
            <span class="category-summary-name">${category}</span>
            <span class="category-summary-total">₹${categoryTotals[category].toFixed(2)}</span>
          `;
          categorySummaries.appendChild(summaryItem);
          grandTotal += categoryTotals[category];
        }
      }
      
      document.getElementById('grandTotal').textContent = `₹${grandTotal.toFixed(2)}`;
    }
    
    function showCategories() {
        const categoriesView = document.getElementById('categoriesView');
        const productsView = document.getElementById('productsView');
        const bulkQuantitySelector = document.getElementById('bulkQuantitySelector');
        
        // Reset products view
        productsView.style.opacity = '0';
        productsView.style.transform = 'translateY(20px)';
        bulkQuantitySelector.style.display = 'none';
        
        setTimeout(() => {
            productsView.style.display = 'none';
            categoriesView.style.display = 'block';
            
            // Force reflow to ensure animation works
            void categoriesView.offsetWidth;
            
            categoriesView.style.opacity = '1';
            categoriesView.style.transform = 'translateY(0)';
        }, 300);
    }
    
    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', function() {
      document.body.classList.toggle('light-mode');
      const icon = this.querySelector('i');
      if (document.body.classList.contains('light-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
      } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
      }
    });
    
    // Add Product Modal
    document.getElementById('addProductBtn').addEventListener('click', () => {
      document.getElementById('addProductModal').classList.add('active');
      document.body.style.overflow = 'hidden';
    });
    
    document.getElementById('addProductModalClose').addEventListener('click', () => {
      document.getElementById('addProductModal').classList.remove('active');
      document.body.style.overflow = 'auto';
    });
    
    document.getElementById('addProductModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('addProductModal')) {
        document.getElementById('addProductModal').classList.remove('active');
        document.body.style.overflow = 'auto';
      }
    });
    
    document.getElementById('submitProduct').addEventListener('click', async () => {
      const product = {
        product_name: document.getElementById('addProductName').value.trim(),
        price: document.getElementById('addPrice').value,
        weight_volume: document.getElementById('addWeightVolume').value.trim(),
        product_image_url: document.getElementById('addImageUrl').value.trim(),
        category: document.getElementById('addCategory').value
      };
      
      if (!product.category || !product.product_name || !product.price || !product.weight_volume) {
        showNotification('Please fill in all required fields', 'warning');
        return;
      }
      
      await addProduct(product);
    });
    
    // Bulk Upload Modal
    document.getElementById('bulkUploadBtn').addEventListener('click', () => {
      document.getElementById('bulkUploadModal').classList.add('active');
      document.body.style.overflow = 'hidden';
    });
    
    document.getElementById('bulkUploadModalClose').addEventListener('click', () => {
      document.getElementById('bulkUploadModal').classList.remove('active');
      document.body.style.overflow = 'auto';
    });
    
    document.getElementById('bulkUploadModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('bulkUploadModal')) {
        document.getElementById('bulkUploadModal').classList.remove('active');
        document.body.style.overflow = 'auto';
      }
    });
    
    const dragDropArea = document.getElementById('dragDropArea');
    const fileInput = document.getElementById('bulkUploadFile');
    const submitBulkUpload = document.getElementById('submitBulkUpload');
    
    dragDropArea.addEventListener('click', () => {
      fileInput.click();
    });
    
    dragDropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dragDropArea.classList.add('drag-over');
    });
    
    dragDropArea.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragDropArea.classList.add('drag-over');
    });
    
    dragDropArea.addEventListener('dragleave', () => {
      dragDropArea.classList.remove('drag-over');
    });
    
    dragDropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDropArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        fileInput.files = e.dataTransfer.files;
        submitBulkUpload.disabled = false;
      }
    });
    
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        submitBulkUpload.disabled = false;
      } else {
        submitBulkUpload.disabled = true;
      }
    });
    
    submitBulkUpload.addEventListener('click', async () => {
      const file = fileInput.files[0];
      
      if (!file) {
        showNotification('Please select or drop a file.', 'warning');
        return;
      }
      
      try {
        submitBulkUpload.disabled = true;
        submitBulkUpload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        
        let products = [];
        if (file.type === 'text/csv') {
          const text = await file.text();
          const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
          const headers = rows[0];
          products = rows.slice(1).map(row => {
            const product = {};
            headers.forEach((header, index) => {
              product[header] = row[index] || '';
            });
            return product;
          });
        } else if (file.type === 'application/vnd.ms-excel' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          products = XLSX.utils.sheet_to_json(sheet);
        } else {
          throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
        }
    
        // Process products
        const validProducts = [];
        for (const product of products) {
          if (!product.category || !product.product_name || !product.price || !product.weight_volume) {
            continue;
          }
    
          // Get category ID
          const { data: categoryData } = await supabase
            .from('categories')
            .select('id')
            .eq('name', product.category)
            .single();
    
          if (!categoryData) {
            console.warn(`Category not found: ${product.category}`);
            continue;
          }
    
          validProducts.push({
            name: product.product_name,
            price: parseFloat(product.price),
            weight: product.weight_volume,
            image_url: product.product_image_url || '',
            category_id: categoryData.id
          });
        }
    
        if (validProducts.length === 0) {
          throw new Error('No valid products found in the file.');
        }
    
        const { error } = await supabase
          .from('products')
          .insert(validProducts);
    
        if (error) throw error;
    
        showNotification(`Successfully uploaded ${validProducts.length} products!`, 'success');
        await renderCategories();
        
      } catch (error) {
        console.error('Error uploading products:', error);
        showNotification('Failed to upload products: ' + error.message, 'error');
      } finally {
        document.getElementById('bulkUploadModal').classList.remove('active');
        document.body.style.overflow = 'auto';
        fileInput.value = '';
        submitBulkUpload.disabled = true;
        submitBulkUpload.textContent = 'Upload File';
      }
    });
    
    // Initialize the app
    async function initializeApp() {
      try {
        console.log('App initialization starting...');
        await ensureSupabase();
        console.log('Supabase client initialized:', window.supabase !== undefined);
    
        const { data: testData, error: testError } = await supabase
          .from('categories')
          .select('*')
          .limit(1);
        
        console.log('Test query results:', { testData, testError });
    
        if (testError) {
          throw testError;
        }
        
        // Populate category dropdown
        const { data: categories } = await supabase
          .from('categories')
          .select('name')
          .order('name', { ascending: true });
        console.log('Categories fetched for dropdown:', categories);
    
        const categorySelect = document.getElementById('addCategory');
        // Clear existing options except the first one
        while (categorySelect.options.length > 1) {
          categorySelect.remove(1);
        }
        
        categories.forEach(category => {
          const option = document.createElement('option');
          option.value = category.name;
          option.textContent = category.name;
          categorySelect.appendChild(option);
        });
        
        await renderCategories();
        
        // Setup modal event listeners
        document.getElementById('productModal').addEventListener('click', function(e) {
          if (e.target === document.getElementById('productModal')) {
            document.getElementById('productModal').classList.remove('active');
            document.body.style.overflow = 'auto';
          }
        });
        
        document.getElementById('modalClose').addEventListener('click', function() {
          document.getElementById('productModal').classList.remove('active');
          document.body.style.overflow = 'auto';
        });
        
        // Add back to categories button listener
        document.getElementById('backToCategoriesBtn').addEventListener('click', showCategories);
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').textContent = 'Failed to initialize application: ' + error.message;
        document.getElementById('error').style.display = 'block';
      }
    }
    
    // Start the application
    initializeApp();
});

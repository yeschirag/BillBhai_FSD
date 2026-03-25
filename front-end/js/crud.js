// crud.js — Product CRUD with localStorage + Form Validation

const DEFAULT_PRODUCTS = [
  { sku: 'SKU-01', name: 'Basmati Rice',  category: 'Grocery',   supplier: 'Agarwal Traders',  stock: 145, price: 380, status: 'In Stock'  },
  { sku: 'SKU-02', name: 'Toor Dal',      category: 'Grocery',   supplier: 'Sharma Wholesale',  stock: 230, price: 120, status: 'In Stock'  },
  { sku: 'SKU-03', name: 'Refined Oil',   category: 'Grocery',   supplier: 'Fortune Dist.',     stock: 18,  price: 155, status: 'Low Stock' },
  { sku: 'SKU-04', name: 'Whole Wheat',   category: 'Grocery',   supplier: 'Kissan Mills',      stock: 95,  price: 65,  status: 'In Stock'  },
  { sku: 'SKU-05', name: 'Sugar',         category: 'Grocery',   supplier: 'Local Supplier',    stock: 5,   price: 42,  status: 'Critical'  }
];

function loadProducts() {
  const stored = localStorage.getItem('products');
  if (stored) {
    try { return JSON.parse(stored); } catch(e) {}
  }
  // Seed default data on first use
  localStorage.setItem('products', JSON.stringify(DEFAULT_PRODUCTS));
  return DEFAULT_PRODUCTS.slice();
}

function saveProducts(arr) {
  localStorage.setItem('products', JSON.stringify(arr));
}

function addProduct(product) {
  const products = loadProducts();
  products.push(product);
  saveProducts(products);
  renderProducts();
  return products;
}

function deleteProduct(sku) {
  let products = loadProducts();
  products = products.filter(p => p.sku !== sku);
  saveProducts(products);
  renderProducts();
  return products;
}

function updateProduct(sku, updated) {
  const products = loadProducts();
  const idx = products.findIndex(p => p.sku === sku);
  if (idx !== -1) {
    products[idx] = { ...products[idx], ...updated };
    saveProducts(products);
  }
  renderProducts();
  return products;
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateProduct(name, price, stock) {
  // Empty check
  if (!name || name.trim() === '') {
    showValidationError('Product name is required');
    return false;
  }
  // Type + range check on price
  const p = parseFloat(price);
  if (isNaN(p) || p <= 0) {
    showValidationError('Price must be a number greater than 0');
    return false;
  }
  // Type + range check on stock
  const s = parseInt(stock, 10);
  if (isNaN(s) || s < 0) {
    showValidationError('Stock must be a non-negative number');
    return false;
  }
  return true;
}

function showValidationError(msg) {
  const errEl = document.getElementById('crudError');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
    setTimeout(() => { errEl.style.display = 'none'; }, 3500);
  } else {
    alert(msg);
  }
}

// ── Auto-determine stock status ───────────────────────────────────────────────
function getStockStatus(stock) {
  if (stock <= 0)  return 'Out of Stock';
  if (stock <= 5)  return 'Critical';
  if (stock <= 30) return 'Low Stock';
  return 'In Stock';
}

// ── Next SKU ─────────────────────────────────────────────────────────────────
function getNextSku() {
  const products = loadProducts();
  const nums = products.map(p => {
    const m = p.sku.match(/SKU-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return `SKU-${String(max + 1).padStart(2, '0')}`;
}

// ── Render products table ─────────────────────────────────────────────────────
function renderProducts() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  const products = loadProducts();

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No products available</td></tr>';
    return;
  }

  tbody.innerHTML = products.map((p, i) => {
    const statusClass = p.status === 'In Stock' ? 'b-active'
      : p.status === 'Low Stock' ? 'b-pending'
      : p.status === 'Critical' || p.status === 'Out of Stock' ? 'b-cancelled'
      : 'b-inactive';

    // Only show edit/delete if user has permission
    const user = getCurrentUser();
    const canEdit = user && (user.role === 'superuser' || user.role === 'admin');
    const actions = canEdit
      ? `<button class="crud-btn edit-btn" onclick="openEditProduct('${p.sku}')">Edit</button>
         <button class="crud-btn del-btn"  onclick="confirmDeleteProduct('${p.sku}')">Delete</button>`
      : `<span style="color:var(--text-muted);font-size:0.8rem;">View only</span>`;

    return `<tr>
      <td class="cell-main">${p.sku}</td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${p.supplier || '—'}</td>
      <td>${p.stock}</td>
      <td>₹${p.price}</td>
      <td><span class="badge ${statusClass}">${p.status}</span></td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
}

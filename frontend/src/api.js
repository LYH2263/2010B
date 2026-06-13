const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api';

function headers() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

export async function login(email, password) {
  const r = await fetch(BASE + '/login', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || '登录失败');
  }
  return r.json();
}

export async function logout() {
  const r = await fetch(BASE + '/logout', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getMe() {
  const r = await fetch(BASE + '/me', {
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) return null;
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getDashboard() {
  const r = await fetch(BASE + '/', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getProducts(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/products' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getProduct(id) {
  const r = await fetch(BASE + '/products/' + id, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createProduct(data) {
  const r = await fetch(BASE + '/products', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.status === 204 ? null : r.json();
}

export async function updateProduct(id, data) {
  const r = await fetch(BASE + '/products/' + id, {
    method: 'PUT',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'PUT' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.status === 204 ? null : r.json();
}

export async function deleteProduct(id) {
  const r = await fetch(BASE + '/products/' + id, {
    method: 'DELETE',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'DELETE' },
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
}

export async function getCategories(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/categories' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getCategoriesAll() {
  const data = await getCategories({ per_page: 100 });
  return Array.isArray(data) ? data : (data.data || []);
}

export async function createCategory(data) {
  const r = await fetch(BASE + '/categories', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function updateCategory(id, data) {
  const r = await fetch(BASE + '/categories/' + id, {
    method: 'PUT',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'PUT' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function deleteCategory(id) {
  const r = await fetch(BASE + '/categories/' + id, {
    method: 'DELETE',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'DELETE' },
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const text = await r.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      if (j && j.message) msg = j.message;
    } catch (_) {}
    throw new Error(msg);
  }
}

export async function getOrders(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/orders' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getOrder(id) {
  const r = await fetch(BASE + '/orders/' + id, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createOrder(data) {
  const r = await fetch(BASE + '/orders', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function updateOrderStatus(orderId, status) {
  const r = await fetch(BASE + '/orders/' + orderId + '/status', {
    method: 'PATCH',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getInventory(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/inventory' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function adjustInventory(productId, delta, reason = '') {
  const r = await fetch(BASE + '/inventory/' + productId + '/adjust', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ delta, reason }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getBestsellers(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/bestsellers' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getPoints(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/points' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getPointAccount(accountId, params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/points/' + accountId + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getPointAccountByUser(userId, params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/points/user/' + userId + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function adjustPoints(accountId, delta, reason) {
  const r = await fetch(BASE + '/points/' + accountId + '/adjust', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ delta, reason }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function adjustPointsByUser(userId, delta, reason) {
  const r = await fetch(BASE + '/points/user/' + userId + '/adjust', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ delta, reason }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getUsers(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/users' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getUsersAll() {
  const data = await getUsers({ per_page: 100 });
  return data.data ?? data ?? [];
}

export async function getProductsOnSale() {
  const r = await fetch(BASE + '/products?per_page=100', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  const data = await r.json();
  return data.data ?? data;
}

export async function getTags(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/tags' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getTagsAll(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/tags/all' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getTagsForSelect() {
  const r = await fetch(BASE + '/tags/for-select', { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createTag(data) {
  const r = await fetch(BASE + '/tags', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function findOrCreateTag(name, color) {
  const r = await fetch(BASE + '/tags/find-or-create', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ name, color }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function updateTag(id, data) {
  const r = await fetch(BASE + '/tags/' + id, {
    method: 'PUT',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'PUT' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function deleteTag(id) {
  const r = await fetch(BASE + '/tags/' + id, {
    method: 'DELETE',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'DELETE' },
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
}

export async function getPriceHistories(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/price-histories' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getPriceHistoriesByProduct(productId, params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/price-histories/product/' + productId + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getPriceChart(productId) {
  const r = await fetch(BASE + '/price-histories/chart/' + productId, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function previewPriceChange(data) {
  const r = await fetch(BASE + '/price-histories/preview', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function batchUpdatePrice(data) {
  const r = await fetch(BASE + '/price-histories/batch-update', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getShipments(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/shipments' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getShipment(id) {
  const r = await fetch(BASE + '/shipments/' + id, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createShipment(orderId, data) {
  const r = await fetch(BASE + '/shipments/order/' + orderId, {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function addShipmentTrack(shipmentId, data) {
  const r = await fetch(BASE + '/shipments/' + shipmentId + '/tracks', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function updateShipmentStatus(shipmentId, status) {
  const r = await fetch(BASE + '/shipments/' + shipmentId + '/status', {
    method: 'PATCH',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getShipmentByOrder(orderId) {
  const r = await fetch(BASE + '/shipments/order/' + orderId, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getPendingOrders(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/shipments/pending-orders' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function batchShip(items) {
  const r = await fetch(BASE + '/shipments/batch-ship', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ items }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function importTracking(logisticsCompany, mappings) {
  const r = await fetch(BASE + '/shipments/import-tracking', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ logistics_company: logisticsCompany, mappings }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getStockTakes(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/stock-takes' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getStockTake(id) {
  const r = await fetch(BASE + '/stock-takes/' + id, { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function createStockTake(data = {}) {
  const r = await fetch(BASE + '/stock-takes', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function updateStockTakeItem(stockTakeId, itemId, actualQuantity) {
  const r = await fetch(BASE + '/stock-takes/' + stockTakeId + '/items/' + itemId, {
    method: 'PATCH',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify({ actual_quantity: actualQuantity }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function completeStockTake(id) {
  const r = await fetch(BASE + '/stock-takes/' + id + '/complete', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function getTrashProducts(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/trash/products' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function getTrashCategories(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(BASE + '/trash/categories' + (q ? '?' + q : ''), { headers: headers(), credentials: 'include' });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(await r.text());
  }
  return r.json();
}

export async function restoreProduct(id) {
  const r = await fetch(BASE + '/trash/products/' + id + '/restore', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function restoreCategory(id) {
  const r = await fetch(BASE + '/trash/categories/' + id + '/restore', {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
  return r.json();
}

export async function forceDeleteProduct(id) {
  const r = await fetch(BASE + '/trash/products/' + id + '/force', {
    method: 'DELETE',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'DELETE' },
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
}

export async function forceDeleteCategory(id) {
  const r = await fetch(BASE + '/trash/categories/' + id + '/force', {
    method: 'DELETE',
    headers: { ...headers(), 'X-HTTP-Method-Override': 'DELETE' },
    credentials: 'include',
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || await r.text());
  }
}

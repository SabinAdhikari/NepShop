const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("nepshop-token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

export function getCategories() {
  return request("/categories");
}

export function getProducts(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  return request(`/products${query.toString() ? `?${query.toString()}` : ""}`);
}

export function getProduct(slug) {
  return request(`/products/${slug}`);
}

export function registerUser(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser() {
  return request("/auth/me");
}

export function getCart() {
  return request("/cart");
}

export function addCartItem(productId, quantity = 1) {
  return request("/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
}

export function updateCartItem(itemId, quantity) {
  return request(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(itemId) {
  return request(`/cart/items/${itemId}`, {
    method: "DELETE",
  });
}

export function clearCart() {
  return request("/cart", {
    method: "DELETE",
  });
}

export function createCheckout(payload) {
  return request("/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getOrders() {
  return request("/orders");
}

export function getOrder(orderId) {
  return request(`/orders/${orderId}`);
}

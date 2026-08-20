import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  addCartItem,
  createCheckout,
  getCart,
  getCategories,
  getCurrentUser,
  getOrder,
  getOrders,
  getProducts,
  loginUser,
  registerUser,
  removeCartItem,
  updateCartItem,
} from './services/api';

const heroSlides = [
  { image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1600&q=80', title: 'Fresh arrivals', subtitle: 'Style up to 60% off' },
  { image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1600&q=80', title: 'Weekend trends', subtitle: 'New looks for every mood' },
  { image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=80', title: 'Beauty essentials', subtitle: 'Glow more, spend less' },
  { image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1600&q=80', title: 'Smart shopping', subtitle: 'Free shipping over Rs. 1,000' },
];

const defaultCheckoutForm = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: 'Bagmati',
  postalCode: '44600',
  country: 'Nepal',
  paymentMethod: 'Cash on Delivery',
};

const fallbackImage = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80';

function formatProduct(product) {
  const primaryImage = product.images?.find((image) => image.isPrimary) || product.images?.[0];
  const originalPrice = product.discountPrice && product.discountPrice > product.price ? product.discountPrice : null;

  return {
    ...product,
    categoryName: product.category?.name || 'General',
    image: primaryImage?.url || fallbackImage,
    imageAlt: primaryImage?.altText || product.name,
    originalPrice,
    displayDescription: product.shortDescription || product.description,
    badge: product.featured ? 'Featured' : product.stock > 0 ? 'In stock' : 'Sold out',
  };
}

function formatCart(cart) {
  const items = cart.items.map((item) => ({
    ...formatProduct(item.product),
    cartItemId: item.id,
    id: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    price: item.unitPrice,
  }));

  return {
    items,
    subtotal: cart.subtotal,
    shipping: cart.shipping,
    total: cart.total,
  };
}

function getGuestCart() {
  try {
    return JSON.parse(localStorage.getItem('nepshop-cart') || '[]');
  } catch {
    return [];
  }
}

function saveGuestCart(cart) {
  localStorage.setItem('nepshop-cart', JSON.stringify(cart));
}

function calculateGuestCart(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal === 0 ? 0 : subtotal > 1000 ? 0 : 120;
  return { items, subtotal, shipping, total: subtotal + shipping };
}

function AuthForm({ mode, onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const auth = isRegister ? await registerUser(form) : await loginUser({ email: form.email, password: form.password });
      await onAuth(auth.token);
      navigate('/account');
    } catch (authError) {
      setError(authError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>{isRegister ? 'Create account' : 'Welcome back'}</h2>
        {error && <p className="form-error">{error}</p>}
        {isRegister && (
          <label>
            Full name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={6} required />
        </label>
        <button type="submit" className="primary-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
        </button>
        <p>
          {isRegister ? 'Already have an account?' : 'New to Nepshop?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Login' : 'Register'}</Link>
        </p>
      </form>
    </main>
  );
}

function ProtectedRoute({ user, authChecked, children }) {
  if (!authChecked) return <main className="auth-page"><div className="empty-state">Checking your session...</div></main>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AccountPage({ user }) {
  return (
    <main className="account-page">
      <section className="account-panel">
        <h2>Account</h2>
        <div className="account-grid">
          <div><span>Name</span><strong>{user.name}</strong></div>
          <div><span>Email</span><strong>{user.email}</strong></div>
          <div><span>Role</span><strong>{user.role}</strong></div>
        </div>
        <Link className="primary-btn account-link" to="/orders">View orders</Link>
      </section>
    </main>
  );
}

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getOrders()
      .then((data) => setOrders(data.items))
      .catch((orderError) => setError(orderError.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="account-page">
      <section className="account-panel">
        <h2>Orders</h2>
        {isLoading && <div className="empty-state">Loading orders...</div>}
        {error && <p className="form-error">{error}</p>}
        {!isLoading && orders.length === 0 && <div className="empty-state">No orders yet.</div>}
        <div className="order-list">
          {orders.map((order) => (
            <Link key={order.id} className="order-row" to={`/orders/${order.id}`}>
              <div>
                <strong>Order #{order.id.slice(0, 8)}</strong>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span>{order.status}</span>
                <strong>Rs. {order.total.toLocaleString('en-IN')}</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function OrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getOrder(id)
      .then((data) => setOrder(data.order))
      .catch((orderError) => setError(orderError.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  return (
    <main className="account-page">
      <section className="account-panel">
        {isLoading && <div className="empty-state">Loading order...</div>}
        {error && <p className="form-error">{error}</p>}
        {order && (
          <>
            <h2>Order #{order.id.slice(0, 8)}</h2>
            <div className="account-grid">
              <div><span>Status</span><strong>{order.status}</strong></div>
              <div><span>Payment</span><strong>{order.paymentStatus}</strong></div>
              <div><span>Total</span><strong>Rs. {order.total.toLocaleString('en-IN')}</strong></div>
            </div>
            <div className="order-list">
              {order.items.map((item) => {
                const product = formatProduct(item.product);
                return (
                  <div key={item.id} className="cart-item-row">
                    <img src={product.image} alt={product.name} />
                    <div className="cart-item-copy">
                      <h4>{product.name}</h4>
                      <p>{item.quantity} x Rs. {item.unitPrice.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function App() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [cart, setCart] = useState(calculateGuestCart(getGuestCart()));
  const [cartError, setCartError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState(defaultCheckoutForm);
  const [orderPlaced, setOrderPlaced] = useState(null);

  const syncServerCart = async () => {
    const serverCart = await getCart();
    setCart(formatCart(serverCart));
    return serverCart;
  };

  const mergeGuestCart = async () => {
    const guestItems = getGuestCart();
    for (const item of guestItems) {
      try {
        await addCartItem(item.id, item.quantity);
      } catch (mergeError) {
        setCartError(mergeError.message);
      }
    }
    saveGuestCart([]);
  };

  const verifyAuth = async (token, shouldMergeCart = false) => {
    localStorage.setItem('nepshop-token', token);
    const data = await getCurrentUser();
    setUser(data.user);
    if (shouldMergeCart) await mergeGuestCart();
    await syncServerCart();
  };

  useEffect(() => {
    const token = localStorage.getItem('nepshop-token');
    if (!token) {
      setAuthChecked(true);
      return;
    }

    verifyAuth(token)
      .catch(() => {
        localStorage.removeItem('nepshop-token');
        setUser(null);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      setIsLoading(true);
      setError('');

      try {
        const [categoryData, productData] = await Promise.all([
          getCategories(),
          getProducts({ category: selectedCategory, search, limit: 24 }),
        ]);

        if (!isMounted) return;
        setCategories(categoryData);
        setProducts(productData.items.map(formatProduct));
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError.message || 'Unable to load catalog.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [search, selectedCategory]);

  useEffect(() => {
    if (!user) {
      saveGuestCart(cart.items);
      setCart((current) => {
        const next = calculateGuestCart(current.items);
        return next.subtotal === current.subtotal && next.total === current.total ? current : next;
      });
    }
  }, [cart.items, user]);

  const categoryCards = useMemo(
    () => [{ name: 'All', slug: '', image: fallbackImage, description: 'Popular picks' }, ...categories],
    [categories],
  );

  const cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  const handleLogout = () => {
    localStorage.removeItem('nepshop-token');
    setUser(null);
    setCart(calculateGuestCart(getGuestCart()));
    navigate('/');
  };

  const addToCart = async (product) => {
    if (product.stock <= 0) return;
    setCartError('');

    if (user) {
      try {
        setCart(formatCart(await addCartItem(product.id, 1)));
      } catch (addError) {
        setCartError(addError.message);
      }
    } else {
      setCart((current) => {
        const existing = current.items.find((item) => item.id === product.id);
        const items = existing
          ? current.items.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.stock, item.quantity + 1) } : item)
          : [...current.items, { ...product, quantity: 1 }];
        return calculateGuestCart(items);
      });
    }

    setIsCartOpen(true);
  };

  const updateQuantity = async (item, delta) => {
    const nextQuantity = Math.min(item.stock, Math.max(0, item.quantity + delta));
    setCartError('');

    try {
      if (user) {
        const updatedCart = nextQuantity === 0 ? await removeCartItem(item.cartItemId) : await updateCartItem(item.cartItemId, nextQuantity);
        setCart(formatCart(updatedCart));
      } else {
        setCart((current) => calculateGuestCart(
          current.items
            .map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: nextQuantity } : cartItem)
            .filter((cartItem) => cartItem.quantity > 0),
        ));
      }
    } catch (cartUpdateError) {
      setCartError(cartUpdateError.message);
    }
  };

  const removeFromCart = async (item) => {
    setCartError('');
    try {
      if (user) {
        setCart(formatCart(await removeCartItem(item.cartItemId)));
      } else {
        setCart((current) => calculateGuestCart(current.items.filter((cartItem) => cartItem.id !== item.id)));
      }
    } catch (removeError) {
      setCartError(removeError.message);
    }
  };

  const handleCheckoutSubmit = async (event) => {
    event.preventDefault();
    setCheckoutError('');

    if (!user) {
      setIsCheckoutOpen(false);
      navigate('/login');
      return;
    }

    try {
      const { paymentMethod, ...address } = checkoutForm;
      const data = await createCheckout({ address, paymentMethod });
      setOrderPlaced(data.order);
      setCart(formatCart(await getCart()));
      setCheckoutForm(defaultCheckoutForm);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      navigate(`/orders/${data.order.id}`);
    } catch (checkoutSubmitError) {
      setCheckoutError(checkoutSubmitError.message);
    }
  };

  const nextSlide = () => setActiveSlide((current) => (current + 1) % heroSlides.length);
  const prevSlide = () => setActiveSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length);

  const home = (
    <main>
      <section className="hero" aria-label="Featured deals">
        <div className="carousel">
          <button type="button" className="carousel-btn prev" onClick={prevSlide} aria-label="Previous slide"><i className="fa-solid fa-angle-left" aria-hidden="true"></i></button>
          <div className="carousel-track">
            {heroSlides.map((slide, index) => (
              <div key={slide.title} className={index === activeSlide ? 'slide active' : 'slide'}>
                <img src={slide.image} alt={slide.title} />
                <div className="slide-copy">
                  <span>limited time</span>
                  <h2>{slide.title}</h2>
                  <p>{slide.subtitle}</p>
                  <button type="button">Shop now</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="carousel-btn next" onClick={nextSlide} aria-label="Next slide"><i className="fa-solid fa-angle-right" aria-hidden="true"></i></button>
        </div>
      </section>

      <section className="stats-row">
        <div><strong>10k+</strong><span>Happy shoppers</span></div>
        <div><strong>48h</strong><span>Fast delivery</span></div>
        <div><strong>4.8/5</strong><span>Customer rating</span></div>
        <div><strong>24/7</strong><span>Support</span></div>
      </section>

      <section className="section">
        <div className="section-heading"><h2>Shop by category</h2><a href="#">View all</a></div>
        <div className="category-grid">
          {categoryCards.map((category) => (
            <button key={category.slug || 'all'} type="button" className={selectedCategory === category.slug ? 'category-card active' : 'category-card'} onClick={() => setSelectedCategory(category.slug)}>
              <img src={category.image || fallbackImage} alt={category.name} />
              <div className="category-copy"><h3>{category.name}</h3><p>{category.description || 'Curated picks'}</p></div>
            </button>
          ))}
        </div>
      </section>

      <section className="section deal-section">
        <div className="section-heading"><h2>Trending products</h2><a href="#">Explore</a></div>
        {isLoading ? (
          <div className="empty-state"><h3>Loading products...</h3><p>Fetching the latest catalog from the database.</p></div>
        ) : error ? (
          <div className="empty-state"><h3>Catalog unavailable.</h3><p>{error}</p></div>
        ) : products.length === 0 ? (
          <div className="empty-state"><h3>No products match your search.</h3><p>Try another keyword or switch category.</p></div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <article key={product.id} className="product-card">
                <div className="product-image-wrap"><img src={product.image} alt={product.imageAlt} /><span className="product-badge">{product.badge}</span></div>
                <div className="product-info">
                  <div className="product-meta-row"><span className="category-tag">{product.categoryName}</span><span className="rating"><i className="fa-solid fa-star"></i> {product.rating}</span></div>
                  <h3>{product.name}</h3>
                  <p>{product.displayDescription}</p>
                  <strong>Rs. {product.price.toLocaleString('en-IN')}{product.originalPrice && <span>Rs. {product.originalPrice.toLocaleString('en-IN')}</span>}</strong>
                  <p className={product.stock > 0 ? 'stock-note' : 'stock-note sold-out'}>{product.stock > 0 ? `${product.stock} left in stock` : 'Out of stock'}</p>
                  <div className="btn3">
                    <button type="button" className="Bag" onClick={() => addToCart(product)} disabled={product.stock <= 0}>Add to Cart</button>
                    <button type="button" className="view-btn" onClick={() => setSelectedProduct(product)}><i className="fa-solid fa-angle-right icon"></i></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section more-section">
        <div className="section-heading"><h2>Just for you</h2><a href="#">Personalized picks</a></div>
        <div className="more-grid">
          {products.slice(0, 3).map((item) => (
            <div key={item.id} className="more-product">
              <img src={item.image} alt={item.imageAlt} />
              <div className="productDetails"><h1>{item.name}</h1><p>Rs: {item.price.toLocaleString('en-IN')} /-</p><span className="offerPrice">- 21%</span></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );

  return (
    <>
      <div className="notify-bar">
        <marquee behavior="scroll" direction="right" scrollamount="10"><p>Free shipping over Rs. 1,000 - New season sale live now</p></marquee>
      </div>

      <header className="nav-bar">
        <Link className="logo" to="/"><h1>Nepshop</h1></Link>
        <nav className="nav-container" aria-label="Main navigation">
          <button type="button" onClick={() => setSelectedCategory('men')}>Men</button>
          <button type="button" onClick={() => setSelectedCategory('women')}>Women</button>
          <button type="button" onClick={() => setSelectedCategory('footwear')}>Footwear</button>
          <button type="button" onClick={() => setSelectedCategory('beauty')}>Beauty</button>
          <Link to="/orders">Orders</Link>
        </nav>
        <label className="search" aria-label="Search products">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input className="input" type="text" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="cart-shell">
          {user ? (
            <>
              <Link className="auth-link" to="/account">{user.name}</Link>
              <button type="button" className="auth-link" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="auth-link" to="/login">Login</Link>
              <Link className="auth-link" to="/register">Register</Link>
            </>
          )}
          <button type="button" className="cart-button" onClick={() => setIsCartOpen(true)} aria-label="Open shopping cart">
            <span className="cartNumber">{cartCount}</span>
            <i className="fa-solid fa-cart-shopping" aria-hidden="true"></i>
            <span>Cart</span>
          </button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={home} />
        <Route path="/login" element={user ? <Navigate to="/account" replace /> : <AuthForm mode="login" onAuth={(token) => verifyAuth(token, true)} />} />
        <Route path="/register" element={user ? <Navigate to="/account" replace /> : <AuthForm mode="register" onAuth={(token) => verifyAuth(token, true)} />} />
        <Route path="/account" element={<ProtectedRoute user={user} authChecked={authChecked}><AccountPage user={user} /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute user={user} authChecked={authChecked}><OrdersPage /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute user={user} authChecked={authChecked}><OrderDetailsPage /></ProtectedRoute>} />
      </Routes>

      {isCartOpen && (
        <div className="drawer-backdrop" onClick={() => setIsCartOpen(false)}>
          <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header"><h3>Your cart</h3><button type="button" className="close-btn" onClick={() => setIsCartOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
            {cartError && <p className="form-error">{cartError}</p>}
            {!user && cart.items.length > 0 && <p className="cart-note">Login to save this cart and checkout.</p>}
            {cart.items.length === 0 ? (
              <div className="empty-cart"><p>Your cart is empty.</p><button type="button" className="primary-btn" onClick={() => setIsCartOpen(false)}>Continue shopping</button></div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.items.map((item) => (
                    <div key={item.cartItemId || item.id} className="cart-item-row">
                      <img src={item.image} alt={item.name} />
                      <div className="cart-item-copy">
                        <h4>{item.name}</h4>
                        <p>Rs. {item.price.toLocaleString('en-IN')}</p>
                        <div className="qty-box"><button type="button" onClick={() => updateQuantity(item, -1)}>-</button><span>{item.quantity}</span><button type="button" onClick={() => updateQuantity(item, 1)}>+</button></div>
                      </div>
                      <button type="button" className="remove-btn" onClick={() => removeFromCart(item)}><i className="fa-solid fa-trash"></i></button>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <div><span>Subtotal</span><strong>Rs. {cart.subtotal.toLocaleString('en-IN')}</strong></div>
                  <div><span>Shipping</span><strong>{cart.shipping === 0 ? 'Free' : `Rs. ${cart.shipping.toLocaleString('en-IN')}`}</strong></div>
                  <div className="grand-total"><span>Total</span><strong>Rs. {cart.total.toLocaleString('en-IN')}</strong></div>
                  <button type="button" className="primary-btn checkout-btn" onClick={() => user ? setIsCheckoutOpen(true) : navigate('/login')}>Checkout</button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-btn modal-close" onClick={() => setSelectedProduct(null)}><i className="fa-solid fa-xmark"></i></button>
            <img src={selectedProduct.image} alt={selectedProduct.imageAlt} />
            <div className="modal-copy">
              <span className="category-tag">{selectedProduct.categoryName}</span>
              <h3>{selectedProduct.name}</h3>
              <p>{selectedProduct.description}</p>
              <strong>Rs. {selectedProduct.price.toLocaleString('en-IN')}</strong>
              <p className={selectedProduct.stock > 0 ? 'stock-note' : 'stock-note sold-out'}>{selectedProduct.stock > 0 ? `${selectedProduct.stock} left in stock` : 'Out of stock'}</p>
              <div className="modal-actions">
                <button type="button" className="primary-btn" onClick={() => addToCart(selectedProduct)} disabled={selectedProduct.stock <= 0}>Add to cart</button>
                <button type="button" className="secondary-btn" onClick={() => setSelectedProduct(null)}>Continue shopping</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="modal-backdrop" onClick={() => setIsCheckoutOpen(false)}>
          <div className="checkout-modal" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header"><h3>Checkout</h3><button type="button" className="close-btn" onClick={() => setIsCheckoutOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
            <form onSubmit={handleCheckoutSubmit} className="checkout-form">
              {checkoutError && <p className="form-error">{checkoutError}</p>}
              <div className="field-row">
                <label>Full name<input value={checkoutForm.fullName} onChange={(event) => setCheckoutForm({ ...checkoutForm, fullName: event.target.value })} required /></label>
                <label>Phone<input type="tel" value={checkoutForm.phone} onChange={(event) => setCheckoutForm({ ...checkoutForm, phone: event.target.value })} required /></label>
              </div>
              <label>Address<input value={checkoutForm.line1} onChange={(event) => setCheckoutForm({ ...checkoutForm, line1: event.target.value })} required /></label>
              <label>Address line 2<input value={checkoutForm.line2} onChange={(event) => setCheckoutForm({ ...checkoutForm, line2: event.target.value })} /></label>
              <div className="field-row">
                <label>City<input value={checkoutForm.city} onChange={(event) => setCheckoutForm({ ...checkoutForm, city: event.target.value })} required /></label>
                <label>State<input value={checkoutForm.state} onChange={(event) => setCheckoutForm({ ...checkoutForm, state: event.target.value })} required /></label>
              </div>
              <div className="field-row">
                <label>Postal code<input value={checkoutForm.postalCode} onChange={(event) => setCheckoutForm({ ...checkoutForm, postalCode: event.target.value })} required /></label>
                <label>Payment method<select value={checkoutForm.paymentMethod} onChange={(event) => setCheckoutForm({ ...checkoutForm, paymentMethod: event.target.value })}><option>Cash on Delivery</option></select></label>
              </div>
              <div className="checkout-summary">
                <div><span>Subtotal</span><strong>Rs. {cart.subtotal.toLocaleString('en-IN')}</strong></div>
                <div><span>Shipping</span><strong>{cart.shipping === 0 ? 'Free' : `Rs. ${cart.shipping.toLocaleString('en-IN')}`}</strong></div>
                <div><span>Total</span><strong>Rs. {cart.total.toLocaleString('en-IN')}</strong></div>
              </div>
              <button type="submit" className="primary-btn checkout-submit" disabled={cart.items.length === 0}>Place order</button>
            </form>
          </div>
        </div>
      )}

      {orderPlaced && (
        <div className="toast"><i className="fa-solid fa-circle-check"></i>Order #{orderPlaced.id.slice(0, 8)} placed.</div>
      )}
    </>
  );
}

export default App;

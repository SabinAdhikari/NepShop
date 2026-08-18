import { useEffect, useMemo, useState } from 'react';

const categories = [
  { name: 'All', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', offer: 'Popular picks' },
  { name: 'Men', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80', offer: 'Up to 60% off' },
  { name: 'Women', image: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=600&q=80', offer: 'Min. 50% off' },
  { name: 'Footwear', image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=600&q=80', offer: 'From Rs. 799' },
  { name: 'Beauty', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80', offer: 'Buy 1 get 1' },
];

const products = [
  { id: 1, name: 'Roadster Shirt', category: 'Men', description: 'Cotton casual shirt', price: 899, originalPrice: 1999, image: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=600&q=80', rating: 4.7, badge: 'Best seller' },
  { id: 2, name: 'DressBerry Dress', category: 'Women', description: 'Printed summer dress', price: 1299, originalPrice: 2799, image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80', rating: 4.8, badge: 'New' },
  { id: 3, name: 'Nike Runner', category: 'Footwear', description: 'Running sneakers', price: 2499, originalPrice: 4995, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', rating: 4.9, badge: 'Trending' },
  { id: 4, name: 'Maybelline Kit', category: 'Beauty', description: 'Beauty starter kit', price: 699, originalPrice: 1499, image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80', rating: 4.6, badge: 'Hot deal' },
  { id: 5, name: 'Urban Street Jacket', category: 'Men', description: 'Lightweight zip jacket', price: 1899, originalPrice: 3499, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80', rating: 4.7, badge: 'Premium' },
  { id: 6, name: 'Satin Party Set', category: 'Women', description: 'Chic partywear co-ord', price: 2199, originalPrice: 4599, image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80', rating: 4.8, badge: 'Exclusive' },
  { id: 7, name: 'Motion Sneaker', category: 'Footwear', description: 'Everyday comfort sole', price: 1799, originalPrice: 3299, image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=600&q=80', rating: 4.5, badge: 'Top rated' },
  { id: 8, name: 'Glow Essentials', category: 'Beauty', description: 'Hydrating skincare trio', price: 1199, originalPrice: 2599, image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80', rating: 4.9, badge: 'Loved by users' },
];

const heroSlides = [
  { image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1600&q=80', title: 'Fresh arrivals', subtitle: 'Style up to 60% off' },
  { image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1600&q=80', title: 'Weekend trends', subtitle: 'New looks for every mood' },
  { image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=80', title: 'Beauty essentials', subtitle: 'Glow more, spend less' },
  { image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1600&q=80', title: 'Smart shopping', subtitle: 'Free shipping over Rs. 1,000' },
];

const defaultCheckoutForm = {
  name: '',
  email: '',
  address: '',
  city: '',
  phone: '',
};

function App() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('nepshop-cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState(defaultCheckoutForm);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    localStorage.setItem('nepshop-cart', JSON.stringify(cart));
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch =
        !search.trim() ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase()) ||
        product.category.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal === 0 ? 0 : subtotal > 1000 ? 0 : 120;
  const total = subtotal + shipping;

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id) => {
    setCart((current) => current.filter((item) => item.id !== id));
  };

  const nextSlide = () => setActiveSlide((current) => (current + 1) % heroSlides.length);
  const prevSlide = () => setActiveSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length);

  const handleCheckoutSubmit = (event) => {
    event.preventDefault();
    if (!cart.length) return;
    setOrderPlaced(true);
    setCart([]);
    setCheckoutForm(defaultCheckoutForm);
    setIsCheckoutOpen(false);
    setTimeout(() => setOrderPlaced(false), 2500);
  };

  return (
    <>
      <div className="notify-bar">
        <marquee behavior="scroll" direction="right" scrollamount="10">
          <p>Free shipping over Rs. 1,000 • New season sale live now</p>
        </marquee>
      </div>

      <header className="nav-bar">
        <div className="logo">
          <h1>Nepshop</h1>
        </div>

        <nav className="nav-container" aria-label="Main navigation">
          <a href="#">Men</a>
          <a href="#">Women</a>
          <a href="#">Kids</a>
          <a href="#">Home</a>
          <a href="#">Beauty</a>
          <a href="#">Gadgets</a>
        </nav>

        <label className="search" aria-label="Search products">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input
            className="input"
            type="text"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="cart-shell">
          <button type="button" className="cart-button" onClick={() => setIsCartOpen(true)} aria-label="Open shopping cart">
            <span className="cartNumber">{cartCount}</span>
            <i className="fa-solid fa-cart-shopping" aria-hidden="true"></i>
            <span>Cart</span>
          </button>
          <img className="profile-pic" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="User profile" />
        </div>
      </header>

      <main>
        <section className="hero" aria-label="Featured deals">
          <div className="carousel">
            <button type="button" className="carousel-btn prev" onClick={prevSlide} aria-label="Previous slide">
              <i className="fa-solid fa-angle-left" aria-hidden="true"></i>
            </button>

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

            <button type="button" className="carousel-btn next" onClick={nextSlide} aria-label="Next slide">
              <i className="fa-solid fa-angle-right" aria-hidden="true"></i>
            </button>
          </div>
        </section>

        <section className="stats-row">
          <div>
            <strong>10k+</strong>
            <span>Happy shoppers</span>
          </div>
          <div>
            <strong>48h</strong>
            <span>Fast delivery</span>
          </div>
          <div>
            <strong>4.8/5</strong>
            <span>Customer rating</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>Support</span>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <h2>Shop by category</h2>
            <a href="#">View all</a>
          </div>

          <div className="category-grid">
            {categories.map((category) => (
              <button
                key={category.name}
                type="button"
                className={selectedCategory === category.name ? 'category-card active' : 'category-card'}
                onClick={() => setSelectedCategory(category.name)}
              >
                <img src={category.image} alt={category.name} />
                <div className="category-copy">
                  <h3>{category.name}</h3>
                  <p>{category.offer}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="section deal-section">
          <div className="section-heading">
            <h2>Trending products</h2>
            <a href="#">Explore</a>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <h3>No products match your search.</h3>
              <p>Try another keyword or switch category.</p>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <div className="product-image-wrap">
                    <img src={product.image} alt={product.name} />
                    <span className="product-badge">{product.badge}</span>
                  </div>

                  <div className="product-info">
                    <div className="product-meta-row">
                      <span className="category-tag">{product.category}</span>
                      <span className="rating"><i className="fa-solid fa-star"></i> {product.rating}</span>
                    </div>

                    <h3>{product.name}</h3>
                    <p>{product.description}</p>

                    <strong>
                      Rs. {product.price.toLocaleString('en-IN')}
                      <span>Rs. {product.originalPrice.toLocaleString('en-IN')}</span>
                    </strong>

                    <div className="btn3">
                      <button type="button" className="Bag" onClick={() => addToCart(product)}>Add to Cart</button>
                      <button type="button" className="view-btn" onClick={() => setSelectedProduct(product)}>
                        <i className="fa-solid fa-angle-right icon"></i>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="section more-section">
          <div className="section-heading">
            <h2>Just for you</h2>
            <a href="#">Personalized picks</a>
          </div>

          <div className="more-grid">
            {products.slice(0, 3).map((item) => (
              <div key={item.id} className="more-product">
                <img src={item.image} alt={item.name} />
                <div className="productDetails">
                  <h1>{item.name}</h1>
                  <p>Rs: {item.price.toLocaleString('en-IN')} /-</p>
                  <span className="offerPrice">- 21%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {isCartOpen && (
        <div className="drawer-backdrop" onClick={() => setIsCartOpen(false)}>
          <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <h3>Your cart</h3>
              <button type="button" className="close-btn" onClick={() => setIsCartOpen(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <p>Your cart is empty.</p>
                <button type="button" className="primary-btn" onClick={() => setIsCartOpen(false)}>Continue shopping</button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item-row">
                      <img src={item.image} alt={item.name} />
                      <div className="cart-item-copy">
                        <h4>{item.name}</h4>
                        <p>Rs. {item.price.toLocaleString('en-IN')}</p>
                        <div className="qty-box">
                          <button type="button" onClick={() => updateQuantity(item.id, -1)}>-</button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, 1)}>+</button>
                        </div>
                      </div>
                      <button type="button" className="remove-btn" onClick={() => removeFromCart(item.id)}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>Rs. {subtotal.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span>Shipping</span>
                    <strong>{shipping === 0 ? 'Free' : `Rs. ${shipping.toLocaleString('en-IN')}`}</strong>
                  </div>
                  <div className="grand-total">
                    <span>Total</span>
                    <strong>Rs. {total.toLocaleString('en-IN')}</strong>
                  </div>
                  <button type="button" className="primary-btn checkout-btn" onClick={() => setIsCheckoutOpen(true)}>
                    Checkout
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-btn modal-close" onClick={() => setSelectedProduct(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img src={selectedProduct.image} alt={selectedProduct.name} />
            <div className="modal-copy">
              <span className="category-tag">{selectedProduct.category}</span>
              <h3>{selectedProduct.name}</h3>
              <p>{selectedProduct.description}</p>
              <strong>Rs. {selectedProduct.price.toLocaleString('en-IN')}</strong>
              <div className="modal-actions">
                <button type="button" className="primary-btn" onClick={() => addToCart(selectedProduct)}>
                  Add to cart
                </button>
                <button type="button" className="secondary-btn" onClick={() => setSelectedProduct(null)}>
                  Continue shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="modal-backdrop" onClick={() => setIsCheckoutOpen(false)}>
          <div className="checkout-modal" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <h3>Checkout</h3>
              <button type="button" className="close-btn" onClick={() => setIsCheckoutOpen(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="checkout-form">
              <div className="field-row">
                <label>
                  Full name
                  <input type="text" value={checkoutForm.name} onChange={(event) => setCheckoutForm({ ...checkoutForm, name: event.target.value })} required />
                </label>
                <label>
                  Email
                  <input type="email" value={checkoutForm.email} onChange={(event) => setCheckoutForm({ ...checkoutForm, email: event.target.value })} required />
                </label>
              </div>

              <label>
                Address
                <input type="text" value={checkoutForm.address} onChange={(event) => setCheckoutForm({ ...checkoutForm, address: event.target.value })} required />
              </label>

              <div className="field-row">
                <label>
                  City
                  <input type="text" value={checkoutForm.city} onChange={(event) => setCheckoutForm({ ...checkoutForm, city: event.target.value })} required />
                </label>
                <label>
                  Phone
                  <input type="tel" value={checkoutForm.phone} onChange={(event) => setCheckoutForm({ ...checkoutForm, phone: event.target.value })} required />
                </label>
              </div>

              <div className="checkout-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>Rs. {subtotal.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span>Shipping</span>
                  <strong>{shipping === 0 ? 'Free' : `Rs. ${shipping.toLocaleString('en-IN')}`}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>Rs. {total.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <button type="submit" className="primary-btn checkout-submit">Place order</button>
            </form>
          </div>
        </div>
      )}

      {orderPlaced && (
        <div className="toast">
          <i className="fa-solid fa-circle-check"></i>
          Order placed successfully.
        </div>
      )}
    </>
  );
}

export default App;

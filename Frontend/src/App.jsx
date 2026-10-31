import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:5000/api";
const SERVER = "http://localhost:5000";

// Fast Image Presets for testing & presentation
const SAMPLE_PRESETS = [
  { label: "🍔 Burger", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop" },
  { label: "🍕 Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop" },
  { label: "🍝 Pasta", url: "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=600&auto=format&fit=crop" },
  { label: "🥤 Drinks", url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop" },
  { label: "🥗 Salad", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop" }
];

export default function App() {
  const [tab, setTab] = useState("overview"); // 'overview' | 'categories' | 'foods'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [modalType, setModalType] = useState("categories"); // 'categories' | 'foods'

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, name }

  // Toast State
  const [toast, setToast] = useState({ show: false, message: "", isError: false });

  // Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterCategory, setSelectedFilterCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'price-low' | 'price-high' | 'name-az'

  // Image mode ('url' | 'file')
  const [imageMode, setImageMode] = useState("url");

  // Form State
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    image: null,
    imageUrl: ""
  });

  const [foodForm, setFoodForm] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    image: null,
    imageUrl: ""
  });

  const [previewUrl, setPreviewUrl] = useState(null);

  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => {
      setToast({ show: false, message: "", isError: false });
    }, 3800);
  };

  async function loadData() {
    setLoading(true);
    try {
      const [cRes, fRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/foods`)
      ]);
      setCategories(cRes.data);
      setFoods(fRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load database records", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreateModal(type = tab) {
    const targetType = type === "overview" ? "foods" : type;
    setModalType(targetType);
    setEditId(null);
    setImageMode("url");
    setPreviewUrl(null);
    setCategoryForm({ name: "", description: "", image: null, imageUrl: "" });
    setFoodForm({ name: "", price: "", description: "", category: "", image: null, imageUrl: "" });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditId(null);
    setPreviewUrl(null);
  }

  // Handle Category Submit
  async function handleCategorySubmit(e) {
    e.preventDefault();
    const data = new FormData();
    data.append("name", categoryForm.name);
    data.append("description", categoryForm.description);

    if (imageMode === "file" && categoryForm.image) {
      data.append("image", categoryForm.image);
    } else if (imageMode === "url" && categoryForm.imageUrl) {
      data.append("imageUrl", categoryForm.imageUrl);
    }

    try {
      if (editId) {
        await axios.put(`${API}/categories/${editId}`, data);
        showToast("Category updated successfully!");
      } else {
        await axios.post(`${API}/categories`, data);
        showToast("Category created successfully!");
      }
      closeModal();
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || "Error saving category", true);
    }
  }

  // Handle Food Submit
  async function handleFoodSubmit(e) {
    e.preventDefault();
    const data = new FormData();
    data.append("name", foodForm.name);
    data.append("price", foodForm.price);
    data.append("description", foodForm.description);
    data.append("category", foodForm.category);

    if (imageMode === "file" && foodForm.image) {
      data.append("image", foodForm.image);
    } else if (imageMode === "url" && foodForm.imageUrl) {
      data.append("imageUrl", foodForm.imageUrl);
    }

    try {
      if (editId) {
        await axios.put(`${API}/foods/${editId}`, data);
        showToast("Food dish updated successfully!");
      } else {
        await axios.post(`${API}/foods`, data);
        showToast("New dish added to menu!");
      }
      closeModal();
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || "Error saving food item", true);
    }
  }

  // Confirm and Execute Delete
  async function confirmDelete() {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;

    try {
      const res = await axios.delete(`${API}/${type}/${id}`);
      showToast(res.data.message || "Record permanently deleted!");
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || "Deletion failed", true);
      setDeleteTarget(null);
    }
  }

  function resolveImage(img) {
    if (!img) return "";
    if (img.startsWith("http://") || img.startsWith("https://")) {
      return img;
    }
    return `${SERVER}/uploads/${encodeURIComponent(img)}`;
  }

  // Export Menu to CSV
  function exportToCSV() {
    if (!foods.length) {
      showToast("No food items to export!", true);
      return;
    }
    const headers = ["Dish Name", "Category", "Price (PKR)", "Description"];
    const rows = foods.map((f) => [
      `"${f.name.replace(/"/g, '""')}"`,
      `"${(f.category?.name || "General").replace(/"/g, '""')}"`,
      f.price,
      `"${f.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Restaurant_Menu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Restaurant Menu CSV downloaded! 📥");
  }

  // Filtered & Sorted Foods
  const processedFoods = useMemo(() => {
    let result = foods.filter((f) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = f.name?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q);
      const matchesCategory =
        selectedFilterCategory === "ALL" ||
        (f.category && (f.category._id === selectedFilterCategory || f.category === selectedFilterCategory));
      return matchesSearch && matchesCategory;
    });

    if (sortBy === "price-low") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === "name-az") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  }, [foods, searchQuery, selectedFilterCategory, sortBy]);

  // Analytics Metrics
  const totalValuation = useMemo(() => {
    return foods.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [foods]);

  const avgPrice = useMemo(() => {
    if (!foods.length) return 0;
    return Math.round(totalValuation / foods.length);
  }, [foods, totalValuation]);

  const premiumDish = useMemo(() => {
    if (!foods.length) return null;
    return [...foods].sort((a, b) => Number(b.price) - Number(a.price))[0];
  }, [foods]);

  const budgetDish = useMemo(() => {
    if (!foods.length) return null;
    return [...foods].sort((a, b) => Number(a.price) - Number(b.price))[0];
  }, [foods]);

  return (
    <div className="dashboard-layout">
      {/* Toast Alert */}
      {toast.show && (
        <div className={`toast-banner ${toast.isError ? "error" : "success"}`}>
          <span>{toast.isError ? "⚠️" : "✨"}</span>
          <span>{toast.message}</span>
          <button className="toast-dismiss" onClick={() => setToast({ show: false, message: "", isError: false })}>
            ✕
          </button>
        </div>
      )}

      {/* ── Left Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="brand">
          <div className="brand-logo">🍽️</div>
          <div className="brand-info">
            <div className="brand-title-row">
              <h1>GourmetOS</h1>
              <span className="enterprise-tag">PRO POS</span>
            </div>
            <p>Admin Restaurant Suite</p>
          </div>
        </div>

        {/* Branch Indicator */}
        <div className="branch-pill">
          <span>
            <div className="branch-dot"></div>
            Downtown Branch
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Kitchen #1</span>
        </div>

        {/* Management Navigation Section */}
        <span className="nav-label">Main Navigation</span>
        <nav className="nav-links">
          <button
            className={`nav-btn ${tab === "overview" ? "active" : ""}`}
            onClick={() => {
              setTab("overview");
              closeModal();
            }}
          >
            <span className="icon">📊</span>
            <span>Dashboard Overview</span>
          </button>

          <button
            className={`nav-btn ${tab === "categories" ? "active" : ""}`}
            onClick={() => {
              setTab("categories");
              closeModal();
            }}
          >
            <span className="icon">📁</span>
            <span>Categories</span>
            <span className="nav-badge">{categories.length}</span>
          </button>

          <button
            className={`nav-btn ${tab === "foods" ? "active" : ""}`}
            onClick={() => {
              setTab("foods");
              closeModal();
            }}
          >
            <span className="icon">🍔</span>
            <span>Food Catalog</span>
            <span className="nav-badge">{foods.length}</span>
          </button>
        </nav>

        {/* Quick Operations Section */}
        <span className="nav-label">POS Utilities</span>
        <nav className="nav-links">
          <button className="nav-btn" onClick={exportToCSV}>
            <span className="icon">📥</span>
            <span>Export Menu (CSV)</span>
          </button>
          <button className="nav-btn" onClick={() => window.print()}>
            <span className="icon">🖨️</span>
            <span>Print Menu Sheet</span>
          </button>
        </nav>

        {/* Real-time DB Health Meter */}
        <div className="sidebar-sync-box">
          <div className="sync-top-row">
            <span>
              <div className="sync-beacon"></div>
              MongoDB Atlas
            </span>
            <span className="sync-pct">100% LIVE</span>
          </div>
          <div className="sync-progress-track">
            <div className="sync-progress-bar"></div>
          </div>
          <p className="sync-desc">Database synchronized • 0 errors</p>
        </div>

        {/* Verified User Profile Card */}
        <div className="sidebar-user-footer">
          <div className="user-avatar-circle">
            👨‍🍳
            <div className="user-online-badge"></div>
          </div>
          <div className="user-info-text">
            <h5>
              Ahmed Raza
              <span className="verified-icon">✓</span>
            </h5>
            <p>Head Chef & Admin</p>
          </div>
        </div>
      </aside>

      {/* ── Main Dashboard Workspace ── */}
      <main className="workspace">
        {/* Top Bar with Call-to-Action & Utilities */}
        <header className="top-bar">
          <div className="page-intro">
            <h2>
              {tab === "overview" && "Executive Restaurant Overview"}
              {tab === "categories" && "Food Categories Directory"}
              {tab === "foods" && "Food Dishes & Menu Catalog"}
            </h2>
            <p>
              {tab === "overview" && "Live performance metrics, category distribution, and menu valuation."}
              {tab === "categories" && "Organize your dishes into visual groupings with ease."}
              {tab === "foods" && "Manage dish pricing, ingredients, and categories."}
            </p>
          </div>

          <div className="top-actions">
            {tab !== "categories" && (
              <>
                <button className="utility-btn" onClick={exportToCSV} title="Export menu to CSV">
                  📥 Export CSV
                </button>
                <button className="utility-btn" onClick={() => window.print()} title="Print restaurant menu">
                  🖨️ Print
                </button>
              </>
            )}

            <button
              className="cta-button"
              onClick={() => openCreateModal(tab === "categories" ? "categories" : "foods")}
            >
              <span>➕</span>
              <span>{tab === "categories" ? "New Category" : "New Food Dish"}</span>
            </button>
          </div>
        </header>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <>
            {/* 4 Metric Tiles */}
            <section className="stats-overview" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="stat-tile">
                <div className="stat-meta">
                  <span>Categories</span>
                  <h3>{categories.length}</h3>
                </div>
                <div className="stat-symbol orange">📁</div>
              </div>

              <div className="stat-tile">
                <div className="stat-meta">
                  <span>Total Dishes</span>
                  <h3>{foods.length}</h3>
                </div>
                <div className="stat-symbol blue">🍔</div>
              </div>

              <div className="stat-tile">
                <div className="stat-meta">
                  <span>Avg Dish Price</span>
                  <h3>Rs. {avgPrice}</h3>
                </div>
                <div className="stat-symbol emerald">💰</div>
              </div>

              <div className="stat-tile">
                <div className="stat-meta">
                  <span>Menu Valuation</span>
                  <h3>Rs. {totalValuation}</h3>
                </div>
                <div className="stat-symbol orange">📈</div>
              </div>
            </section>

            {/* Spotlight Dishes: Premium vs Budget */}
            {(premiumDish || budgetDish) && (
              <div className="spotlight-row">
                {premiumDish && (
                  <div className="spotlight-card">
                    <img
                      src={resolveImage(premiumDish.image)}
                      alt={premiumDish.name}
                      className="spotlight-thumb"
                    />
                    <div className="spotlight-info">
                      <span className="spotlight-tag gold">⭐ Most Premium Dish</span>
                      <h4>{premiumDish.name}</h4>
                      <div className="spotlight-price">Rs. {premiumDish.price}</div>
                    </div>
                  </div>
                )}

                {budgetDish && (
                  <div className="spotlight-card">
                    <img
                      src={resolveImage(budgetDish.image)}
                      alt={budgetDish.name}
                      className="spotlight-thumb"
                    />
                    <div className="spotlight-info">
                      <span className="spotlight-tag emerald">🌱 Budget-Friendly Dish</span>
                      <h4>{budgetDish.name}</h4>
                      <div className="spotlight-price">Rs. {budgetDish.price}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Overview Grid: Category Distribution & Launchpad */}
            <div className="overview-grid">
              {/* Category Distribution */}
              <div className="overview-card">
                <h3>
                  <span>📊</span> Category Menu Share
                </h3>
                {categories.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No categories created yet.</p>
                ) : (
                  categories.map((c) => {
                    const count = foods.filter((f) => f.category?._id === c._id || f.category === c._id).length;
                    const pct = foods.length ? Math.round((count / foods.length) * 100) : 0;
                    return (
                      <div className="dist-item" key={c._id}>
                        <div className="dist-header">
                          <span>{c.name}</span>
                          <span>
                            {count} dishes ({pct}%)
                          </span>
                        </div>
                        <div className="dist-track">
                          <div className="dist-bar" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Actions Launchpad */}
              <div className="overview-card">
                <h3>
                  <span>⚡</span> Quick Launchpad
                </h3>
                <div className="launchpad-grid">
                  <button className="launchpad-btn" onClick={() => openCreateModal("categories")}>
                    <span className="btn-icon">📁</span>
                    <span>Add Category</span>
                    <span>Create menu group</span>
                  </button>

                  <button className="launchpad-btn" onClick={() => openCreateModal("foods")}>
                    <span className="btn-icon">🍔</span>
                    <span>Add Food Dish</span>
                    <span>Upload dish & price</span>
                  </button>

                  <button className="launchpad-btn" onClick={exportToCSV}>
                    <span className="btn-icon">📥</span>
                    <span>Export CSV</span>
                    <span>Download Excel file</span>
                  </button>

                  <button className="launchpad-btn" onClick={() => window.print()}>
                    <span className="btn-icon">🖨️</span>
                    <span>Print Menu</span>
                    <span>Hardcopy sheet</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── CATEGORIES TAB ── */}
        {tab === "categories" && (
          <section className="surface-panel">
            <div className="panel-header-row">
              <h3>
                <span>📋</span>
                <span>Categories Directory ({categories.length})</span>
              </h3>

              <div className="view-switcher">
                <button
                  className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  ⊞ Grid
                </button>
                <button
                  className={`view-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                >
                  ☰ Table
                </button>
              </div>
            </div>

            {categories.length === 0 ? (
              <div className="empty-placeholder">
                <div className="empty-halo">📂</div>
                <h4>No Categories Found</h4>
                <p>Click the "+ New Category" button above to create your first category.</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="dishes-grid">
                {categories.map((c) => (
                  <article className="dish-card" key={c._id}>
                    <div className="dish-cover">
                      <img src={resolveImage(c.image)} alt={c.name} className="dish-cover-img" />
                    </div>
                    <div className="dish-body">
                      <h4>{c.name}</h4>
                      <p>{c.description}</p>
                      <div className="dish-actions">
                        <button
                          className="btn-action edit"
                          onClick={() => {
                            setModalType("categories");
                            setEditId(c._id);
                            const isWeb = c.image?.startsWith("http");
                            setImageMode(isWeb ? "url" : "file");
                            setCategoryForm({
                              name: c.name,
                              description: c.description,
                              image: null,
                              imageUrl: isWeb ? c.image : ""
                            });
                            setPreviewUrl(resolveImage(c.image));
                            setIsModalOpen(true);
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn-action delete"
                          onClick={() => setDeleteTarget({ type: "categories", id: c._id, name: c.name })}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Thumbnail</th>
                      <th>Category Name</th>
                      <th>Description</th>
                      <th>Created Date</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <img src={resolveImage(c.image)} alt={c.name} className="table-thumb" />
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{c.name}</td>
                        <td style={{ maxWidth: "320px", color: "var(--text-muted)" }}>{c.description}</td>
                        <td>{new Date(c.createdAt || Date.now()).toLocaleDateString()}</td>
                        <td style={{ textAlign: "right" }}>
                          <div className="table-actions" style={{ justifyContent: "flex-end" }}>
                            <button
                              className="btn-action edit"
                              style={{ flex: "none", padding: "6px 12px" }}
                              onClick={() => {
                                setModalType("categories");
                                setEditId(c._id);
                                const isWeb = c.image?.startsWith("http");
                                setImageMode(isWeb ? "url" : "file");
                                setCategoryForm({
                                  name: c.name,
                                  description: c.description,
                                  image: null,
                                  imageUrl: isWeb ? c.image : ""
                                });
                                setPreviewUrl(resolveImage(c.image));
                                setIsModalOpen(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-action delete"
                              style={{ flex: "none", padding: "6px 12px" }}
                              onClick={() => setDeleteTarget({ type: "categories", id: c._id, name: c.name })}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── FOODS TAB ── */}
        {tab === "foods" && (
          <section className="surface-panel">
            <div className="panel-header-row">
              <h3>
                <span>📋</span>
                <span>Menu Dishes ({processedFoods.length})</span>
              </h3>

              <div className="view-switcher">
                <button
                  className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  ⊞ Grid
                </button>
                <button
                  className={`view-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                >
                  ☰ Table
                </button>
              </div>
            </div>

            {/* Interactive Category Filter Chips */}
            {categories.length > 0 && (
              <div className="category-chips-row">
                <button
                  className={`category-chip ${selectedFilterCategory === "ALL" ? "active" : ""}`}
                  onClick={() => setSelectedFilterCategory("ALL")}
                >
                  🍽️ All Items ({foods.length})
                </button>
                {categories.map((c) => {
                  const count = foods.filter((f) => f.category?._id === c._id || f.category === c._id).length;
                  return (
                    <button
                      key={c._id}
                      className={`category-chip ${selectedFilterCategory === c._id ? "active" : ""}`}
                      onClick={() => setSelectedFilterCategory(c._id)}
                    >
                      <span>{c.name}</span>
                      <span style={{ opacity: 0.6 }}>({count})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Foods Toolbar: Search + Sort */}
            <div className="controls-toolbar">
              <div className="search-wrapper">
                <span className="search-glyph">🔍</span>
                <input
                  type="text"
                  className="search-input-field"
                  placeholder="Search dishes by name or ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="category-select-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">🕒 Sort: Newest First</option>
                <option value="price-low">💵 Price: Low to High</option>
                <option value="price-high">💎 Price: High to Low</option>
                <option value="name-az">🔤 Name: A to Z</option>
              </select>
            </div>

            {processedFoods.length === 0 ? (
              <div className="empty-placeholder">
                <div className="empty-halo">🍔</div>
                <h4>No Food Dishes Found</h4>
                <p>
                  {searchQuery || selectedFilterCategory !== "ALL"
                    ? "Try clearing your search query or choosing another category."
                    : 'Click the "+ New Food Dish" button above to add dishes to your menu.'}
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="dishes-grid">
                {processedFoods.map((f) => (
                  <article className="dish-card" key={f._id}>
                    <div className="dish-cover">
                      <img src={resolveImage(f.image)} alt={f.name} className="dish-cover-img" />
                      <span className="status-pill">● In Stock</span>
                      <span className="dish-price-tag">Rs. {f.price}</span>
                      <span className="dish-category-tag">{f.category?.name || "General"}</span>
                    </div>
                    <div className="dish-body">
                      <h4>{f.name}</h4>
                      <p>{f.description}</p>
                      <div className="dish-actions">
                        <button
                          className="btn-action edit"
                          onClick={() => {
                            setModalType("foods");
                            setEditId(f._id);
                            const isWeb = f.image?.startsWith("http");
                            setImageMode(isWeb ? "url" : "file");
                            setFoodForm({
                              name: f.name,
                              price: f.price,
                              description: f.description,
                              category: f.category?._id || f.category || "",
                              image: null,
                              imageUrl: isWeb ? f.image : ""
                            });
                            setPreviewUrl(resolveImage(f.image));
                            setIsModalOpen(true);
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn-action delete"
                          onClick={() => setDeleteTarget({ type: "foods", id: f._id, name: f.name })}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dish Photo</th>
                      <th>Dish Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Description</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedFoods.map((f) => (
                      <tr key={f._id}>
                        <td>
                          <img src={resolveImage(f.image)} alt={f.name} className="table-thumb" />
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{f.name}</td>
                        <td>
                          <span
                            style={{
                              background: "rgba(249, 115, 22, 0.12)",
                              color: "#fb923c",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700
                            }}
                          >
                            {f.category?.name || "General"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: "var(--text-primary)" }}>Rs. {f.price}</td>
                        <td style={{ maxWidth: "260px", color: "var(--text-muted)" }}>{f.description}</td>
                        <td style={{ textAlign: "right" }}>
                          <div className="table-actions" style={{ justifyContent: "flex-end" }}>
                            <button
                              className="btn-action edit"
                              style={{ flex: "none", padding: "6px 12px" }}
                              onClick={() => {
                                setModalType("foods");
                                setEditId(f._id);
                                const isWeb = f.image?.startsWith("http");
                                setImageMode(isWeb ? "url" : "file");
                                setFoodForm({
                                  name: f.name,
                                  price: f.price,
                                  description: f.description,
                                  category: f.category?._id || f.category || "",
                                  image: null,
                                  imageUrl: isWeb ? f.image : ""
                                });
                                setPreviewUrl(resolveImage(f.image));
                                setIsModalOpen(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-action delete"
                              style={{ flex: "none", padding: "6px 12px" }}
                              onClick={() => setDeleteTarget({ type: "foods", id: f._id, name: f.name })}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── CREATE / EDIT MODAL DIALOG ── */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <span>{editId ? "✏️" : "✨"}</span>
                <span>
                  {modalType === "categories"
                    ? editId
                      ? "Update Category"
                      : "Create Food Category"
                    : editId
                    ? "Update Food Dish"
                    : "Add Dish to Menu"}
                </span>
              </h3>
              <button className="close-x-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            {/* Category Form in Modal */}
            {modalType === "categories" && (
              <form onSubmit={handleCategorySubmit}>
                <div className="modal-body modal-form">
                  <div className="form-group form-full-row">
                    <label>Category Title</label>
                    <input
                      type="text"
                      className="text-control"
                      placeholder="e.g. Starters, Main Course, Drinks..."
                      required
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group form-full-row">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label>Category Picture</label>
                      <div className="media-tabs">
                        <button
                          type="button"
                          className={`media-tab ${imageMode === "url" ? "active" : ""}`}
                          onClick={() => setImageMode("url")}
                        >
                          🔗 Paste URL
                        </button>
                        <button
                          type="button"
                          className={`media-tab ${imageMode === "file" ? "active" : ""}`}
                          onClick={() => setImageMode("file")}
                        >
                          📁 Upload File
                        </button>
                      </div>
                    </div>

                    {imageMode === "url" ? (
                      <div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <input
                            type="url"
                            className="text-control"
                            placeholder="Paste image URL (https://...)"
                            required={!editId && !previewUrl}
                            value={categoryForm.imageUrl}
                            onChange={(e) => {
                              const url = e.target.value;
                              setCategoryForm({ ...categoryForm, imageUrl: url, image: null });
                              setPreviewUrl(url || null);
                            }}
                          />
                          {previewUrl && <img src={previewUrl} alt="Thumb" className="preview-avatar" />}
                        </div>

                        {/* Quick Presets */}
                        <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", alignSelf: "center" }}>
                            Presets:
                          </span>
                          {SAMPLE_PRESETS.map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              className="media-tab"
                              style={{ fontSize: "11px" }}
                              onClick={() => {
                                setCategoryForm({ ...categoryForm, imageUrl: p.url, image: null });
                                setPreviewUrl(p.url);
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="dropzone-box"
                        onClick={() => document.getElementById("modal-cat-file").click()}
                      >
                        <span className="dropzone-trigger">Browse File</span>
                        <span className="dropzone-text">
                          {categoryForm.image ? categoryForm.image.name : "Select JPG/PNG from your computer..."}
                        </span>
                        <input
                          id="modal-cat-file"
                          type="file"
                          accept="image/*"
                          required={!editId && !previewUrl}
                          onChange={(e) => {
                            const file = e.target.files[0] || null;
                            setCategoryForm({ ...categoryForm, image: file, imageUrl: "" });
                            setPreviewUrl(file ? URL.createObjectURL(file) : null);
                          }}
                        />
                        {previewUrl && <img src={previewUrl} alt="Thumb" className="preview-avatar" />}
                      </div>
                    )}
                  </div>

                  <div className="form-group form-full-row">
                    <label>Description</label>
                    <textarea
                      className="text-control"
                      placeholder="Brief description of this food category..."
                      required
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editId ? "Update Category" : "Save Category"}
                  </button>
                </div>
              </form>
            )}

            {/* Food Form in Modal */}
            {modalType === "foods" && (
              <form onSubmit={handleFoodSubmit}>
                <div className="modal-body modal-form">
                  <div className="form-group">
                    <label>Dish Name</label>
                    <input
                      type="text"
                      className="text-control"
                      placeholder="e.g. Gourmet Double Burger"
                      required
                      value={foodForm.name}
                      onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Price (PKR / Rs.)</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      className="text-control"
                      placeholder="e.g. 750"
                      required
                      value={foodForm.price}
                      onChange={(e) => setFoodForm({ ...foodForm, price: e.target.value })}
                    />
                  </div>

                  <div className="form-group form-full-row">
                    <label>Category</label>
                    <select
                      className="text-control"
                      required
                      value={foodForm.category}
                      onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })}
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group form-full-row">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label>Dish Picture</label>
                      <div className="media-tabs">
                        <button
                          type="button"
                          className={`media-tab ${imageMode === "url" ? "active" : ""}`}
                          onClick={() => setImageMode("url")}
                        >
                          🔗 Paste URL
                        </button>
                        <button
                          type="button"
                          className={`media-tab ${imageMode === "file" ? "active" : ""}`}
                          onClick={() => setImageMode("file")}
                        >
                          📁 Upload File
                        </button>
                      </div>
                    </div>

                    {imageMode === "url" ? (
                      <div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <input
                            type="url"
                            className="text-control"
                            placeholder="Paste image link (https://...)"
                            required={!editId && !previewUrl}
                            value={foodForm.imageUrl}
                            onChange={(e) => {
                              const url = e.target.value;
                              setFoodForm({ ...foodForm, imageUrl: url, image: null });
                              setPreviewUrl(url || null);
                            }}
                          />
                          {previewUrl && <img src={previewUrl} alt="Thumb" className="preview-avatar" />}
                        </div>

                        {/* Quick Presets */}
                        <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", alignSelf: "center" }}>
                            Presets:
                          </span>
                          {SAMPLE_PRESETS.map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              className="media-tab"
                              style={{ fontSize: "11px" }}
                              onClick={() => {
                                setFoodForm({ ...foodForm, imageUrl: p.url, image: null });
                                setPreviewUrl(p.url);
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="dropzone-box"
                        onClick={() => document.getElementById("modal-food-file").click()}
                      >
                        <span className="dropzone-trigger">Browse File</span>
                        <span className="dropzone-text">
                          {foodForm.image ? foodForm.image.name : "Select dish image from your PC..."}
                        </span>
                        <input
                          id="modal-food-file"
                          type="file"
                          accept="image/*"
                          required={!editId && !previewUrl}
                          onChange={(e) => {
                            const file = e.target.files[0] || null;
                            setFoodForm({ ...foodForm, image: file, imageUrl: "" });
                            setPreviewUrl(file ? URL.createObjectURL(file) : null);
                          }}
                        />
                        {previewUrl && <img src={previewUrl} alt="Thumb" className="preview-avatar" />}
                      </div>
                    )}
                  </div>

                  <div className="form-group form-full-row">
                    <label>Ingredients & Taste Description</label>
                    <textarea
                      className="text-control"
                      placeholder="Describe dish flavor, spices, portion..."
                      required
                      value={foodForm.description}
                      onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editId ? "Update Dish" : "Add to Menu"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── CUSTOM DANGER CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-dialog confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="danger-icon-halo">⚠️</div>
            <h3>Delete Confirmation</h3>
            <p>
              Are you sure you want to permanently delete <strong>"{deleteTarget.name}"</strong>? This will remove the
              record directly from your MongoDB Atlas database.
            </p>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn-danger-confirm" onClick={confirmDelete}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

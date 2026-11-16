import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { notify } from '../utils/notify';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, ComposedChart } from 'recharts';
import { FiCheck, FiChevronLeft, FiChevronRight, FiEdit2, FiImage, FiPlus, FiTrash2, FiUploadCloud, FiX } from "react-icons/fi";
import { getBrandLogoUrl } from '../utils/logoHelper';
import './AdminPanel.css'; 
import './profile.css';
import AssignWorkerModal from '../components/AssignWorkerModal';
import InventoryPanel from '../components/InventoryPanel';
import PackageCard from '../components/PackageCard';
import { useSocket } from '../hooks/useSocket';
import { API_BASE_URL } from '../config/api';

const ORDER_STATUS_WEIGHT = { pending: 0, delivered: 1, completed: 2, cancelled: 3 };
const MAX_UPLOAD_IMAGES = 5;
const normalize = (value) => String(value || "").toLowerCase();
const hasCustomizationNotes = (order) =>
  (order.items || []).some((item) => String(item.specialInstructions || "").trim().length > 0);
const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const ExportFileIcon = () => (
  <svg fill="#fff" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 50 50" aria-hidden="true">
    <path d="M28.8125 .03125L.8125 5.34375C.339844 5.433594 0 5.863281 0 6.34375L0 43.65625C0 44.136719 .339844 44.566406 .8125 44.65625L28.8125 49.96875C28.875 49.980469 28.9375 50 29 50C29.230469 50 29.445313 49.929688 29.625 49.78125C29.855469 49.589844 30 49.296875 30 49L30 1C30 .703125 29.855469 .410156 29.625 .21875C29.394531 .0273438 29.105469 -.0234375 28.8125 .03125ZM32 6L32 13L34 13L34 15L32 15L32 20L34 20L34 22L32 22L32 27L34 27L34 29L32 29L32 35L34 35L34 37L32 37L32 44L47 44C48.101563 44 49 43.101563 49 42L49 8C49 6.898438 48.101563 6 47 6ZM36 13L44 13L44 15L36 15ZM6.6875 15.6875L11.8125 15.6875L14.5 21.28125C14.710938 21.722656 14.898438 22.265625 15.0625 22.875L15.09375 22.875C15.199219 22.511719 15.402344 21.941406 15.6875 21.21875L18.65625 15.6875L23.34375 15.6875L17.75 24.9375L23.5 34.375L18.53125 34.375L15.28125 28.28125C15.160156 28.054688 15.035156 27.636719 14.90625 27.03125L14.875 27.03125C14.8125 27.316406 14.664063 27.761719 14.4375 28.34375L11.1875 34.375L6.1875 34.375L12.15625 25.03125ZM36 20L44 20L44 22L36 22ZM36 27L44 27L44 29L36 29ZM36 35L44 35L44 37L36 37Z"></path>
  </svg>
);

const getAvatarUrl = (gender) => {
    const normalized = (gender || '').toLowerCase();
    if (normalized === 'female') return 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png';
    return 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
};

const AdminPanel = () => {
  // Use local storage instead of Redux
  const [userData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  });
  const token = localStorage.getItem("token");
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('overview'); 
  const [selectedMetric, setSelectedMetric] = useState('orders'); 

  // --- DATA ---
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [cars, setCars] = useState([]);
  const [packages, setPackages] = useState([]);
  const [subStatusBusyId, setSubStatusBusyId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewFilterRating, setReviewFilterRating] = useState('all');
  const [reviewSort, setReviewSort] = useState('newest');
  const [expandedReview, setExpandedReview] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [loading, setLoading] = useState({
    users: false,
    bookings: false,
    orders: false,
    subscriptions: false,
    packages: false,
    cars: false,
    analytics: false,
  });
  const [statusBusyId, setStatusBusyId] = useState("");
  const [assignModalBooking, setAssignModalBooking] = useState(null);

  // Orders operations controls
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");
  const [orderCustomizationFilter, setOrderCustomizationFilter] = useState("all");
  const [orderSortBy, setOrderSortBy] = useState("newest");

  // --- MENU/SERVICES FORM ---
  const [editingId, setEditingId] = useState(null); 
  const [formData, setFormData] = useState({ title: "", description: "", price: "", stock: "", category: "wash" });
  const [selectedImages, setSelectedImages] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const imagesRef = useRef();

  const [washModal, setWashModal] = useState({ isOpen: false, subId: '' });
  const [washDate, setWashDate] = useState(new Date().toISOString().split('T')[0]);

  const userRole = (userData?.role || 'admin').toLowerCase();

  // --- COLORS ---
  const COLORS = ['#4361ee', '#3a0ca3', '#f72585', '#4cc9f0', '#10b981', '#f59e0b'];

  const setLoadingFor = useCallback((keys, value) => {
    setLoading((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        next[key] = value;
      });
      return next;
    });
  }, []);

  const syncFileInputWithSelection = useCallback((files) => {
    if (!imagesRef.current) return;
    try {
      const transfer = new DataTransfer();
      files.forEach((file) => transfer.items.add(file));
      imagesRef.current.files = transfer.files;
    } catch {
      if (files.length === 0) {
        imagesRef.current.value = "";
      }
    }
  }, []);

  const clearMenuUploadFiles = useCallback(() => {
    setSelectedImages([]);
    setIsDragActive(false);
    if (imagesRef.current) {
      imagesRef.current.value = "";
    }
  }, []);

  const setMenuUploadFiles = useCallback((incomingFiles) => {
    const rawFiles = Array.from(incomingFiles || []);
    if (!rawFiles.length) {
      clearMenuUploadFiles();
      return;
    }

    const imageFiles = rawFiles.filter((file) => String(file.type || "").startsWith("image/"));
    if (rawFiles.length !== imageFiles.length) {
      notify.warning("Warning - Only image files are allowed.");
    }

    const limitedFiles = imageFiles.slice(0, MAX_UPLOAD_IMAGES);
    if (imageFiles.length > MAX_UPLOAD_IMAGES) {
      notify.info(`Info - Only the first ${MAX_UPLOAD_IMAGES} images were selected.`);
    }

    setSelectedImages(limitedFiles);
    syncFileInputWithSelection(limitedFiles);
  }, [clearMenuUploadFiles, syncFileInputWithSelection]);

  const imagePreviews = useMemo(() => {
    return selectedImages.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    }));
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  const formatFileSize = useCallback((bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }, []);

  // --- FETCH DATA ---
  const fetchData = useCallback(async (tabName = activeTab) => {
    if (!token) return;

    const config = { headers: { Authorization: `Bearer ${token}` } };
    const loadingMap = {
      overview: ["users", "bookings", "orders", "packages", "cars"],
      users: ["users"],
      cars: ["cars"],
      bookings: ["bookings"],
      orders: ["orders"],
      subscriptions: ["subscriptions"],
      packages: ["packages"],
      business: ["analytics"],
    };

    setFetchError("");
    setLoadingFor(loadingMap[tabName] || [], true);

    try {
      if (tabName === "overview") {
        const [usersRes, bookingsRes, ordersRes, productsRes, carsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/auth/users`, config).catch(() => ({ data: { data: [] }})),
          axios.get(`${API_BASE_URL}/reservation/admin/all`, config).catch(() => ({ data: { data: [] }})),
          axios.get(`${API_BASE_URL}/order/admin/all`, config).catch(() => ({ data: { data: [] }})),
          axios.get(`${API_BASE_URL}/packages`).catch(() => ({ data: { data: [] }})),
          axios.get(`${API_BASE_URL}/cars/admin/all`, config).catch(() => ({ data: { data: { cars: [] } }})),
        ]);
        setUsers(usersRes.data.data || []);
        setBookings(bookingsRes.data.data || []);
        setOrders(ordersRes.data.data || []);
        setPackages(productsRes.data.data || []);
        setCars(carsRes.data.data?.cars || []);
      } else if (tabName === "users") {
        const usersRes = await axios.get(`${API_BASE_URL}/auth/users`, config);
        setUsers(usersRes.data.data || []);
      } else if (tabName === "business") {
        const analyticsRes = await axios.get(`${API_BASE_URL}/reservation/admin/analytics`, config);
        setAnalytics(analyticsRes.data.data);
      } else if (tabName === "bookings") {
        const bookingsRes = await axios.get(`${API_BASE_URL}/reservation/admin/all`, config);
        setBookings(bookingsRes.data.data || []);
      } else if (tabName === "orders") {
        const ordersRes = await axios.get(`${API_BASE_URL}/order/admin/all`, config);
        setOrders(ordersRes.data.data || []);
      } else if (tabName === "subscriptions") {
        const subsRes = await axios.get(`${API_BASE_URL}/order/admin/subscriptions`, config);
        setSubscriptions(subsRes.data.data || []);
      } else if (tabName === "packages") {
        const productsRes = await axios.get(`${API_BASE_URL}/packages`);
        setPackages(productsRes.data.data || []);
      } else if (tabName === "cars") {
        const carsRes = await axios.get(`${API_BASE_URL}/cars/admin/all`, config);
        setCars(carsRes.data.data?.cars || []);
      }
    } catch (error) {
      console.error("Error fetching data", error);
      setFetchError(error.response?.data?.message || "Failed to load data. Please try again.");
    } finally {
      setLoadingFor(loadingMap[tabName] || [], false);
    }
  }, [activeTab, setLoadingFor, token]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  // --- CHART DATA GENERATOR ---
  const getChartData = () => {
    let data = [];
    if (selectedMetric === 'orders') {
        data = [
            { name: 'Pending', value: orders.filter(o => o.status === 'pending').length },
            { name: 'Completed', value: orders.filter(o => o.status === 'completed').length },
            { name: 'Cancelled', value: orders.filter(o => o.status === 'cancelled').length },
        ];
    } else if (selectedMetric === 'bookings') {
        data = [
            { name: 'Pending', value: bookings.filter(b => b.status === 'pending' || !b.status).length },
            { name: 'Accepted', value: bookings.filter(b => normalize(b.status) === 'accepted').length },
            { name: 'Rejected', value: bookings.filter(b => normalize(b.status) === 'rejected').length },
        ];
    } else if (selectedMetric === 'users') {
        data = [
            { name: 'Admins', value: users.filter(u => u.role === 'admin').length },
            { name: 'Users', value: users.filter(u => u.role === 'user').length },
        ];
    } else if (selectedMetric === 'packages') {
        const stats = {};
        packages.forEach(p => {
            const cat = p.category ? (p.category.charAt(0).toUpperCase() + p.category.slice(1)) : "Other";
            stats[cat] = (stats[cat] || 0) + 1;
        });
        data = Object.keys(stats).map(key => ({ name: key, value: stats[key] }));
    }
    return data.filter(d => d.value > 0);
  };

  const getChartTitle = () => {
      if (selectedMetric === 'orders') return "Service Requests Distribution";
      if (selectedMetric === 'bookings') return "Reservation Status";
      if (selectedMetric === 'users') return "User Roles Breakdown";
      return "Packages Categories";
  };

  const formatConfirmedDateTime = (dateValue) => {
    if (!dateValue) return "-";
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return "-";

    return parsedDate.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatReservationSchedule = (reservation) => {
    const reservationDate = reservation?.date ? formatConfirmedDateTime(reservation.date) : "-";
    if (!reservation?.time) return reservationDate;
    return `${reservationDate} (${reservation.time})`;
  };

  const resolveReservationVehicle = (reservation) => {
      const car = reservation?.vehicle?.car;
      if (car && car.brand) {
          return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img 
                      src={getBrandLogoUrl(car.brand)} 
                      alt={car.brand} 
                      style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong>{car.brand}</strong>
                      <span>{car.model}</span>
                      <span style={{ color: '#64748b' }}>{car.year}</span>
                      <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#0f172a', padding: '2px 8px', fontSize: '0.7rem' }}>{car.plateNumber}</span>
                  </div>
              </div>
          );
      }
      return reservation?.vehicle?.label || reservation?.vehicleTypeLabel || reservation?.vehicle?.type || "-";
  };

  const normalizedSearch = useMemo(() => normalize(searchTerm).trim(), [searchTerm]);

  const filteredUsers = useMemo(() => {
    if (!normalizedSearch) return users;
    return users.filter((user) =>
      `${user._id} ${user.name} ${user.email} ${user.role}`.toLowerCase().includes(normalizedSearch)
    );
  }, [users, normalizedSearch]);

  const filteredBookings = useMemo(() => {
    if (!normalizedSearch) return bookings;
    return bookings.filter((booking) =>
      `${booking._id} ${booking.userName || booking.name || ""} ${booking.date || ""} ${booking.time || ""} ${booking.vehicle?.label || booking.vehicle?.type || booking.vehicleTypeLabel || ""} ${booking.washPackage?.name || ""} ${booking.status || ""}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [bookings, normalizedSearch]);

  const filteredCars = useMemo(() => {
    if (!normalizedSearch) return cars;
    return cars.filter((car) =>
      `${car.type} ${car.brand} ${car.model} ${car.plateNumber} ${car.user?.name || ""}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [cars, normalizedSearch]);

  const filteredOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      const orderStatus = normalize(order.status);
      const paymentMethod = normalize(order.paymentMethod || "cash");
      const noteExists = hasCustomizationNotes(order);

      if (orderStatusFilter !== "all" && orderStatus !== orderStatusFilter) return false;
      if (orderPaymentFilter !== "all" && paymentMethod !== orderPaymentFilter) return false;
      if (orderCustomizationFilter === "with-notes" && !noteExists) return false;
      if (orderCustomizationFilter === "without-notes" && noteExists) return false;

      if (!normalizedSearch) return true;

      const itemsText = (order.items || [])
        .map((item) => `${item.title || ""} ${item.specialInstructions || ""}`)
        .join(" ")
        .toLowerCase();

      return `${order._id} ${order.userName || ""} ${itemsText} ${orderStatus} ${paymentMethod}`
        .toLowerCase()
        .includes(normalizedSearch);
    });

    return filtered.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      const aTotal = Number(a.totalAmount || 0);
      const bTotal = Number(b.totalAmount || 0);
      const aUser = String(a.userName || "");
      const bUser = String(b.userName || "");

      switch (orderSortBy) {
        case "oldest":
          return aDate - bDate;
        case "total-high":
          return bTotal - aTotal;
        case "total-low":
          return aTotal - bTotal;
        case "user-az":
          return aUser.localeCompare(bUser);
        case "user-za":
          return bUser.localeCompare(aUser);
        case "status":
          return (
            (ORDER_STATUS_WEIGHT[normalize(a.status)] ?? 99) -
            (ORDER_STATUS_WEIGHT[normalize(b.status)] ?? 99)
          );
        case "newest":
        default:
          return bDate - aDate;
      }
    });
  }, [
    orders,
    orderStatusFilter,
    orderPaymentFilter,
    orderCustomizationFilter,
    normalizedSearch,
    orderSortBy,
  ]);

  const orderSummary = useMemo(() => {
    const withNotes = filteredOrders.filter((order) => hasCustomizationNotes(order)).length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    return { count: filteredOrders.length, withNotes, totalRevenue };
  }, [filteredOrders]);

  const downloadOrdersCSV = () => {
    const headers = "Request ID,User,Packages,Custom Notes,Total,Payment,Status,Confirmed Time\n";
    const rows = filteredOrders
      .map((order) => {
        const items = (order.items || []).map((item) => `${item.quantity}x ${item.title}`).join(" | ");
        const notes = (order.items || [])
          .filter((item) => String(item.specialInstructions || "").trim())
          .map((item) => `${item.title}: ${item.specialInstructions}`)
          .join(" | ");

        return [order._id, order.userName || "Guest", items, notes, order.totalAmount, order.paymentMethod || "cash", order.status, formatConfirmedDateTime(order.createdAt)]
          .map(escapeCsv)
          .join(",");
      })
      .join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(`data:text/csv;charset=utf-8,${headers}${rows}`);
    link.download = "service_requests.csv";
    link.click();
    notify.success("Success - Requests exported successfully.");
  };

  const downloadUsersCSV = () => {
    const headers = "User ID,Name,Email,Role\n";
    const rows = filteredUsers
      .map((user) => [user._id, user.name, user.email, user.role].map(escapeCsv).join(","))
      .join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(`data:text/csv;charset=utf-8,${headers}${rows}`);
    link.download = "users_list.csv";
    link.click();
    notify.success("Success - Users exported successfully.");
  };

  const handleUserRoleChange = async (id, role) => {
    if (userData._id === id && !window.confirm("Change your own role?")) return;
    try {
      await axios.put(`${API_BASE_URL}/auth/users/${id}/role`, { role }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers((prev) => prev.map((user) => (user._id === id ? { ...user, role } : user)));
      notify.success(`Success - Role changed to ${role}.`);
    } catch {
      notify.error("Error - Failed to update user role.");
    }
  };

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/packages/${editingId}`, formData, config);
        notify.success("Success - Package updated.");
      } else {
        const data = new FormData();
        Object.keys(formData).forEach((key) => data.append(key, formData[key]));
        if (selectedImages.length > 0) {
          selectedImages.forEach((file) => data.append("images", file));
        } else {
          return notify.error("Error - At least one image is required.");
        }
        await axios.post(`${API_BASE_URL}/packages`, data, {
          headers: { ...config.headers, "Content-Type": "multipart/form-data" },
        });
        notify.success("Success - Package created.");
      }

      setFormData({ title: "", description: "", price: "", stock: "", category: "wash" });
      setEditingId(null);
      clearMenuUploadFiles();
      fetchData("packages");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save package.";
      notify.error(`Error - ${msg}`);
    }
  };

  const handleEditClick = (product) => {
    clearMenuUploadFiles();
    setEditingId(product._id);
    setFormData({
      title: product.title,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
    });
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this package?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/packages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPackages((prev) => prev.filter((pkg) => pkg._id !== id));
      notify.success("Success - Package removed.");
    } catch {
      notify.error("Error - Failed to delete package.");
    }
  };

  const handleMoveProduct = async (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === packages.length - 1) return;

    const reordered = [...packages];
    const temp = reordered[index];
    reordered[index] = reordered[index + direction];
    reordered[index + direction] = temp;
    reordered.forEach((product, orderIndex) => {
      product.order = orderIndex;
    });

    setPackages(reordered);

    try {
      const payload = reordered.map((product) => ({ id: product._id, order: product.order }));
      await axios.put(
        `${API_BASE_URL}/packages/reorder`,
        { items: payload },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      notify.success("Success - Package order updated.");
    } catch {
      notify.error("Error - Failed to reorder package.");
      fetchData("packages");
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      setStatusBusyId(orderId);
      await axios.put(
        `${API_BASE_URL}/order/${orderId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders((prev) => prev.map((order) => (order._id === orderId ? { ...order, status } : order)));
      notify.success(`Success - Request marked as ${status}.`);
    } catch {
      notify.error("Error - Failed to update request.");
    } finally {
      setStatusBusyId("");
    }
  };

  const updateReservationStatus = async (reservationId, status) => {
    try {
      await axios.put(
        `${API_BASE_URL}/reservation/${reservationId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookings((prev) =>
        prev.map((booking) => (booking._id === reservationId ? { ...booking, status } : booking))
      );
      notify.success(`Success - Reservation set to ${status}.`);
    } catch {
      notify.error("Error - Failed to update reservation.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-changed'));
    window.location.href = '/login';
  };

  return (
    <div className="admin-wrapper">
      <aside className="admin-sidebar" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="user-profile-snap">
            <div className="profile-avatar" style={{ padding: 0, overflow: 'hidden', width: '105px', height: '105px', borderRadius: '50%', margin: '0 auto 15px', border: '4px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%) border-box', boxShadow: '0 10px 25px rgba(67, 97, 238, 0.25)' }}>
                <img src={getAvatarUrl(userData?.gender)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h4>{userData?.name || 'Admin'}</h4>
            <span className={`sidebar-role-badge ${userRole === 'admin' ? 'admin' : 'user'}`}>
              {userRole === 'admin' ? 'System Administrator' : 'Staff'}
            </span>
            <p>{userData?.email || '-'}</p>
          </div>
          <nav className="admin-nav">
              {['overview','business','bookings','subscriptions','users','cars','packages', 'reviews', 'inventory'].map(t => (
                  <button key={t} className={activeTab === t ? 'active' : ''} onClick={() => setActiveTab(t)}>{t === 'business' ? 'Business' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
          </nav>
        </div>
        <button className="btn-logout slide-bg-btn" onClick={handleLogout}>Log Out</button>
      </aside>

      <main className="admin-main">
        {activeTab !== 'overview' && activeTab !== 'packages' && activeTab !== 'inventory' && activeTab !== 'business' && (
             <div className="admin-header-actions">
                <input
                  type="text"
                  placeholder={activeTab === "orders" ? "Search request ID, user, item, or note" : "Search"}
                  className="search-bar"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="admin-header-buttons">
                  <button className="btn-export btn-refresh" onClick={() => fetchData(activeTab)}>Refresh</button>
                  {activeTab === 'orders' && (
                    <button className="container-btn-file" onClick={downloadOrdersCSV}>
                      <ExportFileIcon />
                      Export Requests
                    </button>
                  )}
                  {activeTab === 'users' && (
                    <button className="container-btn-file" onClick={downloadUsersCSV}>
                      <ExportFileIcon />
                      Export Users
                    </button>
                  )}
                </div>
             </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
            <div className="overview-container">
                {fetchError ? (
                  <div className="admin-state-card error">
                    <h3>Failed to load dashboard data</h3>
                    <p>{fetchError}</p>
                    <button className="btn-save" style={{width: 'auto', marginTop: 15, padding: '10px 20px'}} onClick={() => fetchData("overview")}>Retry</button>
                  </div>
                ) : (loading.users || loading.bookings || loading.orders || loading.products) ? (
                  <>
                    <div className="stats-grid">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="stat-box stat-skeleton"></div>
                      ))}
                    </div>
                    <div className="chart-section chart-skeleton"></div>
                  </>
                ) : (
                  <>
                    <div className="stats-grid">
                        <div className={`stat-box blue ${selectedMetric==='orders'?'active-metric':''}`} onClick={()=>setSelectedMetric('orders')}><h3>{orders.length}</h3><p>Package Requests</p></div>
                        <div className={`stat-box green ${selectedMetric==='bookings'?'active-metric':''}`} onClick={()=>setSelectedMetric('bookings')}><h3>{bookings.length}</h3><p>Reservations</p></div>
                        <div className={`stat-box purple ${selectedMetric==='users'?'active-metric':''}`} onClick={()=>setSelectedMetric('users')}><h3>{users.length}</h3><p>Users</p></div>
                        <div className={`stat-box orange ${selectedMetric==='packages'?'active-metric':''}`} onClick={()=>setSelectedMetric('packages')}><h3>{packages.length}</h3><p>Packages</p></div>
                    </div>

                    <div className="digital-card-container hover-lift" style={{ marginTop: '20px', maxWidth: '400px' }}>
                        <div className={`digital-id-card shimmer-card ${userRole === 'admin' ? 'admin-theme' : 'user-theme'}`}>
                            <div className="card-top-row">
                                <div className="card-logo">Administrative Identity</div>
                                <div className="card-chip" />
                            </div>

                            <div className="card-middle-row">
                                <h4>{userData?.name || 'Administrator'}</h4>
                                <span className="card-role-text">
                                    {userRole === 'admin' ? 'System Administrator' : 'Staff'}
                                </span>
                            </div>

                            <div className="card-bottom-row">
                                <div className="card-stat">
                                    <span>Email Address</span>
                                    <strong>{userData?.email || '-'}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {getChartData().length > 0 && (
                        <div className="chart-section">
                            <h3>{getChartTitle()}</h3>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={getChartData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                            {getChartData().map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                  </>
                )}
            </div>
        )}

        {/* BUSINESS INTELLIGENCE */}
        {activeTab === 'business' && (() => {
          const EXPENSE_RATE = 0.35; // 35% of revenue as estimated operational cost
          const totalRevenue = analytics?.totals?.revenue || 0;
          const washRevenue = analytics?.totals?.washRevenue || 0;
          const orderRevenue = analytics?.totals?.orderRevenue || 0;
          const estimatedExpenses = totalRevenue * EXPENSE_RATE;
          const netProfit = totalRevenue - estimatedExpenses;
          const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

          const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const monthlyChartData = (analytics?.monthly || []).map(m => ({
            name: `${MONTH_NAMES[(m._id.month - 1) % 12]} '${String(m._id.year).slice(-2)}`,
            revenue: +(m.revenue || 0).toFixed(2),
            expenses: +((m.revenue || 0) * EXPENSE_RATE).toFixed(2),
            profit: +((m.revenue || 0) * (1 - EXPENSE_RATE)).toFixed(2),
            bookings: m.count || 0,
            completed: m.completed || 0,
            cancelled: m.cancelled || 0,
          }));

          const paymentData = (analytics?.paymentBreakdown || []).map(p => ({
            name: (p._id || 'cash').toUpperCase(),
            value: p.count,
            revenue: +(p.revenue || 0).toFixed(2),
          }));

          // ── Visa vs Cash combined summary ────────────────────────
          const paymentSummary = (analytics?.paymentSummary || []).map(p => ({
            name: p.name || 'CASH',
            bookingCount: p.bookingCount || 0,
            subCount: p.subCount || 0,
            count: p.count || 0,
            revenue: +(p.revenue || 0),
          }));

          const packageData = (analytics?.packages || []).map(p => ({
            name: p._id || 'Unknown',
            bookings: p.count,
            revenue: +(p.revenue || 0).toFixed(2),
          }));

          const statusData = analytics?.statusDistribution || [];

          const BIColors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

          const fmtEGP = (n) => `${Number(n || 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;

          return (
            <div className="overview-container bi-dashboard">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }}>Business Intelligence</h2>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.92rem' }}>Financial overview — revenues, expenses & net profit</p>
                </div>
                <button className="btn-export btn-refresh" onClick={() => fetchData('business')} style={{ borderRadius: '12px', padding: '10px 22px', height: 'auto' }}>↻ Refresh</button>
              </div>

              {loading.analytics ? (
                <>
                  <div className="stats-grid" style={{ marginBottom: '28px' }}>
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="stat-box stat-skeleton" />)}
                  </div>
                  <div className="chart-skeleton" />
                </>
              ) : fetchError ? (
                <div className="admin-state-card error">
                  <h3>Failed to load business data</h3>
                  <p>{fetchError}</p>
                  <button className="btn-save" style={{ width: 'auto', marginTop: 15, padding: '10px 20px' }} onClick={() => fetchData('business')}>Retry</button>
                </div>
              ) : analytics ? (
                <>
                  {/* ── KPI Cards ── */}
                  <div className="bi-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                    <div className="bi-kpi-card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: '18px', padding: '22px 20px', color: '#fff', boxShadow: '0 8px 24px rgba(99,102,241,0.3)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 8 }}>Total Revenue</div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.15 }}>{fmtEGP(totalRevenue)}</div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: 6 }}>Wash: {fmtEGP(washRevenue)} · Orders: {fmtEGP(orderRevenue)}</div>
                      <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: '4.5rem', opacity: 0.12 }}>💰</div>
                    </div>

                    <div className="bi-kpi-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '18px', padding: '22px 20px', color: '#fff', boxShadow: '0 8px 24px rgba(239,68,68,0.3)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 8 }}>Est. Expenses</div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.15 }}>{fmtEGP(estimatedExpenses)}</div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: 6 }}>Operational cost est. @ 35%</div>
                      <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: '4.5rem', opacity: 0.12 }}>📉</div>
                    </div>

                    <div className="bi-kpi-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '18px', padding: '22px 20px', color: '#fff', boxShadow: '0 8px 24px rgba(16,185,129,0.3)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 8 }}>Net Profit</div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.15 }}>{fmtEGP(netProfit)}</div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: 6 }}>Profit margin: {profitMargin}%</div>
                      <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: '4.5rem', opacity: 0.12 }}>📈</div>
                    </div>

                    <div className="bi-kpi-card" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', borderRadius: '18px', padding: '22px 20px', color: '#fff', boxShadow: '0 8px 24px rgba(14,165,233,0.3)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 8 }}>Total Bookings</div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.15 }}>{analytics.totals.bookings}</div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: 6 }}>✅ {analytics.totals.completed} completed · ⏳ {analytics.totals.pending} pending</div>
                      <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: '4.5rem', opacity: 0.12 }}>📋</div>
                    </div>

                    <div className="bi-kpi-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '18px', padding: '22px 20px', color: '#fff', boxShadow: '0 8px 24px rgba(245,158,11,0.3)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 8 }}>Completion Rate</div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.15 }}>
                        {analytics.totals.bookings > 0 ? ((analytics.totals.completed / analytics.totals.bookings) * 100).toFixed(1) : 0}%
                      </div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: 6 }}>❌ {analytics.totals.cancelled || 0} cancelled/rejected</div>
                      <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: '4.5rem', opacity: 0.12 }}>🎯</div>
                    </div>

                    <div className="bi-kpi-card" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', borderRadius: '18px', padding: '22px 20px', color: '#fff', boxShadow: '0 8px 24px rgba(139,92,246,0.3)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 8 }}>Avg. Revenue / Booking</div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.15 }}>
                        {fmtEGP(analytics.totals.completed > 0 ? washRevenue / analytics.totals.completed : 0)}
                      </div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: 6 }}>Per completed wash session</div>
                      <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: '4.5rem', opacity: 0.12 }}>💎</div>
                    </div>
                  </div>

                  {/* ── Revenue by Payment Method (Visa vs Cash) ── */}
                  <div className="chart-section" style={{ marginBottom: '22px', padding: '24px 28px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '6px' }}>💳 Revenue by Payment Method</h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '18px', marginTop: 0 }}>
                      Across all wash bookings &amp; subscriptions (excl. cancelled)
                    </p>
                    {paymentSummary.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No payment data yet.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        {paymentSummary.map((pm) => {
                          const isVisa = pm.name === 'VISA';
                          const bg = isVisa
                            ? 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)'
                            : 'linear-gradient(135deg, #065f46 0%, #10b981 100%)';
                          const icon = isVisa ? '💳' : '💵';
                          const totalRev = paymentSummary.reduce((s, p) => s + p.revenue, 0);
                          const pct = totalRev > 0 ? ((pm.revenue / totalRev) * 100).toFixed(1) : 0;
                          return (
                            <div key={pm.name} style={{ background: bg, borderRadius: '18px', padding: '22px 24px', color: '#fff', boxShadow: isVisa ? '0 8px 24px rgba(59,130,246,0.3)' : '0 8px 24px rgba(16,185,129,0.3)', position: 'relative', overflow: 'hidden' }}>
                              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{icon}</div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 6 }}>
                                {pm.name} Payments
                              </div>
                              <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.2 }}>{fmtEGP(pm.revenue)}</div>
                              <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <span>🧾 {pm.bookingCount} booking{pm.bookingCount !== 1 ? 's' : ''}</span>
                                <span>📦 {pm.subCount} subscription{pm.subCount !== 1 ? 's' : ''}</span>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', opacity: 1, marginTop: 4 }}>{pct}% of total revenue</span>
                              </div>
                              {/* Progress bar */}
                              <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 999 }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 999, transition: 'width 0.6s ease' }} />
                              </div>
                              <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: '5rem', opacity: 0.08 }}>{isVisa ? '💳' : '💵'}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── Profit Margin Progress Bar ── */}
                  <div className="chart-section" style={{ marginBottom: '22px', padding: '24px 28px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '18px' }}>Revenue vs. Expenses vs. Net Profit</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[
                        { label: 'Total Revenue', value: totalRevenue, total: totalRevenue, color: '#6366f1' },
                        { label: 'Est. Expenses (35%)', value: estimatedExpenses, total: totalRevenue, color: '#ef4444' },
                        { label: 'Net Profit (65%)', value: netProfit, total: totalRevenue, color: '#10b981' },
                      ].map(bar => (
                        <div key={bar.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                            <span>{bar.label}</span>
                            <span style={{ color: bar.color }}>{fmtEGP(bar.value)}</span>
                          </div>
                          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${bar.total > 0 ? Math.min(100, (bar.value / bar.total) * 100) : 0}%`, background: bar.color, borderRadius: 999, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Row 1: Revenue Trend + Bookings Trend ── */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                    {/* Revenue Area Chart */}
                    <div className="chart-section" style={{ flex: '1 1 500px' }}>
                      <h3>Monthly Revenue vs. Expenses vs. Profit</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={monthlyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v, n) => [`${Number(v).toFixed(2)} EGP`, n]} />
                          <Legend />
                          <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradRevenue)" />
                          <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#gradExpenses)" strokeDasharray="4 2" />
                          <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={2.5} fill="url(#gradProfit)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Monthly Bookings Bar Chart */}
                    <div className="chart-section" style={{ flex: '1 1 340px' }}>
                      <h3>Monthly Bookings Overview</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ── Row 2: Status Distribution + Payment Breakdown ── */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                    {/* Booking Status Donut */}
                    <div className="chart-section" style={{ flex: '1 1 280px' }}>
                      <h3>Booking Status Distribution</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {statusData.map((entry, index) => (<Cell key={`sc-${index}`} fill={entry.color} />))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Payment Method Breakdown */}
                    <div className="chart-section" style={{ flex: '1 1 280px' }}>
                      <h3>Payment Method Breakdown</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={paymentData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                            {paymentData.map((entry, index) => (<Cell key={`pm-${index}`} fill={BIColors[index % BIColors.length]} />))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, `${n} bookings`]} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                        {paymentData.map((pm, i) => (
                          <div key={pm.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: BIColors[i % BIColors.length], display: 'inline-block' }} />
                              {pm.name}
                            </span>
                            <span style={{ color: '#10b981' }}>{fmtEGP(pm.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Popular Packages by Revenue */}
                    <div className="chart-section" style={{ flex: '1 1 320px' }}>
                      <h3>Service Revenue by Package</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={packageData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                          <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} EGP`, 'Revenue']} />
                          <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                            {packageData.map((_, index) => (<Cell key={`pkg-${index}`} fill={BIColors[index % BIColors.length]} />))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ── Top Customers Table ── */}
                  {analytics.topCustomers && analytics.topCustomers.length > 0 && (
                    <div className="chart-section" style={{ marginBottom: '20px' }}>
                      <h3>🏆 Top Customers by Spending</h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table" style={{ minWidth: 'auto' }}>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Customer</th>
                              <th>Total Bookings</th>
                              <th>Total Spent</th>
                              <th>Avg. Per Booking</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.topCustomers.map((c, i) => (
                              <tr key={c._id}>
                                <td>
                                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: ['#f59e0b','#94a3b8','#cd7c54','#6366f1','#10b981'][i] || '#6366f1', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                                    {i + 1}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 700 }}>{c._id}</td>
                                <td>{c.bookings}</td>
                                <td style={{ color: '#10b981', fontWeight: 700 }}>{fmtEGP(c.spent)}</td>
                                <td style={{ color: '#6366f1', fontWeight: 600 }}>{fmtEGP(c.bookings > 0 ? c.spent / c.bookings : 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── Financial Summary Table ── */}
                  <div className="chart-section">
                    <h3>📊 Financial Summary</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                      {[
                        { label: 'Wash Service Revenue', value: fmtEGP(washRevenue), icon: '🚿', color: '#6366f1' },
                        { label: 'Subscription / Order Revenue', value: fmtEGP(orderRevenue), icon: '📦', color: '#0ea5e9' },
                        { label: 'Gross Revenue', value: fmtEGP(totalRevenue), icon: '💰', color: '#f59e0b' },
                        { label: 'Estimated Expenses', value: fmtEGP(estimatedExpenses), icon: '💸', color: '#ef4444' },
                        { label: 'Net Profit', value: fmtEGP(netProfit), icon: '📈', color: '#10b981' },
                        { label: 'Profit Margin', value: `${profitMargin}%`, icon: '🎯', color: '#8b5cf6' },
                      ].map(item => (
                        <div key={item.label} style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: item.color, marginTop: 3 }}>{item.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="admin-state-card">
                  <h3>No business data yet</h3>
                  <p>Business data will appear once bookings and orders are placed.</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* BOOKINGS */}
        {activeTab === 'bookings' && (
            <div className="panel-section">
                <h2>Reservations</h2>
                {loading.bookings ? (
                  <div className="admin-skeleton-table">
                    {Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="admin-skeleton-row"></div>)}
                  </div>
                ) : fetchError ? (
                  <div className="admin-state-card error">
                    <h3>Failed to load reservations</h3>
                    <p>{fetchError}</p>
                    <button className="btn-save" style={{width: 'auto', marginTop: 15, padding: '10px 20px'}} onClick={() => fetchData("bookings")}>Retry</button>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="admin-state-card">
                    <h3>No reservations found</h3>
                    <p>Try changing the search term.</p>
                  </div>
                ) : (
                  <div style={{overflowX: 'auto'}}>
                    <table className="admin-table">
                        <thead><tr><th>Name</th><th>Date</th><th>Vehicle</th><th>Service</th><th>Assigned To</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>
                            {filteredBookings.map(b => (
                                <tr key={b._id}>
                                  <td>{b.userName || b.name || '-'}</td>
                                  <td>{formatReservationSchedule(b)}</td>
                                  <td>{resolveReservationVehicle(b)}</td>
                                  <td style={{ fontSize: '0.8rem' }}>{b.washPackage?.name || '-'}</td>
                                  <td>
                                    {b.assignedTo ? (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                                        {b.assignedTo?.name || 'Assigned'}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Unassigned</span>
                                    )}
                                  </td>
                                  <td><span className={`badge ${normalize(b.status)}`}>{normalize(b.status) || 'pending'}</span></td>
                                  <td>
                                    <button
                                      className="btn-icon check"
                                      onClick={() => setAssignModalBooking(b)}
                                      title="Accept reservation and assign worker"
                                      aria-label="Accept reservation and assign worker"
                                    >
                                      <FiCheck />
                                    </button>
                                    <button
                                      className="btn-icon cross"
                                      onClick={() => updateReservationStatus(b._id, 'rejected')}
                                      title="Reject reservation"
                                      aria-label="Reject reservation"
                                    >
                                      <FiX />
                                    </button>
                                  </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                )}
            </div>
        )}

        {/* REVIEWS */}
        {activeTab === 'reviews' && (() => {
            const reviewBookings = bookings.filter(b => b.rating);
            const totalReviews = reviewBookings.length;
            const avgRating = totalReviews > 0 ? (reviewBookings.reduce((sum, b) => sum + b.rating, 0) / totalReviews).toFixed(1) : 0;
            const ratingCounts = { 5:0, 4:0, 3:0, 2:0, 1:0 };
            reviewBookings.forEach(b => { if (ratingCounts[b.rating] !== undefined) ratingCounts[b.rating]++; });

            // Sentiment analysis
            const positiveCount = reviewBookings.filter(b => b.rating >= 4).length;
            const neutralCount = reviewBookings.filter(b => b.rating === 3).length;
            const negativeCount = reviewBookings.filter(b => b.rating <= 2).length;
            const withTextCount = reviewBookings.filter(b => b.reviewText && b.reviewText.trim()).length;

            // Worker performance leaderboard
            const workerMap = {};
            reviewBookings.forEach(b => {
              const wName = b.assignedTo?.name || 'Unassigned';
              if (!workerMap[wName]) workerMap[wName] = { name: wName, ratings: [], count: 0 };
              workerMap[wName].ratings.push(b.rating);
              workerMap[wName].count++;
            });
            const workerLeaderboard = Object.values(workerMap)
              .map(w => ({ ...w, avg: (w.ratings.reduce((a, b) => a + b, 0) / w.ratings.length).toFixed(1) }))
              .sort((a, b) => b.avg - a.avg || b.count - a.count);

            // Service breakdown
            const serviceMap = {};
            reviewBookings.forEach(b => {
              const sName = b.washPackage?.name || 'Unknown';
              if (!serviceMap[sName]) serviceMap[sName] = { name: sName, ratings: [], count: 0 };
              serviceMap[sName].ratings.push(b.rating);
              serviceMap[sName].count++;
            });
            const serviceBreakdown = Object.values(serviceMap)
              .map(s => ({ ...s, avg: (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1) }))
              .sort((a, b) => b.count - a.count);

            // Monthly trend data
            const monthMap = {};
            reviewBookings.forEach(b => {
              const d = new Date(b.date || b.createdAt);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              if (!monthMap[key]) monthMap[key] = { month: key, ratings: [], count: 0 };
              monthMap[key].ratings.push(b.rating);
              monthMap[key].count++;
            });
            const trendData = Object.values(monthMap)
              .sort((a, b) => a.month.localeCompare(b.month))
              .map(m => ({
                month: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                avg: parseFloat((m.ratings.reduce((a, b) => a + b, 0) / m.ratings.length).toFixed(1)),
                count: m.count,
              }));

            // Bar chart data for star distribution
            const chartData = Object.keys(ratingCounts).sort((a,b)=>b-a).map(key => ({ rating: `${key} ★`, count: ratingCounts[key], fill: key >= 4 ? '#22c55e' : key == 3 ? '#f59e0b' : '#ef4444' }));

            // Sentiment donut data
            const sentimentData = [
              { name: 'Positive', value: positiveCount, fill: '#22c55e' },
              { name: 'Neutral', value: neutralCount, fill: '#f59e0b' },
              { name: 'Negative', value: negativeCount, fill: '#ef4444' },
            ].filter(d => d.value > 0);

            // Local filter state — use a simple approach with IIFE closure
            // Variables have been moved to top-level state

            let filteredReviews = [...reviewBookings];
            if (reviewFilterRating !== 'all') {
              filteredReviews = filteredReviews.filter(b => b.rating === parseInt(reviewFilterRating));
            }
            if (reviewSearch.trim()) {
              const q = reviewSearch.toLowerCase();
              filteredReviews = filteredReviews.filter(b =>
                (b.userName || b.name || '').toLowerCase().includes(q) ||
                (b.reviewText || '').toLowerCase().includes(q) ||
                (b.assignedTo?.name || '').toLowerCase().includes(q) ||
                (b.washPackage?.name || '').toLowerCase().includes(q)
              );
            }
            filteredReviews.sort((a, b) => {
              if (reviewSort === 'newest') return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
              if (reviewSort === 'oldest') return new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt);
              if (reviewSort === 'highest') return b.rating - a.rating;
              if (reviewSort === 'lowest') return a.rating - b.rating;
              return 0;
            });

            const ratingColor = (r) => r >= 4 ? '#22c55e' : r === 3 ? '#f59e0b' : '#ef4444';

            return (
              <div className="panel-section">
                <h2>Reviews & Feedback Analytics</h2>
                {loading.bookings ? (
                  <div className="admin-skeleton-table">
                    {Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="admin-skeleton-row"></div>)}
                  </div>
                ) : totalReviews === 0 ? (
                  <div className="admin-state-card">
                    <h3>No reviews found</h3>
                    <p>Clients haven't left any reviews yet.</p>
                  </div>
                ) : (
                  <div className="rv-dashboard">
                    {/* KPI Cards Row */}
                    <div className="rv-kpi-grid">
                      <div className="rv-kpi-card rv-kpi--rating">
                        <div className="rv-kpi-icon">⭐</div>
                        <div className="rv-kpi-value">{avgRating}</div>
                        <div className="rv-kpi-label">Average Rating</div>
                        <div className="rv-kpi-bar">
                          <div className="rv-kpi-bar-fill" style={{ width: `${(avgRating / 5) * 100}%`, background: ratingColor(Math.round(avgRating)) }}></div>
                        </div>
                      </div>
                      <div className="rv-kpi-card rv-kpi--total">
                        <div className="rv-kpi-icon">📝</div>
                        <div className="rv-kpi-value">{totalReviews}</div>
                        <div className="rv-kpi-label">Total Reviews</div>
                        <div className="rv-kpi-sub">{withTextCount} with written feedback</div>
                      </div>
                      <div className="rv-kpi-card rv-kpi--positive">
                        <div className="rv-kpi-icon">😊</div>
                        <div className="rv-kpi-value">{totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 0}%</div>
                        <div className="rv-kpi-label">Satisfaction Rate</div>
                        <div className="rv-kpi-sub">{positiveCount} positive reviews</div>
                      </div>
                      <div className="rv-kpi-card rv-kpi--negative">
                        <div className="rv-kpi-icon">⚠️</div>
                        <div className="rv-kpi-value">{negativeCount}</div>
                        <div className="rv-kpi-label">Needs Attention</div>
                        <div className="rv-kpi-sub">Ratings ≤ 2 stars</div>
                      </div>
                    </div>

                    {/* Charts Row */}
                    <div className="rv-charts-row">
                      {/* Star Distribution */}
                      <div className="rv-chart-card">
                        <h3>⭐ Star Distribution</h3>
                        <div className="rv-star-bars">
                          {[5, 4, 3, 2, 1].map(star => {
                            const count = ratingCounts[star];
                            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                              <div key={star} className="rv-star-row">
                                <span className="rv-star-label">{star} ★</span>
                                <div className="rv-star-track">
                                  <div className="rv-star-fill" style={{ width: `${pct}%`, background: ratingColor(star) }}></div>
                                </div>
                                <span className="rv-star-count">{count}</span>
                                <span className="rv-star-pct">{pct.toFixed(0)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sentiment Donut */}
                      <div className="rv-chart-card">
                        <h3>💬 Sentiment Breakdown</h3>
                        <div style={{ width: '100%', height: 220 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                                {sentimentData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                              </Pie>
                              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }} />
                              <Legend formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>{value}</span>} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Rating Trend */}
                      {trendData.length > 1 && (
                        <div className="rv-chart-card rv-chart-card--wide">
                          <h3>📈 Rating Trend Over Time</h3>
                          <div style={{ width: '100%', height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                                <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} domain={[0, 5]} />
                                <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }} />
                                <Bar yAxisId="right" dataKey="count" fill="rgba(79,172,254,0.3)" radius={[4, 4, 0, 0]} name="Reviews" />
                                <Line yAxisId="left" type="monotone" dataKey="avg" stroke="#fbbf24" strokeWidth={3} dot={{ fill: '#fbbf24', r: 5 }} name="Avg Rating" />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Worker & Service Breakdown Row */}
                    <div className="rv-breakdown-row">
                      {/* Worker Leaderboard */}
                      <div className="rv-chart-card">
                        <h3>🏆 Worker Leaderboard</h3>
                        <div className="rv-leaderboard">
                          {workerLeaderboard.map((w, idx) => (
                            <div key={w.name} className="rv-leader-item">
                              <div className="rv-leader-rank">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</div>
                              <div className="rv-leader-info">
                                <span className="rv-leader-name">{w.name}</span>
                                <span className="rv-leader-reviews">{w.count} review{w.count !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="rv-leader-rating">
                                <span className="rv-leader-avg" style={{ color: ratingColor(Math.round(w.avg)) }}>{w.avg}</span>
                                <span className="rv-leader-star">★</span>
                              </div>
                            </div>
                          ))}
                          {workerLeaderboard.length === 0 && <div className="rv-empty-mini">No worker data yet</div>}
                        </div>
                      </div>

                      {/* Service Breakdown */}
                      <div className="rv-chart-card">
                        <h3>🧼 Service Ratings</h3>
                        <div className="rv-leaderboard">
                          {serviceBreakdown.map(s => (
                            <div key={s.name} className="rv-leader-item">
                              <div className="rv-leader-info" style={{ flex: 1 }}>
                                <span className="rv-leader-name">{s.name}</span>
                                <span className="rv-leader-reviews">{s.count} review{s.count !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="rv-leader-rating">
                                <span className="rv-leader-avg" style={{ color: ratingColor(Math.round(s.avg)) }}>{s.avg}</span>
                                <span className="rv-leader-star">★</span>
                              </div>
                            </div>
                          ))}
                          {serviceBreakdown.length === 0 && <div className="rv-empty-mini">No service data yet</div>}
                        </div>
                      </div>
                    </div>

                    {/* Reviews List Section */}
                    <div className="rv-reviews-section">
                      <div className="rv-reviews-header">
                        <h3>📋 All Reviews ({filteredReviews.length})</h3>
                        <div className="rv-reviews-controls">
                          <input
                            type="text"
                            placeholder="Search by client, worker, service, or review text..."
                            className="rv-search-input"
                            value={reviewSearch}
                            onChange={(e) => setReviewSearch(e.target.value)}
                          />
                          <select className="rv-filter-select" value={reviewFilterRating} onChange={(e) => setReviewFilterRating(e.target.value)}>
                            <option value="all">All Ratings</option>
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="2">2 Stars</option>
                            <option value="1">1 Star</option>
                          </select>
                          <select className="rv-filter-select" value={reviewSort} onChange={(e) => setReviewSort(e.target.value)}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="highest">Highest Rated</option>
                            <option value="lowest">Lowest Rated</option>
                          </select>
                        </div>
                      </div>

                      {filteredReviews.length === 0 ? (
                        <div className="rv-empty-mini" style={{ padding: '30px', textAlign: 'center' }}>No reviews match your filters.</div>
                      ) : (
                        <div className="rv-reviews-list">
                          {filteredReviews.map(b => (
                            <div key={b._id} className={`rv-review-card ${expandedReview === b._id ? 'rv-review-card--expanded' : ''}`} onClick={() => setExpandedReview(expandedReview === b._id ? null : b._id)}>
                              <div className="rv-review-top">
                                <div className="rv-review-avatar">{(b.userName || b.name || 'U').charAt(0).toUpperCase()}</div>
                                <div className="rv-review-meta">
                                  <span className="rv-review-client">{b.userName || b.name || 'Unknown Client'}</span>
                                  <span className="rv-review-date">{new Date(b.date || b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div className="rv-review-stars" style={{ color: ratingColor(b.rating) }}>
                                  {'★'.repeat(b.rating)}{'☆'.repeat(5 - b.rating)}
                                </div>
                              </div>
                              {b.reviewText && (
                                <p className="rv-review-text">"{b.reviewText}"</p>
                              )}
                              <div className="rv-review-tags">
                                {b.assignedTo?.name && <span className="rv-tag rv-tag--worker">👷 {b.assignedTo.name}</span>}
                                {b.washPackage?.name && <span className="rv-tag rv-tag--service">🧼 {b.washPackage.name}</span>}
                                {b.washPackage?.price && <span className="rv-tag rv-tag--price">${b.washPackage.price}</span>}
                              </div>
                              {expandedReview === b._id && (
                                <div className="rv-review-expanded">
                                  <div className="rv-review-detail-grid">
                                    <div><span className="rv-detail-label">Booking ID</span><span className="rv-detail-value">#{b._id?.slice(-8).toUpperCase()}</span></div>
                                    <div><span className="rv-detail-label">Location</span><span className="rv-detail-value">{b.location || '-'}</span></div>
                                    <div><span className="rv-detail-label">Vehicle</span><span className="rv-detail-value">{b.vehicle?.label || b.vehicle?.type || '-'}</span></div>
                                    <div><span className="rv-detail-label">Time</span><span className="rv-detail-value">{b.time || '-'}</span></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
        })()}

        {/* ORDERS */}
        {activeTab === 'orders' && (
            <div className="panel-section">
                <div className="orders-title-row">
                  <h2>Package Requests</h2>
                  <div className="orders-summary-pills">
                    <span className="orders-summary-pill">{orderSummary.count} filtered</span>
                    <span className="orders-summary-pill">{orderSummary.withNotes} with notes</span>
                    <span className="orders-summary-pill">{orderSummary.totalRevenue.toFixed(2)} EGP</span>
                  </div>
                </div>

                <div className="orders-toolbar">
                  <div className="orders-filter-group">
                    <label>Status</label>
                    <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="delivered">Delivered / Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="orders-filter-group">
                    <label>Payment</label>
                    <select value={orderPaymentFilter} onChange={(e) => setOrderPaymentFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="cash">Cash</option>
                      <option value="visa">Visa</option>
                    </select>
                  </div>

                  <div className="orders-filter-group">
                    <label>Customization</label>
                    <select value={orderCustomizationFilter} onChange={(e) => setOrderCustomizationFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="with-notes">With notes</option>
                      <option value="without-notes">Without notes</option>
                    </select>
                  </div>

                  <div className="orders-filter-group">
                    <label>Sort by</label>
                    <select value={orderSortBy} onChange={(e) => setOrderSortBy(e.target.value)}>
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="total-high">Total: High to low</option>
                      <option value="total-low">Total: Low to high</option>
                      <option value="user-az">User: A to Z</option>
                      <option value="user-za">User: Z to A</option>
                      <option value="status">Status</option>
                    </select>
                  </div>

                  <button
                    className="orders-reset-btn"
                    onClick={() => {
                      setOrderStatusFilter("all");
                      setOrderPaymentFilter("all");
                      setOrderCustomizationFilter("all");
                      setOrderSortBy("newest");
                      setSearchTerm("");
                    }}
                  >
                    Reset
                  </button>
                </div>

                {loading.orders ? (
                  <div className="admin-skeleton-table">
                    {Array.from({ length: 7 }).map((_, idx) => <div key={idx} className="admin-skeleton-row"></div>)}
                  </div>
                ) : fetchError ? (
                  <div className="admin-state-card error">
                    <h3>Failed to load requests</h3>
                    <p>{fetchError}</p>
                    <button className="btn-save" style={{width: 'auto', marginTop: 15, padding: '10px 20px'}} onClick={() => fetchData("orders")}>Retry</button>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="admin-state-card">
                    <h3>No requests found</h3>
                    <p>Try changing filters or search text.</p>
                  </div>
                ) : (
                  <>
                    <div className="orders-desktop-view">
                      <table className="admin-table orders-table">
                          <thead><tr><th>ID</th><th>User</th><th>Packages</th><th>Total</th><th>Payment</th><th>Status</th><th>Confirmed</th><th>Action</th></tr></thead>
                          <tbody>
                              {filteredOrders.map(o => (
                                  <tr key={o._id}>
                                    <td>#{o._id.slice(-6)}</td>
                                    <td>{o.userName || "Guest"}</td>
                                    <td className="order-items-cell">
                                      {(o.items || []).map((item, idx) => (
                                        <div key={item._id || `${o._id}-${idx}`} className="order-item-row">
                                          <span>{item.quantity}x {item.title}</span>
                                          {item.specialInstructions && (
                                            <small className="order-item-custom-note">Note: {item.specialInstructions}</small>
                                          )}
                                        </div>
                                      ))}
                                    </td>
                                    <td>{Number(o.totalAmount || 0).toFixed(2)} EGP</td>
                                    <td><span className="payment-pill">{o.paymentMethod || "cash"}</span></td>
                                    <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                                    <td className="order-confirmed-time">{formatConfirmedDateTime(o.createdAt)}</td>
                                    <td>
                                      <div className="kitchen-actions-cell">
                                        <select
                                          className="status-select"
                                          value={o.status}
                                          onChange={(e) => updateOrderStatus(o._id, e.target.value)}
                                          disabled={statusBusyId === o._id}
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="delivered">Ongoing / Done</option>
                                          <option value="completed">Completed</option>
                                          <option value="cancelled">Cancelled</option>
                                        </select>
                                        <div className="quick-action-group">
                                          <button className="btn-quick neutral" onClick={() => updateOrderStatus(o._id, "delivered")} disabled={statusBusyId === o._id || normalize(o.status) === "delivered"}>Status Done</button>
                                          <button className="btn-quick success" onClick={() => updateOrderStatus(o._id, "completed")} disabled={statusBusyId === o._id || normalize(o.status) === "completed"}>Complete</button>
                                          <button className="btn-quick danger" onClick={() => updateOrderStatus(o._id, "cancelled")} disabled={statusBusyId === o._id || normalize(o.status) === "cancelled"}>Cancel</button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                    </div>

                    <div className="orders-mobile-view">
                      {filteredOrders.map((order) => (
                        <article key={order._id} className="order-mobile-card">
                          <header className="order-mobile-header">
                            <strong>#{order._id.slice(-6)}</strong>
                            <span className={`badge ${order.status}`}>{order.status}</span>
                          </header>
                          <div className="order-mobile-meta">
                            <span>{order.userName || "Guest"}</span>
                            <span>{Number(order.totalAmount || 0).toFixed(2)} EGP</span>
                            <span>{order.paymentMethod || "cash"}</span>
                            <span>{formatConfirmedDateTime(order.createdAt)}</span>
                          </div>
                          <div className="order-mobile-items">
                            {(order.items || []).map((item, idx) => (
                              <div key={item._id || `${order._id}-m-${idx}`} className="order-item-row">
                                <span>{item.quantity}x {item.title}</span>
                                {item.specialInstructions && (
                                  <small className="order-item-custom-note">Note: {item.specialInstructions}</small>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="quick-action-group mobile">
                            <button className="btn-quick neutral" onClick={() => updateOrderStatus(order._id, "delivered")} disabled={statusBusyId === order._id || normalize(order.status) === "delivered"}>Set Ongoing</button>
                            <button className="btn-quick success" onClick={() => updateOrderStatus(order._id, "completed")} disabled={statusBusyId === order._id || normalize(order.status) === "completed"}>Complete</button>
                            <button className="btn-quick danger" onClick={() => updateOrderStatus(order._id, "cancelled")} disabled={statusBusyId === order._id || normalize(order.status) === "cancelled"}>Cancel</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
            </div>
        )}

        {/* SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (() => {
          const activateSubscription = async (id) => {
            if (subStatusBusyId) return;
            setSubStatusBusyId(id);
            try {
              const res = await axios.put(
                `${API_BASE_URL}/order/${id}/subscription-status`,
                { subscriptionStatus: 'active' },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setSubscriptions(prev => prev.map(s => s._id === id ? res.data.data : s));
              notify.success('Success - Subscription activated!');
            } catch { notify.error('Error - Failed to activate.'); }
            finally { setSubStatusBusyId(''); }
          };

          const markWashDone = async (id) => {
            if (subStatusBusyId) return;
            setWashDate(new Date().toISOString().split('T')[0]);
            setWashModal({ isOpen: true, subId: id });
          };

          const confirmWashDone = async () => {
            const { subId } = washModal;
            if (!subId || !washDate) return;

            setSubStatusBusyId(subId);
            setWashModal({ isOpen: false, subId: '' });
            try {
              const res = await axios.put(
                `${API_BASE_URL}/order/${subId}/add-wash`,
                { date: washDate },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setSubscriptions(prev => prev.map(s => s._id === subId ? res.data.data : s));
              notify.success('Success - Wash recorded!');
            } catch (err) {
              notify.error(err?.response?.data?.message || 'Error - Failed to record wash.');
            }
            finally { setSubStatusBusyId(''); }
          };

          const cancelSubscription = async (id) => {
            if (!window.confirm('Cancel this subscription?')) return;
            if (subStatusBusyId) return;
            setSubStatusBusyId(id);
            try {
              const res = await axios.put(
                `${API_BASE_URL}/order/${id}/subscription-status`,
                { subscriptionStatus: 'cancelled' },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setSubscriptions(prev => prev.map(s => s._id === id ? res.data.data : s));
              notify.success('Success - Subscription cancelled.');
            } catch { notify.error('Error - Failed to cancel.'); }
            finally { setSubStatusBusyId(''); }
          };

          const subStatusColor = { active: '#10b981', expired: '#ef4444', cancelled: '#64748b', pending_activation: '#f59e0b' };
          const subStatusLabel = { active: '🟢 Active', expired: '🔴 Expired', cancelled: '⚫ Cancelled', pending_activation: '🟡 Pending Activation' };

          return (
            <div className="panel-section">
              <div className="orders-title-row">
                <h2>Package Subscriptions</h2>
                <div className="orders-summary-pills">
                  <span className="orders-summary-pill">{subscriptions.filter(s => s.subscriptionStatus === 'active').length} active</span>
                  <span className="orders-summary-pill">{subscriptions.filter(s => s.subscriptionStatus === 'pending_activation').length} pending</span>
                  <span className="orders-summary-pill">{subscriptions.filter(s => s.subscriptionStatus === 'expired').length} expired</span>
                </div>
              </div>

              {loading.subscriptions ? (
                <div className="admin-skeleton-table">
                  {Array.from({ length: 5 }).map((_, idx) => <div key={idx} className="admin-skeleton-row"></div>)}
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="admin-state-card">
                  <h3>No subscriptions yet</h3>
                  <p>Clients will appear here once they subscribe to a package.</p>
                </div>
              ) : (
                <div className="sub-cards-grid">
                  {subscriptions.map(sub => {
                    const totalWashes = (sub.subscriptionDetails?.washesPerMonth || 4) * (sub.subscriptionDetails?.durationMonths || 1);
                    const washesUsed = sub.washesUsed || 0;
                    const washProgress = Math.min(100, Math.round((washesUsed / totalWashes) * 100));
                    const endDate = sub.subscriptionDetails?.endDate ? new Date(sub.subscriptionDetails.endDate) : null;
                    const startDate = sub.subscriptionDetails?.startDate ? new Date(sub.subscriptionDetails.startDate) : null;
                    const daysLeft = endDate ? Math.ceil((endDate - new Date()) / 86400000) : null;
                    const isExpiringSoon = daysLeft !== null && daysLeft <= 5 && daysLeft > 0;
                    const isBusy = subStatusBusyId === sub._id;

                    return (
                      <div
                        key={sub._id}
                        className={`sub-card ${sub.subscriptionStatus === 'expired' ? 'sub-card--expired' : sub.subscriptionStatus === 'cancelled' ? 'sub-card--cancelled' : isExpiringSoon ? 'sub-card--warning' : ''}`}
                      >
                        {/* Header */}
                        <div className="sub-card-header">
                          <div>
                            <h4 className="sub-card-title">{sub.subscriptionDetails?.packageTitle || 'Package'}</h4>
                            <span className="sub-card-id">#{sub._id.slice(-6)}</span>
                          </div>
                          <span className="sub-status-badge" style={{ backgroundColor: subStatusColor[sub.subscriptionStatus] || '#64748b' }}>
                            {subStatusLabel[sub.subscriptionStatus] || sub.subscriptionStatus}
                          </span>
                        </div>

                        {/* Client + Car Info */}
                        <div className="sub-card-meta">
                          <div className="sub-meta-row">
                            <span className="sub-meta-label">👤 Client</span>
                            <span>{sub.userName}</span>
                          </div>
                          <div className="sub-meta-row">
                            <span className="sub-meta-label">📧 Email</span>
                            <span>{sub.userEmail || '-'}</span>
                          </div>
                          <div className="sub-meta-row">
                            <span className="sub-meta-label">📱 Phone</span>
                            <span>{sub.userPhone}</span>
                          </div>
                          {sub.car && (
                            <div className="sub-meta-row">
                              <span className="sub-meta-label">🚗 Car</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img
                                  src={getBrandLogoUrl(sub.car.brand)}
                                  alt={sub.car.brand}
                                  style={{ width: 22, height: 22, objectFit: 'contain' }}
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                                <span>
                                  {sub.car.brand} {sub.car.model}
                                  <span className="badge" style={{ marginLeft: 6, backgroundColor: '#e2e8f0', color: '#0f172a', padding: '1px 6px', fontSize: '0.68rem' }}>
                                    {sub.car.plateNumber}
                                  </span>
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="sub-meta-row">
                            <span className="sub-meta-label">💳 Payment</span>
                            <span className="payment-pill">{sub.paymentMethod || 'cash'}</span>
                          </div>
                          <div className="sub-meta-row">
                            <span className="sub-meta-label">💰 Amount</span>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>{sub.totalAmount} EGP</span>
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="sub-card-timeline">
                          <div className="sub-timeline-row">
                            <span>📅 Start</span>
                            <span>{startDate ? startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not activated yet'}</span>
                          </div>
                          <div className="sub-timeline-row">
                            <span>⏰ End</span>
                            <span style={{ color: isExpiringSoon ? '#f59e0b' : sub.subscriptionStatus === 'expired' ? '#ef4444' : 'inherit' }}>
                              {endDate ? endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                              {daysLeft !== null && sub.subscriptionStatus === 'active' && (
                                <small style={{ marginLeft: 8, opacity: 0.8 }}>
                                  ({isExpiringSoon ? `⚠️ ${daysLeft}d left` : daysLeft > 0 ? `${daysLeft}d left` : 'Expired'})
                                </small>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Wash Progress */}
                        <div className="sub-wash-progress">
                          <div className="sub-wash-label">
                            <span>🚿 Wash Progress</span>
                            <span>{washesUsed} / {totalWashes} washes</span>
                          </div>
                          <div className="sub-progress-bar-bg">
                            <div
                              className="sub-progress-bar-fill"
                              style={{ width: `${washProgress}%`, backgroundColor: washProgress >= 100 ? '#ef4444' : '#10b981' }}
                            />
                          </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="sub-card-actions">
                          {sub.subscriptionStatus === 'pending_activation' && (
                            <button
                              className="btn-quick success"
                              onClick={() => activateSubscription(sub._id)}
                              disabled={isBusy}
                            >
                              {isBusy ? '...' : '✅ Activate'}
                            </button>
                          )}
                          {sub.subscriptionStatus === 'active' && (
                            <button
                              className="btn-quick neutral"
                              onClick={() => markWashDone(sub._id)}
                              disabled={isBusy}
                            >
                              {isBusy ? '...' : '🚿 Mark Wash Done'}
                            </button>
                          )}
                          {(sub.subscriptionStatus === 'pending_activation' || sub.subscriptionStatus === 'active') && (
                            <button
                              className="btn-quick danger"
                              onClick={() => cancelSubscription(sub._id)}
                              disabled={isBusy}
                            >
                              {isBusy ? '...' : '❌ Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cool Custom Modal for Logging Wash */}
              {washModal.isOpen && (
                <div className="modal-overlay">
                  <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <div className="modal-header">
                      <h3>Log Completed Wash</h3>
                      <button className="modal-close" onClick={() => setWashModal({ isOpen: false, subId: '' })}>&times;</button>
                    </div>
                    <div className="modal-body" style={{ padding: '20px' }}>
                      <p style={{ color: '#64748b', marginBottom: '15px' }}>
                        Select the exact date this wash was completed. It will instantly appear on the client's profile timeline.
                      </p>
                      <div className="form-group" style={{ textAlign: 'left' }}>
                        <label>Wash Date</label>
                        <input
                          type="date"
                          value={washDate}
                          onChange={(e) => setWashDate(e.target.value)}
                          className="form-input"
                          style={{ padding: '12px', fontSize: '1rem', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                        />
                      </div>
                      <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
                        <button className="btn-secondary" onClick={() => setWashModal({ isOpen: false, subId: '' })} style={{ flex: 1, padding: '10px' }}>
                          Cancel
                        </button>
                        <button className="btn-primary" onClick={confirmWashDone} style={{ flex: 1, padding: '10px', background: '#10b981', borderColor: '#10b981' }}>
                          Log Wash
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* USERS */}
        {activeTab === 'users' && (
            <div className="panel-section">
                <h2>Users</h2>
                {loading.users ? (
                  <div className="admin-skeleton-table">
                    {Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="admin-skeleton-row"></div>)}
                  </div>
                ) : fetchError ? (
                  <div className="admin-state-card error">
                    <h3>Failed to load users</h3>
                    <p>{fetchError}</p>
                    <button className="btn-save" style={{width: 'auto', marginTop: 15, padding: '10px 20px'}} onClick={() => fetchData("users")}>Retry</button>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="admin-state-card">
                    <h3>No users found</h3>
                    <p>Try changing the search term.</p>
                  </div>
                ) : (
                  <div style={{overflowX: 'auto'}}>
                    <table className="admin-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Change</th></tr></thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u._id}>
                                  <td>{u.name}</td>
                                  <td>{u.email}</td>
                                  <td><span className={`badge role ${u.role==='admin'?'admin-badge':'user-badge'}`}>{u.role}</span></td>
                                  <td>
                                    <select className="status-select" value={u.role} onChange={(e)=>handleUserRoleChange(u._id, e.target.value)} disabled={u._id===userData._id}>
                                      <option value="user">User</option>
                                      <option value="admin">Admin</option>
                                      <option value="serviceProvider">Service Provider</option>
                                    </select>
                                  </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                )}
            </div>
        )}

        {/* CARS */}
        {activeTab === 'cars' && (
            <div className="panel-section">
                <h2>Customer Cars</h2>
                {loading.cars ? (
                  <div className="admin-skeleton-table">
                    {Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="admin-skeleton-row"></div>)}
                  </div>
                ) : fetchError ? (
                  <div className="admin-state-card error">
                    <h3>Failed to load cars</h3>
                    <p>{fetchError}</p>
                    <button className="btn-save" style={{width: 'auto', marginTop: 15, padding: '10px 20px'}} onClick={() => fetchData("cars")}>Retry</button>
                  </div>
                ) : filteredCars.length === 0 ? (
                  <div className="admin-state-card">
                    <h3>No cars found</h3>
                    <p>Try changing the search term, or no cars have been registered yet.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
                        {[ 
                            { title: 'Vehicle Categories', key: 'type' }, 
                            { title: 'Vehicle Brands', key: 'brand' } 
                        ].map((statDef, i) => {
                            const rawStats = {};
                            cars.forEach(c => {
                                const val = c[statDef.key] || "Other";
                                rawStats[val] = (rawStats[val] || 0) + 1;
                            });
                            const cData = Object.keys(rawStats).map(k => ({ name: k, value: rawStats[k] })).sort((a, b) => b.value - a.value);
                            const total = cData.reduce((sum, item) => sum + item.value, 0);

                            return cData.length > 0 ? (
                                <div key={i} className="chart-section sleek-dark-chart" style={{ flex: 1, minWidth: '320px', margin: 0 }}>
                                    <h3>{statDef.title}</h3>
                                    <div className="chart-wrapper" style={{ height: '220px', display: 'flex', alignItems: 'center' }}>
                                        <div style={{ flex: 1, height: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={cData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} fill="#8884d8" paddingAngle={3} dataKey="value" stroke="none">
                                                        {cData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: '#1e1e24', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div style={{ flex: 1, minWidth: '130px' }}>
                                            <div className="custom-chart-legend">
                                                {cData.map((entry, index) => (
                                                    <div key={`legend-${index}`} className="custom-chart-legend-item" style={{ fontSize: '0.8rem', gap: '5px' }}>
                                                        <div className="legend-label" style={{ gap: '6px' }}>
                                                            <div className="legend-dot" style={{ backgroundColor: COLORS[index % COLORS.length], width: '10px', height: '10px' }}></div>
                                                            <span>{entry.name}</span>
                                                        </div>
                                                        <div className="legend-value">{Math.round((entry.value / total) * 100)}%</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null;
                        })}
                    </div>

                  <div style={{overflowX: 'auto'}}>
                    <table className="admin-table">
                        <thead><tr><th>Owner Name</th><th>Owner Email</th><th>Type</th><th>Vehicle Details</th><th>Color</th></tr></thead>
                        <tbody>
                            {filteredCars.map(c => (
                                <tr key={c._id}>
                                  <td>{c.user?.name || '-'}</td>
                                  <td>{c.user?.email || '-'}</td>
                                  <td><span className="badge" style={{ backgroundColor: '#64748b', color: '#fff' }}>{c.type}</span></td>
                                  <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <img 
                                              src={getBrandLogoUrl(c.brand)} 
                                              alt={c.brand} 
                                              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                                              onError={(e) => { e.target.style.display = 'none'; }}
                                          />
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <strong>{c.brand}</strong>
                                              <span>{c.model}</span>
                                              <span style={{ color: '#64748b' }}>{c.year}</span>
                                              <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#0f172a', padding: '2px 8px', fontSize: '0.7rem' }}>{c.plateNumber}</span>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: c.color || '#333', border: '1px solid #ccc' }}></span>
                                      {c.color}
                                    </div>
                                  </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                  </>
                )}
            </div>
        )}

        {/* PACKAGES / PRODUCTS */}
        {activeTab === 'packages' && (
            <div className="panel-section">
                <div className="menu-form-card">
                    <div className="form-header">
                        <div className="form-icon" aria-hidden="true">
                          {editingId ? <FiEdit2 /> : <FiPlus />}
                        </div>
                        <div>
                            <h3>{editingId ? "Edit Wash Package" : "Add New Package"}</h3>
                            <p>Manage the wash packages offered.</p>
                        </div>
                    </div>
                    
                    <form onSubmit={handleMenuSubmit} className="perfect-form">
                        <div className="form-row">
                            <div className="form-col-8">
                                <div className="input-group-modern">
                                    <label>Package Name</label>
                                    <input className="form-control" type="text" placeholder="e.g. Premium Wash" name="title" value={formData.title} onChange={(e)=>setFormData({...formData,title:e.target.value})} required />
                                </div>
                            </div>
                            <div className="form-col-4">
                                <div className="input-group-modern">
                                    <label>Price (EGP)</label>
                                    <input className="form-control" type="number" placeholder="0.00" name="price" value={formData.price} onChange={(e)=>setFormData({...formData,price:e.target.value})} required />
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-col-6">
                                <div className="input-group-modern">
                                    <label>Category</label>
                                    <select className="form-select" name="category" value={formData.category} onChange={(e)=>setFormData({...formData,category:e.target.value})}>
                                        <option value="wash">Car Wash</option>
                                        <option value="detailing">Detailing</option>
                                        <option value="interior">Interior Cleaning</option>
                                        <option value="other">Other Packages</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-col-6">
                                <div className="input-group-modern">
                                    <label>Estimated Duration (mins)</label>
                                    <input className="form-control" type="number" placeholder="Duration" name="stock" value={formData.stock} onChange={(e)=>setFormData({...formData,stock:e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="input-group-modern file-group">
                            <label>Upload Image</label>
                            <div
                              className={`custom-file-upload ${isDragActive ? "drag-active" : ""} ${selectedImages.length ? "has-files" : ""}`}
                              onDragEnter={(event) => {
                                event.preventDefault();
                                setIsDragActive(true);
                              }}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setIsDragActive(true);
                              }}
                              onDragLeave={(event) => {
                                event.preventDefault();
                                if (event.currentTarget.contains(event.relatedTarget)) return;
                                setIsDragActive(false);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                setIsDragActive(false);
                                setMenuUploadFiles(event.dataTransfer.files);
                              }}
                            >
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  ref={imagesRef}
                                  className="file-input"
                                  onChange={(event) => setMenuUploadFiles(event.target.files)}
                                />
                                <div className="upload-content">
                                    <span className="upload-icon" aria-hidden="true">
                                      {isDragActive ? <FiUploadCloud /> : <FiImage />}
                                    </span>
                                    <span>
                                      {isDragActive
                                        ? "Drop images here"
                                        : selectedImages.length
                                          ? `${selectedImages.length} image${selectedImages.length > 1 ? "s" : ""} selected`
                                          : "Drag & Drop or Click to Upload"}
                                    </span>
                                </div>
                                {selectedImages.length > 0 && (
                                  <button type="button" className="clear-upload-btn" onClick={clearMenuUploadFiles}>
                                    Clear
                                  </button>
                                )}
                            </div>
                            {imagePreviews.length > 0 && (
                              <div className="upload-preview-grid">
                                {imagePreviews.map((preview) => (
                                  <figure key={preview.id} className="upload-preview-card">
                                    <img src={preview.url} alt={preview.name} loading="lazy" decoding="async" />
                                    <figcaption>
                                      <span title={preview.name}>{preview.name}</span>
                                      <small>{formatFileSize(preview.size)}</small>
                                    </figcaption>
                                  </figure>
                                ))}
                              </div>
                            )}
                        </div>

                        <div className="input-group-modern">
                            <label>Description</label>
                            <textarea className="form-control" rows={4} placeholder="Describe the package..." name="description" value={formData.description} onChange={(e)=>setFormData({...formData,description:e.target.value})} />
                        </div>

                        <div className="form-actions-modern">
                            <button type="submit" className="btn-save">{editingId ? "Save Changes" : "Publish Package"}</button>
                            {editingId && <button type="button" onClick={()=>setEditingId(null)} className="btn-cancel">Cancel</button>}
                        </div>
                    </form>
                </div>

                {loading.products ? (
                  <div className="admin-skeleton-table menu-skeleton">
                    {Array.from({ length: 5 }).map((_, idx) => <div key={idx} className="admin-skeleton-row"></div>)}
                  </div>
                ) : fetchError ? (
                  <div className="admin-state-card error">
                    <h3>Failed to load packages</h3>
                    <p>{fetchError}</p>
                    <button className="btn-save" style={{width: 'auto', marginTop: 15, padding: '10px 20px'}} onClick={() => fetchData("packages")}>Retry</button>
                  </div>
                ) : packages.length === 0 ? (
                  <div className="admin-state-card">
                    <h3>No packages yet</h3>
                    <p>Add your first wash package from the form above.</p>
                  </div>
                ) : (
                  <div className="packages-grid" style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'flex-start', alignItems: 'start' }}>
                      {packages.map((p, index) => {
                          const features = p.description 
                              ? p.description.split('\n').filter(Boolean)
                              : ["Premium service"];

                          let cardVariant = 'basic';
                          const titleLower = (p.title || '').toLowerCase();
                          if (titleLower.includes('silver')) {
                              cardVariant = 'silver';
                          } else if (titleLower.includes('platinum') || titleLower.includes('diamond')) {
                              cardVariant = 'platinum';
                          } else if (titleLower.includes('gold') || titleLower.includes('premium')) {
                              cardVariant = 'premium';
                          }

                          return (
                              <div key={p._id} style={{ position: 'relative', width: '230px', height: '330px', margin: '0' }}>
                                  <div style={{ transform: 'scale(0.65)', transformOrigin: 'top left', width: '353px' }}>
                                      <PackageCard
                                          title={p.title}
                                          price={p.price}
                                          duration={`${p.stock || '1 Month'} (4 Washes)`}
                                          image={p.images && p.images.length > 0 ? `${API_BASE_URL}/${p.images[0]}` : null}
                                          features={features}
                                          isPopular={Number(p.price) >= 500 && Number(p.price) < 1000}
                                          isSelected={false}
                                          onSelect={() => {}}
                                          variant={cardVariant}
                                      />
                                  </div>
                                  <div className="menu-actions" style={{ 
                                      position: 'absolute', 
                                      bottom: '-20px', 
                                      left: '50%', 
                                      transform: 'translateX(-50%)',
                                      display: 'flex', 
                                      flexDirection: 'row', 
                                      gap: '8px', 
                                      zIndex: 50, 
                                      background: 'rgba(255, 255, 255, 0.95)', 
                                      backdropFilter: 'blur(16px)',
                                      WebkitBackdropFilter: 'blur(16px)',
                                      border: '1px solid rgba(200, 200, 200, 0.4)',
                                      padding: '8px 16px', 
                                      borderRadius: '999px', 
                                      boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)' 
                                  }}>
                                      <button
                                        className="btn-action move"
                                        onClick={() => handleMoveProduct(index, -1)}
                                        disabled={index === 0}
                                        title="Move Left"
                                        aria-label="Move package left"
                                      >
                                        <FiChevronLeft />
                                      </button>
                                      <button
                                        className="btn-action move"
                                        onClick={() => handleMoveProduct(index, 1)}
                                        disabled={index === packages.length - 1}
                                        title="Move Right"
                                        aria-label="Move package right"
                                      >
                                        <FiChevronRight />
                                      </button>
                                      <button
                                        className="btn-action edit"
                                        onClick={() => handleEditClick(p)}
                                        title="Edit"
                                        aria-label="Edit package"
                                      >
                                        <FiEdit2 />
                                      </button>
                                      <button
                                        className="btn-action delete"
                                        onClick={() => handleDelete(p._id)}
                                        title="Delete"
                                        aria-label="Delete package"
                                      >
                                        <FiTrash2 />
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                )}
            </div>
        )}

        {/* INVENTORY */}
        {activeTab === 'inventory' && <InventoryPanel />}
      </main>

      {/* Assign Worker Modal */}
      {assignModalBooking && (
        <AssignWorkerModal
          booking={assignModalBooking}
          isAccepting={true}
          onClose={() => setAssignModalBooking(null)}
          onAssigned={(updated) => {
            setBookings((prev) =>
              prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b))
            );
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;

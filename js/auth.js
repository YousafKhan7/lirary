// Shared authentication and session management
const SUPABASE_URL = window.SUPABASE_CONFIG?.url;
const SUPABASE_PUBLISHABLE_KEY = window.SUPABASE_CONFIG?.publishableKey;

let supabaseClient = null;
let currentUser = null;
let currentRole = null;

// Initialize Supabase client
async function initAuth() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error("Supabase config is missing");
    window.location.href = "index.html";
    return null;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase client could not load from CDN");
    window.location.href = "index.html";
    return null;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // Check session
  const { data, error } = await supabaseClient.auth.getSession();
  
  if (error || !data.session) {
    window.location.href = "index.html";
    return null;
  }

  currentUser = data.session.user;

  // Get user role
  const roleData = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (roleData.error || !roleData.data) {
    alert("This account has no role assigned. Please contact administrator.");
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
    return null;
  }

  currentRole = roleData.data.role;

  // Update UI with user info
  updateUserInfo();
  updateRoleBasedUI();

  return supabaseClient;
}

// Update user info in sidebar
function updateUserInfo() {
  const emailEl = document.getElementById("sessionEmail");
  const roleEl = document.getElementById("sessionRoleLabel");

  if (emailEl && currentUser) {
    emailEl.textContent = currentUser.email || "Unknown user";
  }

  if (roleEl && currentRole) {
    roleEl.textContent = capitalize(currentRole);
  }
}

// Show/hide admin-only elements
function updateRoleBasedUI() {
  const isAdmin = currentRole === "admin";
  
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.classList.toggle("show", isAdmin);
  });

  document.querySelectorAll(".admin-registration-only").forEach((el) => {
    el.classList.toggle("show", isAdmin);
  });
}

// Logout handler
async function handleLogout() {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signOut();
  
  if (error) {
    console.error("Logout error:", error);
  }

  window.location.href = "index.html";
}

// Utility functions
function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return "the selected month";
  
  const [year, month] = monthValue.split("-");
  const monthDate = new Date(Number(year), Number(month) - 1, 1);
  return monthDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatMonthValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  
  return new Date(dateValue).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toDbMonthDate(monthValue) {
  return `${monthValue}-01`;
}

function fromDbMonthDate(dateValue) {
  return String(dateValue).slice(0, 7);
}

function isSameMonth(dateValue, monthValue) {
  if (!dateValue || !monthValue) return false;
  return String(dateValue).slice(0, 7) === monthValue;
}

function joinedOnOrBeforeMonth(dateValue, monthValue) {
  if (!dateValue || !monthValue) return false;
  return String(dateValue).slice(0, 7) <= monthValue;
}

function showMessage(elementId, type, text) {
  const messageEl = document.getElementById(elementId);
  if (!messageEl) return;

  messageEl.className = `app-message ${type}`;
  messageEl.textContent = text;
  messageEl.classList.remove("is-hidden");
}

function setButtonBusy(button, isBusy, busyLabel) {
  if (!button) return;

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }

  button.disabled = isBusy;
  button.textContent = isBusy ? busyLabel : button.dataset.defaultLabel;
}

// Setup logout button
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutButton");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
});

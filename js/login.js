// Login page logic
const SUPABASE_URL = window.SUPABASE_CONFIG?.url;
const SUPABASE_PUBLISHABLE_KEY = window.SUPABASE_CONFIG?.publishableKey;

let supabaseClient = null;

document.addEventListener("DOMContentLoaded", () => {
  initLogin();
});

async function initLogin() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    showMessage("error", "Supabase config is missing. Update supabase-config.js first.");
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    showMessage("error", "Supabase client could not load from CDN.");
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // Check if already logged in
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    window.location.href = "dashboard.html";
    return;
  }

  // Setup form submission
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  showMessage("info", "Sign in with your admin or manager account to continue.");
}

async function handleLogin(event) {
  event.preventDefault();

  if (!supabaseClient) return;

  const loginButton = document.getElementById("loginButton");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");

  setButtonBusy(loginButton, true, "Signing in...");

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });

    if (error) throw error;

    // Check if user has a role
    const roleData = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (roleData.error || !roleData.data) {
      await supabaseClient.auth.signOut();
      throw new Error("This account has no role assigned. Please contact administrator.");
    }

    showMessage("success", "Login successful. Redirecting...");
    
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1000);

  } catch (error) {
    showMessage("error", normalizeError(error));
    setButtonBusy(loginButton, false, "Sign in");
  }
}

function showMessage(type, text) {
  const messageEl = document.getElementById("appMessage");
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

function normalizeError(error) {
  const message = typeof error === "string" ? error : error?.message || "Something went wrong.";

  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  return message;
}

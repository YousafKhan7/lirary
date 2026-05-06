// This file has been replaced by modular JavaScript files
// Please use index.html as the entry point

// Redirect to new structure
if (window.location.pathname.includes('app.js')) {
  console.warn('app.js is deprecated. Please use index.html as entry point.');
}

// If someone loads this directly, redirect to login
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('loginScreen') && !document.getElementById('appLayout')) {
      window.location.href = 'index.html';
    }
  });
}


const elements = {
  loginScreen: document.getElementById("loginScreen"),
  appLayout: document.getElementById("appLayout"),
  appMessage: document.getElementById("appMessage"),
  
  // Login
  loginForm: document.getElementById("loginForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginButton: document.getElementById("loginButton"),
  
  // Sidebar
  sidebar: document.querySelector(".sidebar"),
  navItems: document.querySelectorAll(".nav-item"),
  sessionEmail: document.getElementById("sessionEmail"),
  sessionRoleLabel: document.getElementById("sessionRoleLabel"),
  logoutButton: document.getElementById("logoutButton"),
  
  // Header
  sectionTitle: document.getElementById("sectionTitle"),
  sectionSubtitle: document.getElementById("sectionSubtitle"),
  reportMonth: document.getElementById("reportMonth"),
  backButton: document.getElementById("backButton"),
  
  // Dashboard Section
  dashboardSection: document.getElementById("dashboardSection"),
  totalStudents: document.getElementById("totalStudents"),
  paidStudents: document.getElementById("paidStudents"),
  pendingStudents: document.getElementById("pendingStudents"),
  monthlyProfit: document.getElementById("monthlyProfit"),
  monthLabel: document.getElementById("monthLabel"),
  monthlyIncome: document.getElementById("monthlyIncome"),
  monthlyExpense: document.getElementById("monthlyExpense"),
  monthlyDetailsCard: document.getElementById("monthlyDetailsCard"),
  monthlyBreakdownNote: document.getElementById("monthlyBreakdownNote"),
  detailExpenseTotal: document.getElementById("detailExpenseTotal"),
  detailFeePaidTotal: document.getElementById("detailFeePaidTotal"),
  detailEnrolledCount: document.getElementById("detailEnrolledCount"),
  detailResultCard: document.getElementById("detailResultCard"),
  detailResultLabel: document.getElementById("detailResultLabel"),
  detailResultValue: document.getElementById("detailResultValue"),
  detailResultHint: document.getElementById("detailResultHint"),
  financeNavCard: document.getElementById("financeNavCard"),
  
  // Students Section
  studentsSection: document.getElementById("studentsSection"),
  studentForm: document.getElementById("studentForm"),
  studentSubmitButton: document.querySelector('#studentForm button[type="submit"]'),
  registrationHelp: document.getElementById("registrationHelp"),
  studentTableBody: document.getElementById("studentTableBody"),
  monthlyStudentNote: document.getElementById("monthlyStudentNote"),
  allStudentTableBody: document.getElementById("allStudentTableBody"),
  
  // Finance Section
  financeSection: document.getElementById("financeSection"),
  expenseForm: document.getElementById("expenseForm"),
  expenseSubmitButton: document.querySelector('#expenseForm button[type="submit"]'),
  expenseTableBody: document.getElementById("expenseTableBody"),
  
  // Form fields
  studentName: document.getElementById("studentName"),
  studentPhone: document.getElementById("studentPhone"),
  studentCourse: document.getElementById("studentCourse"),
  studentFee: document.getElementById("studentFee"),
  joinDate: document.getElementById("joinDate"),
  feeMonth: document.getElementById("feeMonth"),
  feeStatus: document.getElementById("feeStatus"),
  
  expenseTitle: document.getElementById("expenseTitle"),
  expenseAmount: document.getElementById("expenseAmount"),
  expenseMonth: document.getElementById("expenseMonth"),
  
  // Templates
  studentRowTemplate: document.getElementById("studentRowTemplate"),
  allStudentRowTemplate: document.getElementById("allStudentRowTemplate"),
  
  // Query selectors for dynamic classes
  adminOnlySections: document.querySelectorAll(".admin-only"),
  adminRegistrationOnlyFields: document.querySelectorAll(".admin-registration-only"),
};

const today = new Date();
const currentMonth = formatMonthValue(today);
const currentDate = today.toISOString().slice(0, 10);

const state = {
  selectedMonth: currentMonth,
  session: null,
  user: null,
  role: null,
  students: [],
  payments: [],
  expenses: [],
};

let supabaseClient = null;

bootstrapDefaults();
bindEvents();
void initApp();

function bootstrapDefaults() {
  elements.reportMonth.value = currentMonth;
  elements.joinDate.value = currentDate;
  elements.feeMonth.value = currentMonth;
  elements.expenseMonth.value = currentMonth;
}

function bindEvents() {
  // Login
  elements.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleLogin();
  });

  // Logout
  elements.logoutButton.addEventListener("click", () => {
    void handleLogout();
  });

  // Navigation items (sidebar)
  elements.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.dataset.section;
      switchSection(section);
      
      // Update active nav item
      elements.navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Navigation cards (dashboard)
  document.querySelectorAll(".nav-card").forEach((card) => {
    card.addEventListener("click", () => {
      const section = card.dataset.section;
      switchSection(section);
      
      // Update active nav item in sidebar
      elements.navItems.forEach((nav) => nav.classList.remove("active"));
      const mainNavItem = document.querySelector('[data-section="dashboard"]');
      if (mainNavItem) mainNavItem.classList.add("active");
    });
  });

  // Back button
  elements.backButton.addEventListener("click", () => {
    switchSection("dashboard");
    elements.navItems.forEach((nav) => nav.classList.remove("active"));
    const dashboardItem = document.querySelector('[data-section="dashboard"]');
    if (dashboardItem) dashboardItem.classList.add("active");
  });

  // Month selector
  elements.reportMonth.addEventListener("change", (event) => {
    state.selectedMonth = event.target.value || currentMonth;
    elements.feeMonth.value = state.selectedMonth;
    elements.expenseMonth.value = state.selectedMonth;
    void refreshPortalData();
  });

  elements.studentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void registerStudent(new FormData(elements.studentForm));
  });

  elements.expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void addExpense(new FormData(elements.expenseForm));
  });

  elements.studentTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-student-id]");
    if (!button || state.role !== "admin") {
      return;
    }

    void togglePaymentStatus(button.dataset.studentId);
  });
}

async function initApp() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    showMessage("error", "Supabase config is missing. Update supabase-config.js first.");
    elements.authGateText.textContent = "Supabase configuration is missing, so the portal cannot connect.";
    render();
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    showMessage("error", "Supabase client could not load from CDN.");
    elements.authGateText.textContent = "The Supabase client library did not load. Check your internet connection.";
    render();
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    void syncSession(session);
  });

  showMessage("info", "Connecting to Supabase...");

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    showMessage("error", normalizeError(error));
    render();
    return;
  }

  await syncSession(data.session);
}

async function syncSession(session) {
  state.session = session;
  state.user = session?.user ?? null;

  if (!state.user) {
    resetPortalState();
    showMessage("info", "Sign in with your admin or manager account to continue.");
    render();
    return;
  }

  const role = await fetchCurrentRole();
  state.role = role;

  if (!state.role) {
    resetPortalData();
    showMessage("error", "This account has no role in user_roles. Add admin or manager role in Supabase.");
    render();
    return;
  }

  await refreshPortalData({ silent: true });
  showMessage("success", `Signed in as ${state.user.email}.`);
  render();
}

async function fetchCurrentRole() {
  const { data, error } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", state.user.id)
    .maybeSingle();

  if (error) {
    showMessage("error", normalizeError(error));
    return null;
  }

  return data?.role || null;
}

async function handleLogin() {
  if (!supabaseClient) {
    return;
  }

  setButtonBusy(elements.loginButton, true, "Signing in...");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: elements.loginEmail.value.trim(),
    password: elements.loginPassword.value,
  });

  setButtonBusy(elements.loginButton, false, "Sign in");

  if (error) {
    showMessage("error", normalizeError(error));
    return;
  }

  elements.loginForm.reset();
  showMessage("info", "Login successful. Loading portal...");
}

async function handleLogout() {
  if (!supabaseClient) {
    return;
  }

  setButtonBusy(elements.logoutButton, true, "Logging out...");
  const { error } = await supabaseClient.auth.signOut();
  setButtonBusy(elements.logoutButton, false, "Log out");

  if (error) {
    showMessage("error", normalizeError(error));
    return;
  }

  showMessage("success", "Logged out.");
}

async function refreshPortalData(options = {}) {
  if (!supabaseClient || !state.user || !state.role) {
    render();
    return;
  }

  const { silent = false } = options;

  if (!silent) {
    showMessage("info", "Refreshing data...");
  }

  const [studentsResponse, paymentsResponse, expensesResponse] = await Promise.all([
    supabaseClient
      .from("students")
      .select("id, student_code, full_name, phone, course, monthly_fee, join_date, created_at")
      .order("created_at", { ascending: false }),
    state.role === "admin"
      ? supabaseClient
          .from("fee_payments")
          .select("id, student_id, fee_month, amount, status, created_at")
          .order("fee_month", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    state.role === "admin"
      ? supabaseClient
          .from("expenses")
          .select("id, title, expense_month, amount, created_at")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (studentsResponse.error) {
    showMessage("error", normalizeError(studentsResponse.error));
    render();
    return;
  }

  if (paymentsResponse.error) {
    showMessage("error", normalizeError(paymentsResponse.error));
    render();
    return;
  }

  if (expensesResponse.error) {
    showMessage("error", normalizeError(expensesResponse.error));
    render();
    return;
  }

  state.students = studentsResponse.data || [];
  state.payments = paymentsResponse.data || [];
  state.expenses = expensesResponse.data || [];

  render();

  if (!silent) {
    showMessage("success", `Data loaded for ${formatMonthLabel(state.selectedMonth)}.`);
  }
}

async function registerStudent(formData) {
  if (!supabaseClient || !state.role) {
    return;
  }

  setButtonBusy(elements.studentSubmitButton, true, "Saving...");

  const monthlyFee = Number(formData.get("studentFee"));
  const studentPayload = {
    full_name: formData.get("studentName").trim(),
    phone: formData.get("studentPhone").trim(),
    course: formData.get("studentCourse").trim(),
    monthly_fee: monthlyFee,
    join_date: formData.get("joinDate"),
  };

  const { data: student, error: studentError } = await supabaseClient
    .from("students")
    .insert(studentPayload)
    .select("id, student_code")
    .single();

  if (studentError) {
    setButtonBusy(elements.studentSubmitButton, false, "Register student");
    showMessage("error", normalizeError(studentError));
    return;
  }

  let successMessage = `Student ${student.student_code} registered successfully.`;

  if (state.role === "admin") {
    const feePayload = {
      student_id: student.id,
      fee_month: toDbMonthDate(formData.get("feeMonth")),
      amount: monthlyFee,
      status: formData.get("feeStatus"),
    };

    const { error: feeError } = await supabaseClient.from("fee_payments").insert(feePayload);

    if (feeError) {
      setButtonBusy(elements.studentSubmitButton, false, "Register student");
      await refreshPortalData({ silent: true });
      showMessage(
        "error",
        `${successMessage} The student was saved, but the initial fee status could not be stored.`,
      );
      return;
    }
  }

  elements.studentForm.reset();
  elements.joinDate.value = currentDate;
  elements.feeMonth.value = state.selectedMonth;
  elements.feeStatus.value = "pending";
  setButtonBusy(elements.studentSubmitButton, false, "Register student");
  await refreshPortalData({ silent: true });
  showMessage("success", successMessage);
}

async function addExpense(formData) {
  if (!supabaseClient || state.role !== "admin") {
    return;
  }

  setButtonBusy(elements.expenseSubmitButton, true, "Saving...");

  const { error } = await supabaseClient.from("expenses").insert({
    title: formData.get("expenseTitle").trim(),
    amount: Number(formData.get("expenseAmount")),
    expense_month: toDbMonthDate(formData.get("expenseMonth")),
  });

  setButtonBusy(elements.expenseSubmitButton, false, "Save expense");

  if (error) {
    showMessage("error", normalizeError(error));
    return;
  }

  elements.expenseForm.reset();
  elements.expenseMonth.value = state.selectedMonth;
  await refreshPortalData({ silent: true });
  showMessage("success", "Expense saved successfully.");
}

async function togglePaymentStatus(studentId) {
  if (!supabaseClient || state.role !== "admin") {
    return;
  }

  const student = state.students.find((entry) => String(entry.id) === String(studentId));
  if (!student) {
    return;
  }

  const currentPayment = getPayment(studentId);
  const nextStatus = currentPayment?.status === "paid" ? "pending" : "paid";

  const payload = {
    student_id: Number(studentId),
    fee_month: toDbMonthDate(state.selectedMonth),
    amount: Number(student.monthly_fee),
    status: nextStatus,
  };

  const response = currentPayment
    ? await supabaseClient.from("fee_payments").update(payload).eq("id", currentPayment.id)
    : await supabaseClient.from("fee_payments").insert(payload);

  if (response.error) {
    showMessage("error", normalizeError(response.error));
    return;
  }

  await refreshPortalData({ silent: true });
  showMessage("success", `Fee marked ${nextStatus} for ${student.full_name}.`);
}

function render() {
  const hasSession = Boolean(state.user);
  const hasAccess = Boolean(state.user && state.role);

  // Show/hide login screen vs dashboard
  elements.loginScreen.classList.toggle("is-hidden", hasAccess);
  elements.appLayout.classList.toggle("is-hidden", !hasAccess);

  if (hasSession) {
    elements.sessionEmail.textContent = state.user.email || "Unknown user";
    elements.sessionRoleLabel.textContent = capitalize(state.role || "pending setup");
  }

  renderRole();
  renderSummary();
  renderStudents();
  renderAllStudents();
  renderExpenses();
}

function switchSection(sectionName) {
  // Hide all sections
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });

  // Show selected section
  let section = null;
  let title = "";
  let subtitle = "";
  let showBackButton = false;

  switch (sectionName) {
    case "dashboard":
      section = elements.dashboardSection;
      title = "Dashboard";
      subtitle = "Overview of your library";
      showBackButton = false;
      break;
    case "students":
      section = elements.studentsSection;
      title = "Student Management";
      subtitle = "Register and manage students";
      showBackButton = true;
      break;
    case "finance":
      section = elements.financeSection;
      title = "Finance Management";
      subtitle = "Track expenses and profit";
      showBackButton = true;
      break;
  }

  if (section) {
    section.classList.add("active");
    elements.sectionTitle.textContent = title;
    elements.sectionSubtitle.textContent = subtitle;
    elements.backButton.classList.toggle("show", showBackButton);
  }
}

function renderRole() {
  const isAdmin = state.role === "admin";

  // Show/hide admin-only sections
  elements.monthlyDetailsCard?.classList.toggle("show", isAdmin);
  elements.financeSection?.classList.toggle("show", isAdmin);
  
  // Show nav card for finance section
  const financeNavCard = document.getElementById("financeNavCard");
  if (financeNavCard) {
    financeNavCard.classList.toggle("show", isAdmin);
  }
  
  // Show nav item for finance section (if exists)
  const financeNavItem = document.querySelector('[data-section="finance"]');
  if (financeNavItem) {
    financeNavItem.classList.toggle("show", isAdmin);
  }

  // Show/hide admin-only form fields
  elements.adminOnlySections.forEach((section) => {
    section.classList.toggle("show", isAdmin);
  });

  elements.adminRegistrationOnlyFields.forEach((field) => {
    field.classList.toggle("show", isAdmin);
  });
}

function renderSummary() {
  const overallStats = getOverallStats();

  elements.totalStudents.textContent = String(overallStats.totalStudents);
  elements.paidStudents.textContent = String(overallStats.activeCount);
  elements.pendingStudents.textContent = String(overallStats.enrolledCount);
  elements.monthlyIncome.textContent = formatCurrency(overallStats.income);
  elements.monthlyExpense.textContent = formatCurrency(overallStats.expenses);
  elements.monthlyProfit.textContent = formatCurrency(overallStats.result);
  elements.monthLabel.textContent = `Overall totals with monthly filter set to ${formatMonthLabel(
    state.selectedMonth,
  )}`;
}

function renderStudents() {
  const visibleStudents = getVisibleStudentsForSelectedMonth();
  elements.monthlyStudentNote.textContent = `Students who joined on or before ${formatMonthLabel(
    state.selectedMonth,
  )} appear here. Students from later months stay hidden.`;

  if (visibleStudents.length === 0) {
    elements.studentTableBody.innerHTML =
      '<tr><td colspan="7" class="empty-state">No students available for this selected month yet.</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();

  visibleStudents.forEach((student) => {
    const payment = getPayment(student.id);
    const row = elements.studentRowTemplate.content.firstElementChild.cloneNode(true);

    row.querySelector('[data-field="id"]').textContent = student.student_code || `STD-${student.id}`;
    row.querySelector('[data-field="name"]').textContent = student.full_name;
    row.querySelector('[data-field="course"]').textContent = student.course;
    row.querySelector('[data-field="phone"]').textContent = student.phone || "-";
    row.querySelector('[data-field="monthlyFee"]').textContent = formatCurrency(student.monthly_fee);

    const statusCell = row.querySelector('[data-field="status"]');
    const statusBadge = document.createElement("span");
    statusBadge.className = `status-text ${
      state.role === "admin" ? payment?.status || "pending" : "restricted"
    }`;
    statusBadge.textContent =
      state.role === "admin" ? capitalize(payment?.status || "pending") : "Admin only";
    statusCell.appendChild(statusBadge);

    const actionCell = row.querySelector('[data-field="action"]');
    if (state.role === "admin") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `status-btn ${payment?.status || "pending"}`;
      button.dataset.studentId = String(student.id);
      button.textContent = `Mark ${payment?.status === "paid" ? "Pending" : "Paid"}`;
      actionCell.appendChild(button);
    } else {
      actionCell.textContent = "No access";
    }

    fragment.appendChild(row);
  });

  elements.studentTableBody.innerHTML = "";
  elements.studentTableBody.appendChild(fragment);
}

function renderExpenses() {
  const monthlyStats = getMonthlyStats();
  const selectedMonthExpenses = getSelectedMonthExpenses();
  const hasProfit = monthlyStats.result >= 0;

  elements.monthlyBreakdownNote.textContent = `Full breakdown for ${formatMonthLabel(state.selectedMonth)}.`;
  elements.detailExpenseTotal.textContent = formatCurrency(monthlyStats.expenses);
  elements.detailFeePaidTotal.textContent = formatCurrency(monthlyStats.income);
  elements.detailEnrolledCount.textContent = String(monthlyStats.enrolledCount);
  elements.detailResultCard.classList.toggle("loss", !hasProfit);
  elements.detailResultLabel.textContent = hasProfit ? "Monthly profit" : "Monthly loss";
  elements.detailResultValue.textContent = formatCurrency(Math.abs(monthlyStats.result));
  elements.detailResultHint.textContent = hasProfit
    ? "Selected month finished above expenses."
    : "Selected month expenses are higher than collected fees.";

  if (selectedMonthExpenses.length === 0) {
    elements.expenseTableBody.innerHTML =
      '<tr><td colspan="3" class="empty-state">No expenses recorded for this month.</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();

  selectedMonthExpenses.forEach((entry) => {
    const row = document.createElement("tr");
    const titleCell = document.createElement("td");
    const monthCell = document.createElement("td");
    const amountCell = document.createElement("td");

    titleCell.textContent = entry.title;
    monthCell.textContent = formatMonthLabel(fromDbMonthDate(entry.expense_month));
    amountCell.textContent = formatCurrency(entry.amount);

    row.append(titleCell, monthCell, amountCell);
    fragment.appendChild(row);
  });

  elements.expenseTableBody.innerHTML = "";
  elements.expenseTableBody.appendChild(fragment);
}

function renderAllStudents() {
  if (state.students.length === 0) {
    elements.allStudentTableBody.innerHTML =
      '<tr><td colspan="6" class="empty-state">No students registered yet.</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();

  state.students.forEach((student) => {
    const row = elements.allStudentRowTemplate.content.firstElementChild.cloneNode(true);

    row.querySelector('[data-field="id"]').textContent = student.student_code || `STD-${student.id}`;
    row.querySelector('[data-field="name"]').textContent = student.full_name;
    row.querySelector('[data-field="course"]').textContent = student.course;
    row.querySelector('[data-field="phone"]').textContent = student.phone || "-";
    row.querySelector('[data-field="joinDate"]').textContent = formatDate(student.join_date);
    row.querySelector('[data-field="monthlyFee"]').textContent = formatCurrency(student.monthly_fee);

    fragment.appendChild(row);
  });

  elements.allStudentTableBody.innerHTML = "";
  elements.allStudentTableBody.appendChild(fragment);
}

function resetPortalState() {
  state.session = null;
  state.user = null;
  state.role = null;
  resetPortalData();
}

function resetPortalData() {
  state.students = [];
  state.payments = [];
  state.expenses = [];
}

function getMonthlyStats() {
  const paidPayments = getSelectedMonthPayments().filter((entry) => entry.status === "paid");
  const income = paidPayments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const expenses = getSelectedMonthExpenses().reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const enrolledCount = getEnrolledStudentsForSelectedMonth().length;

  return {
    paidCount: paidPayments.length,
    income,
    expenses,
    enrolledCount,
    result: income - expenses,
  };
}

function getOverallStats() {
  const paidPayments = state.payments.filter((entry) => entry.status === "paid");
  const income = paidPayments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const expenses = state.expenses.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return {
    totalStudents: state.students.length,
    activeCount: getVisibleStudentsForSelectedMonth().length,
    enrolledCount: getEnrolledStudentsForSelectedMonth().length,
    income,
    expenses,
    result: income - expenses,
  };
}

function getVisibleStudentsForSelectedMonth() {
  return state.students.filter((student) => joinedOnOrBeforeMonth(student.join_date, state.selectedMonth));
}

function getEnrolledStudentsForSelectedMonth() {
  return state.students.filter((student) => isSameMonth(student.join_date, state.selectedMonth));
}

function getSelectedMonthPayments() {
  return state.payments.filter((entry) => fromDbMonthDate(entry.fee_month) === state.selectedMonth);
}

function getSelectedMonthExpenses() {
  return state.expenses.filter((entry) => fromDbMonthDate(entry.expense_month) === state.selectedMonth);
}

function getPayment(studentId) {
  return (
    state.payments.find(
      (entry) =>
        String(entry.student_id) === String(studentId) && fromDbMonthDate(entry.fee_month) === state.selectedMonth,
    ) || null
  );
}

function setButtonBusy(button, isBusy, busyLabel) {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }

  button.disabled = isBusy;
  button.textContent = isBusy ? busyLabel : button.dataset.defaultLabel;
}

function showMessage(type, text) {
  elements.appMessage.className = `app-message ${type}`;
  elements.appMessage.textContent = text;
}

function normalizeError(error) {
  const message = typeof error === "string" ? error : error?.message || "Something went wrong.";

  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  return message;
}

function toDbMonthDate(monthValue) {
  return `${monthValue}-01`;
}

function fromDbMonthDate(dateValue) {
  return String(dateValue).slice(0, 7);
}

function isSameMonth(dateValue, monthValue) {
  if (!dateValue || !monthValue) {
    return false;
  }

  return String(dateValue).slice(0, 7) === monthValue;
}

function joinedOnOrBeforeMonth(dateValue, monthValue) {
  if (!dateValue || !monthValue) {
    return false;
  }

  return String(dateValue).slice(0, 7) <= monthValue;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatMonthLabel(monthValue) {
  if (!monthValue) {
    return "the selected month";
  }

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

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(dateValue).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

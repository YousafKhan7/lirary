// Dashboard page logic
const today = new Date();
const currentMonth = formatMonthValue(today);

let selectedMonth = currentMonth;
let students = [];
let payments = [];
let expenses = [];

// Initialize dashboard
document.addEventListener("DOMContentLoaded", async () => {
  const client = await initAuth();
  if (!client) return;

  // Set default month
  const monthInput = document.getElementById("reportMonth");
  if (monthInput) {
    monthInput.value = currentMonth;
    monthInput.addEventListener("change", (e) => {
      selectedMonth = e.target.value || currentMonth;
      loadDashboardData();
    });
  }

  await loadDashboardData();
});

// Load all dashboard data
async function loadDashboardData() {
  if (!supabaseClient) return;

  showMessage("appMessage", "info", "Loading dashboard data...");

  try {
    // Fetch students
    const studentsResponse = await supabaseClient
      .from("students")
      .select("id, student_code, full_name, father_name, phone, course, address, monthly_fee, join_date, created_at")
      .order("created_at", { ascending: false });

    if (studentsResponse.error) throw studentsResponse.error;
    students = studentsResponse.data || [];

    // Fetch payments (admin only)
    if (currentRole === "admin") {
      const paymentsResponse = await supabaseClient
        .from("fee_payments")
        .select("id, student_id, fee_month, amount, status, created_at")
        .order("fee_month", { ascending: false });

      if (paymentsResponse.error) throw paymentsResponse.error;
      payments = paymentsResponse.data || [];

      // Fetch expenses
      const expensesResponse = await supabaseClient
        .from("expenses")
        .select("id, title, expense_month, amount, created_at")
        .order("created_at", { ascending: false });

      if (expensesResponse.error) throw expensesResponse.error;
      expenses = expensesResponse.data || [];
    }

    renderDashboard();
    showMessage("appMessage", "success", `Dashboard loaded for ${formatMonthLabel(selectedMonth)}`);
    
    // Hide message after 3 seconds
    setTimeout(() => {
      document.getElementById("appMessage")?.classList.add("is-hidden");
    }, 3000);

  } catch (error) {
    showMessage("appMessage", "error", error.message || "Failed to load dashboard data");
  }
}

// Render dashboard statistics
function renderDashboard() {
  const overallStats = getOverallStats();
  const monthlyStats = getMonthlyStats();

  // Overall stats
  document.getElementById("totalStudents").textContent = String(overallStats.totalStudents);
  document.getElementById("paidStudents").textContent = String(overallStats.activeCount);
  document.getElementById("pendingStudents").textContent = String(overallStats.enrolledCount);
  document.getElementById("monthlyIncome").textContent = formatCurrency(overallStats.income);
  document.getElementById("monthlyExpense").textContent = formatCurrency(overallStats.expenses);
  document.getElementById("monthlyProfit").textContent = formatCurrency(overallStats.result);

  // Monthly breakdown (admin only)
  if (currentRole === "admin") {
    const hasProfit = monthlyStats.result >= 0;
    
    document.getElementById("selectedMonthDisplay").textContent = formatMonthLabel(selectedMonth);
    document.getElementById("detailExpenseTotal").textContent = formatCurrency(monthlyStats.expenses);
    document.getElementById("detailFeePaidTotal").textContent = formatCurrency(monthlyStats.income);
    document.getElementById("detailEnrolledCount").textContent = String(monthlyStats.enrolledCount);
    
    const resultCard = document.getElementById("detailResultCard");
    resultCard.classList.toggle("loss", !hasProfit);
    
    document.getElementById("detailResultLabel").textContent = hasProfit ? "Monthly Profit" : "Monthly Loss";
    document.getElementById("detailResultValue").textContent = formatCurrency(Math.abs(monthlyStats.result));
    document.getElementById("detailResultHint").textContent = hasProfit
      ? "Selected month finished above expenses"
      : "Selected month expenses are higher than collected fees";
  }
}

// Calculate overall statistics
function getOverallStats() {
  const paidPayments = payments.filter((entry) => entry.status === "paid");
  const income = paidPayments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return {
    totalStudents: students.length,
    activeCount: getVisibleStudentsForSelectedMonth().length,
    enrolledCount: getEnrolledStudentsForSelectedMonth().length,
    income,
    expenses: totalExpenses,
    result: income - totalExpenses,
  };
}

// Calculate monthly statistics
function getMonthlyStats() {
  const paidPayments = getSelectedMonthPayments().filter((entry) => entry.status === "paid");
  const income = paidPayments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const monthExpenses = getSelectedMonthExpenses().reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const enrolledCount = getEnrolledStudentsForSelectedMonth().length;

  return {
    paidCount: paidPayments.length,
    income,
    expenses: monthExpenses,
    enrolledCount,
    result: income - monthExpenses,
  };
}

// Helper functions
function getVisibleStudentsForSelectedMonth() {
  return students.filter((student) => joinedOnOrBeforeMonth(student.join_date, selectedMonth));
}

function getEnrolledStudentsForSelectedMonth() {
  return students.filter((student) => isSameMonth(student.join_date, selectedMonth));
}

function getSelectedMonthPayments() {
  return payments.filter((entry) => fromDbMonthDate(entry.fee_month) === selectedMonth);
}

function getSelectedMonthExpenses() {
  return expenses.filter((entry) => fromDbMonthDate(entry.expense_month) === selectedMonth);
}

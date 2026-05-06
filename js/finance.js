// Finance page logic
const today = new Date();
const currentMonth = formatMonthValue(today);

let selectedMonth = currentMonth;
let students = [];
let payments = [];
let expenses = [];

// Initialize finance page
document.addEventListener("DOMContentLoaded", async () => {
  const client = await initAuth();
  if (!client) return;

  // Check if user is admin
  if (currentRole !== "admin") {
    alert("Access denied. Only administrators can access finance management.");
    window.location.href = "dashboard.html";
    return;
  }

  // Set default values
  const monthInput = document.getElementById("reportMonth");
  const expenseMonthInput = document.getElementById("expenseMonth");

  if (monthInput) {
    monthInput.value = currentMonth;
    monthInput.addEventListener("change", (e) => {
      selectedMonth = e.target.value || currentMonth;
      if (expenseMonthInput) expenseMonthInput.value = selectedMonth;
      loadFinanceData();
    });
  }

  if (expenseMonthInput) expenseMonthInput.value = currentMonth;

  // Setup form submission
  const expenseForm = document.getElementById("expenseForm");
  if (expenseForm) {
    expenseForm.addEventListener("submit", handleExpenseSubmission);
  }

  // Setup modal close handlers
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal-overlay");
      if (modal) modal.classList.remove("show");
    });
  });

  // Setup Edit form submission
  const editExpenseForm = document.getElementById("editExpenseForm");
  if (editExpenseForm) {
    editExpenseForm.addEventListener("submit", handleUpdateExpense);
  }

  // Setup table action handlers
  const expenseTableBody = document.getElementById("expenseTableBody");
  if (expenseTableBody) {
    expenseTableBody.addEventListener("click", (event) => {
      const btn = event.target.closest(".action-btn");
      if (!btn) return;
      
      const id = btn.dataset.expenseId;
      const action = btn.dataset.action;
      
      if (action === "edit") openEditExpenseModal(id);
      else if (action === "delete") handleDeleteExpense(id);
    });
  }

  await loadFinanceData();
});

// Load finance data
async function loadFinanceData() {
  if (!supabaseClient) return;

  showMessage("appMessage", "info", "Loading finance data...");

  try {
    // Fetch students
    const studentsResponse = await supabaseClient
      .from("students")
      .select("id, student_code, full_name, father_name, phone, course, address, monthly_fee, join_date, created_at")
      .order("created_at", { ascending: false });

    if (studentsResponse.error) throw studentsResponse.error;
    students = studentsResponse.data || [];

    // Fetch payments
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

    renderMonthlyBreakdown();
    renderExpensesTable();
    
    showMessage("appMessage", "success", "Finance data loaded successfully");
    setTimeout(() => {
      document.getElementById("appMessage")?.classList.add("is-hidden");
    }, 3000);

  } catch (error) {
    showMessage("appMessage", "error", error.message || "Failed to load finance data");
  }
}

// Handle expense submission
async function handleExpenseSubmission(event) {
  event.preventDefault();

  if (!supabaseClient) return;

  const submitBtn = document.getElementById("expenseSubmitButton");
  setButtonBusy(submitBtn, true, "Saving...");

  try {
    const formData = new FormData(event.target);

    const expensePayload = {
      title: formData.get("expenseTitle").trim(),
      amount: Number(formData.get("expenseAmount")),
      expense_month: toDbMonthDate(formData.get("expenseMonth")),
    };

    const { error } = await supabaseClient
      .from("expenses")
      .insert(expensePayload);

    if (error) throw error;

    // Reset form
    event.target.reset();
    document.getElementById("expenseMonth").value = selectedMonth;

    showMessage("appMessage", "success", "Expense saved successfully");
    await loadFinanceData();

  } catch (error) {
    showMessage("appMessage", "error", error.message || "Failed to save expense");
  } finally {
    setButtonBusy(submitBtn, false, "Save Expense");
  }
}

// Render monthly breakdown
function renderMonthlyBreakdown() {
  const monthlyStats = getMonthlyStats();
  const hasProfit = monthlyStats.result >= 0;

  document.getElementById("monthlyBreakdownNote").textContent = 
    `Financial details for ${formatMonthLabel(selectedMonth)}`;
  
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

// Render expenses table
function renderExpensesTable() {
  const tbody = document.getElementById("expenseTableBody");
  if (!tbody) return;

  const selectedMonthExpenses = expenses.filter((entry) => 
    fromDbMonthDate(entry.expense_month) === selectedMonth
  );

  if (selectedMonthExpenses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No expenses recorded for this month</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();

  selectedMonthExpenses.forEach((expense) => {
    const row = document.createElement("tr");
    
    const titleCell = document.createElement("td");
    titleCell.textContent = expense.title;
    
    const monthCell = document.createElement("td");
    monthCell.textContent = formatMonthLabel(fromDbMonthDate(expense.expense_month));
    
    const amountCell = document.createElement("td");
    amountCell.textContent = formatCurrency(expense.amount);

    const actionCell = document.createElement("td");
    actionCell.className = "action-buttons";
    
    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "action-btn edit";
    editBtn.innerHTML = "✏️";
    editBtn.title = "Edit Expense";
    editBtn.dataset.expenseId = String(expense.id);
    editBtn.dataset.action = "edit";
    actionCell.appendChild(editBtn);

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.className = "action-btn delete";
    delBtn.innerHTML = "🗑️";
    delBtn.title = "Delete Expense";
    delBtn.dataset.expenseId = String(expense.id);
    delBtn.dataset.action = "delete";
    actionCell.appendChild(delBtn);

    row.append(titleCell, monthCell, amountCell, actionCell);
    fragment.appendChild(row);
  });

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}

// Expense Action Logic
function openEditExpenseModal(expenseId) {
  const expense = expenses.find((e) => String(e.id) === String(expenseId));
  if (!expense) return;

  document.getElementById("editExpenseId").value = expense.id;
  document.getElementById("editExpenseTitle").value = expense.title;
  document.getElementById("editExpenseAmount").value = expense.amount;
  document.getElementById("editExpenseMonth").value = fromDbMonthDate(expense.expense_month);

  document.getElementById("editExpenseModal").classList.add("show");
}

async function handleUpdateExpense(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const expenseId = formData.get("expenseId");
  const submitBtn = document.getElementById("editExpenseSubmitBtn");

  setButtonBusy(submitBtn, true, "Updating...");

  try {
    const payload = {
      title: formData.get("expenseTitle").trim(),
      amount: Number(formData.get("expenseAmount")),
      expense_month: toDbMonthDate(formData.get("expenseMonth")),
    };

    const { error } = await supabaseClient.from("expenses").update(payload).eq("id", expenseId);
    if (error) throw error;

    document.getElementById("editExpenseModal").classList.remove("show");
    showMessage("appMessage", "success", "Expense updated successfully");
    await loadFinanceData();
  } catch (error) {
    showMessage("appMessage", "error", error.message || "Failed to update expense");
  } finally {
    setButtonBusy(submitBtn, false, "Update Expense");
  }
}

async function handleDeleteExpense(expenseId) {
  const expense = expenses.find((e) => String(e.id) === String(expenseId));
  if (!expense) return;

  if (!confirm(`Are you sure you want to delete expense "${expense.title}"?`)) {
    return;
  }

  try {
    const { error } = await supabaseClient.from("expenses").delete().eq("id", expenseId);
    if (error) throw error;

    showMessage("appMessage", "success", "Expense deleted successfully");
    await loadFinanceData();
  } catch (error) {
    showMessage("appMessage", "error", error.message || "Failed to delete expense");
  }
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
function getEnrolledStudentsForSelectedMonth() {
  return students.filter((student) => isSameMonth(student.join_date, selectedMonth));
}

function getSelectedMonthPayments() {
  return payments.filter((entry) => fromDbMonthDate(entry.fee_month) === selectedMonth);
}

function getSelectedMonthExpenses() {
  return expenses.filter((entry) => fromDbMonthDate(entry.expense_month) === selectedMonth);
}

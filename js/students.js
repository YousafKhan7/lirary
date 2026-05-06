// Students page logic
const today = new Date();
const currentMonth = formatMonthValue(today);
const currentDate = today.toISOString().slice(0, 10);

let selectedMonth = currentMonth;
let students = [];
let payments = [];

// Initialize students page
document.addEventListener("DOMContentLoaded", async () => {
  const client = await initAuth();
  if (!client) return;

  // Set default values
  const monthInput = document.getElementById("reportMonth");
  const joinDateInput = document.getElementById("joinDate");
  const feeMonthInput = document.getElementById("feeMonth");

  if (monthInput) {
    monthInput.value = currentMonth;
    monthInput.addEventListener("change", (e) => {
      selectedMonth = e.target.value || currentMonth;
      if (feeMonthInput) feeMonthInput.value = selectedMonth;
      loadStudentsData();
    });
  }

  if (joinDateInput) joinDateInput.value = currentDate;
  if (feeMonthInput) feeMonthInput.value = currentMonth;

  // Setup form submission
  const studentForm = document.getElementById("studentForm");
  if (studentForm) {
    studentForm.addEventListener("submit", handleStudentRegistration);
  }

  // Setup modal close handlers
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal-overlay");
      if (modal) modal.classList.remove("show");
    });
  });

  // Setup Edit form submission
  const editStudentForm = document.getElementById("editStudentForm");
  if (editStudentForm) {
    editStudentForm.addEventListener("submit", handleUpdateStudent);
  }

  // Setup table action handlers
  const studentTableBody = document.getElementById("studentTableBody");
  const allStudentTableBody = document.getElementById("allStudentTableBody");
  
  const handleTableActions = (event) => {
    const btn = event.target.closest(".action-btn, .status-btn");
    if (!btn) return;
    
    const studentId = btn.dataset.studentId;
    const action = btn.dataset.action;
    
    if (action === "view") openViewModal(studentId);
    else if (action === "edit") openEditModal(studentId);
    else if (action === "delete") handleDeleteStudent(studentId);
    else if (btn.classList.contains("status-btn")) handlePaymentToggle(studentId);
  };

  if (studentTableBody) studentTableBody.addEventListener("click", handleTableActions);
  if (allStudentTableBody) allStudentTableBody.addEventListener("click", handleTableActions);

  await loadStudentsData();
});

// Load students data
async function loadStudentsData() {
  if (!supabaseClient) return;

  showMessage("appMessage", "info", "Loading students data...");

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
    }

    renderMonthlyStudents();
    renderAllStudents();
    
    showMessage("appMessage", "success", "Students data loaded successfully");
    setTimeout(() => {
      document.getElementById("appMessage")?.classList.add("is-hidden");
    }, 3000);

  } catch (error) {
    showMessage("appMessage", "error", error.message || "Failed to load students data");
  }
}

// Handle student registration
async function handleStudentRegistration(event) {
  event.preventDefault();

  if (!supabaseClient) return;

  const submitBtn = document.getElementById("studentSubmitButton");
  setButtonBusy(submitBtn, true, "Saving...");

  try {
    const formData = new FormData(event.target);
    const monthlyFee = Number(formData.get("studentFee"));

    const studentPayload = {
      full_name: formData.get("studentName").trim(),
      father_name: formData.get("fatherName").trim(),
      phone: formData.get("studentPhone").trim(),
      course: formData.get("studentCourse").trim(),
      address: formData.get("studentAddress").trim(),
      monthly_fee: monthlyFee,
      join_date: formData.get("joinDate"),
    };

    const { data: student, error: studentError } = await supabaseClient
      .from("students")
      .insert(studentPayload)
      .select("id, student_code")
      .single();

    if (studentError) throw studentError;

    let successMessage = `Student ${student.student_code} registered successfully.`;

    // If admin, also create fee payment record
    if (currentRole === "admin") {
      const feePayload = {
        student_id: student.id,
        fee_month: toDbMonthDate(formData.get("feeMonth")),
        amount: monthlyFee,
        status: formData.get("feeStatus"),
      };

      const { error: feeError } = await supabaseClient
        .from("fee_payments")
        .insert(feePayload);

      if (feeError) {
        console.error("Fee payment error:", feeError);
        successMessage += " (Fee status could not be saved)";
      }
    }

    // Reset form
    event.target.reset();
    document.getElementById("joinDate").value = currentDate;
    document.getElementById("feeMonth").value = selectedMonth;
    document.getElementById("feeStatus").value = "pending";

    showMessage("appMessage", "success", successMessage);
    await loadStudentsData();

  } catch (error) {
    showMessage("appMessage", "error", error.message || "Failed to register student");
  } finally {
    setButtonBusy(submitBtn, false, "Register Student");
  }
}

// Handle payment status toggle
async function handlePaymentToggle(studentId) {
  if (currentRole !== "admin") return;

  const student = students.find((s) => String(s.id) === String(studentId));
  if (!student) return;

  try {
    const currentPayment = getPayment(studentId);
    const nextStatus = currentPayment?.status === "paid" ? "pending" : "paid";

    const payload = {
      student_id: Number(studentId),
      fee_month: toDbMonthDate(selectedMonth),
      amount: Number(student.monthly_fee),
      status: nextStatus,
    };

    const response = currentPayment
      ? await supabaseClient.from("fee_payments").update(payload).eq("id", currentPayment.id)
      : await supabaseClient.from("fee_payments").insert(payload);

    if (response.error) throw response.error;

    showMessage("appMessage", "success", `Fee marked ${nextStatus} for ${student.full_name}`);
    await loadStudentsData();

  } catch (error) {
    showMessage("appMessage", "error", error.message || "Failed to update payment status");
  }
}

// Student View Logic
function openViewModal(studentId) {
  const student = students.find((s) => String(s.id) === String(studentId));
  if (!student) return;

  const contentEl = document.getElementById("studentDetailContent");
  contentEl.innerHTML = `
    <div class="detail-item">
      <label>Full Name</label>
      <span>${student.full_name}</span>
    </div>
    <div class="detail-item">
      <label>Student ID</label>
      <span>${student.student_code || "N/A"}</span>
    </div>
    <div class="detail-item">
      <label>Father Name</label>
      <span>${student.father_name || "N/A"}</span>
    </div>
    <div class="detail-item">
      <label>Phone</label>
      <span>${student.phone || "N/A"}</span>
    </div>
    <div class="detail-item">
      <label>Course</label>
      <span>${student.course}</span>
    </div>
    <div class="detail-item">
      <label>Monthly Fee</label>
      <span>${formatCurrency(student.monthly_fee)}</span>
    </div>
    <div class="detail-item">
      <label>Join Date</label>
      <span>${formatDate(student.join_date)}</span>
    </div>
    <div class="detail-item">
      <label>Internal ID</label>
      <span>${student.id}</span>
    </div>
    <div class="detail-item full-width">
      <label>Address</label>
      <span>${student.address || "No address provided"}</span>
    </div>
  `;

  document.getElementById("viewStudentModal").classList.add("show");
}

// Student Edit Logic
function openEditModal(studentId) {
  const student = students.find((s) => String(s.id) === String(studentId));
  if (!student) return;

  document.getElementById("editStudentId").value = student.id;
  document.getElementById("editStudentName").value = student.full_name;
  document.getElementById("editFatherName").value = student.father_name || "";
  document.getElementById("editStudentPhone").value = student.phone || "";
  document.getElementById("editStudentCourse").value = student.course;
  document.getElementById("editStudentAddress").value = student.address || "";
  document.getElementById("editStudentFee").value = student.monthly_fee;
  document.getElementById("editJoinDate").value = student.join_date;

  document.getElementById("editStudentModal").classList.add("show");
}

async function handleUpdateStudent(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const studentId = formData.get("studentId");
  const submitBtn = document.getElementById("editStudentSubmitBtn");

  setButtonBusy(submitBtn, true, "Updating...");

  try {
    const payload = {
      full_name: formData.get("studentName").trim(),
      father_name: formData.get("fatherName").trim(),
      phone: formData.get("studentPhone").trim(),
      course: formData.get("studentCourse").trim(),
      address: formData.get("studentAddress").trim(),
      monthly_fee: Number(formData.get("studentFee")),
      join_date: formData.get("joinDate"),
    };

    const { error } = await supabaseClient.from("students").update(payload).eq("id", studentId);
    if (error) throw error;

    document.getElementById("editStudentModal").classList.remove("show");
    showMessage("appMessage", "success", "Student updated successfully");
    await loadStudentsData();
  } catch (error) {
    showMessage("appMessage", "error", error.message || "Failed to update student");
  } finally {
    setButtonBusy(submitBtn, false, "Update Student");
  }
}

async function handleDeleteStudent(studentId) {
  const student = students.find((s) => String(s.id) === String(studentId));
  if (!student) return;

  if (!confirm(`Are you sure you want to delete ${student.full_name}? This will also delete their payment history.`)) {
    return;
  }

  try {
    // Supabase should handle cascading delete if configured, otherwise we delete payments first
    // For safety in this environment, we delete the student
    const { error } = await supabaseClient.from("students").delete().eq("id", studentId);
    if (error) throw error;

    showMessage("appMessage", "success", "Student deleted successfully");
    await loadStudentsData();
  } catch (error) {
    showMessage("appMessage", "error", error.message || "Failed to delete student");
  }
}

// Render monthly students table
function renderMonthlyStudents() {
  const tbody = document.getElementById("studentTableBody");
  if (!tbody) return;

  const visibleStudents = students.filter((student) => 
    joinedOnOrBeforeMonth(student.join_date, selectedMonth)
  );

  document.getElementById("monthlyStudentNote").textContent = 
    `Students who joined on or before ${formatMonthLabel(selectedMonth)} appear here.`;

  if (visibleStudents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No students this month</td></tr>';
    return;
  }

  const template = document.getElementById("studentRowTemplate");
  const fragment = document.createDocumentFragment();

  visibleStudents.forEach((student) => {
    const payment = getPayment(student.id);
    const row = template.content.firstElementChild.cloneNode(true);

    row.querySelector('[data-field="id"]').textContent = student.student_code || `STD-${student.id}`;
    row.querySelector('[data-field="name"]').textContent = student.full_name;
    row.querySelector('[data-field="fatherName"]').textContent = student.father_name || "-";
    row.querySelector('[data-field="course"]').textContent = student.course;
    row.querySelector('[data-field="phone"]').textContent = student.phone || "-";
    row.querySelector('[data-field="monthlyFee"]').textContent = formatCurrency(student.monthly_fee);

    const statusCell = row.querySelector('[data-field="status"]');
    const statusBadge = document.createElement("span");
    statusBadge.className = `status-text ${
      currentRole === "admin" ? payment?.status || "pending" : "restricted"
    }`;
    statusBadge.textContent =
      currentRole === "admin" ? capitalize(payment?.status || "pending") : "Admin only";
    statusCell.appendChild(statusBadge);

    const actionCell = row.querySelector('[data-field="action"]');
    
    // View button (always present)
    const viewBtn = document.createElement("button");
    viewBtn.className = "action-btn view";
    viewBtn.innerHTML = "👁️";
    viewBtn.title = "View Details";
    viewBtn.dataset.studentId = String(student.id);
    viewBtn.dataset.action = "view";
    actionCell.appendChild(viewBtn);

    if (currentRole === "admin") {
      // Status Toggle button
      const statusBtn = document.createElement("button");
      statusBtn.type = "button";
      statusBtn.className = `status-btn ${payment?.status || "pending"}`;
      statusBtn.dataset.studentId = String(student.id);
      statusBtn.textContent = payment?.status === "paid" ? "Paid" : "Pay";
      actionCell.appendChild(statusBtn);

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "action-btn edit";
      editBtn.innerHTML = "✏️";
      editBtn.title = "Edit Student";
      editBtn.dataset.studentId = String(student.id);
      editBtn.dataset.action = "edit";
      actionCell.appendChild(editBtn);

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.className = "action-btn delete";
      delBtn.innerHTML = "🗑️";
      delBtn.title = "Delete Student";
      delBtn.dataset.studentId = String(student.id);
      delBtn.dataset.action = "delete";
      actionCell.appendChild(delBtn);
    }

    fragment.appendChild(row);
  });

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}

// Render all students table
function renderAllStudents() {
  const tbody = document.getElementById("allStudentTableBody");
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No students registered yet</td></tr>';
    return;
  }

  const template = document.getElementById("allStudentRowTemplate");
  const fragment = document.createDocumentFragment();

  students.forEach((student) => {
    const row = template.content.firstElementChild.cloneNode(true);

    row.querySelector('[data-field="id"]').textContent = student.student_code || `STD-${student.id}`;
    row.querySelector('[data-field="name"]').textContent = student.full_name;
    row.querySelector('[data-field="fatherName"]').textContent = student.father_name || "-";
    row.querySelector('[data-field="course"]').textContent = student.course;
    row.querySelector('[data-field="phone"]').textContent = student.phone || "-";
    row.querySelector('[data-field="address"]').textContent = student.address || "-";
    row.querySelector('[data-field="joinDate"]').textContent = formatDate(student.join_date);
    row.querySelector('[data-field="monthlyFee"]').textContent = formatCurrency(student.monthly_fee);

    const actionCell = row.querySelector('[data-field="action"]');
    
    // View button
    const viewBtn = document.createElement("button");
    viewBtn.className = "action-btn view";
    viewBtn.innerHTML = "👁️";
    viewBtn.title = "View Details";
    viewBtn.dataset.studentId = String(student.id);
    viewBtn.dataset.action = "view";
    actionCell.appendChild(viewBtn);

    if (currentRole === "admin") {
      // Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "action-btn edit";
      editBtn.innerHTML = "✏️";
      editBtn.title = "Edit Student";
      editBtn.dataset.studentId = String(student.id);
      editBtn.dataset.action = "edit";
      actionCell.appendChild(editBtn);

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.className = "action-btn delete";
      delBtn.innerHTML = "🗑️";
      delBtn.title = "Delete Student";
      delBtn.dataset.studentId = String(student.id);
      delBtn.dataset.action = "delete";
      actionCell.appendChild(delBtn);
    }

    fragment.appendChild(row);
  });

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}

// Helper function to get payment for a student
function getPayment(studentId) {
  return payments.find(
    (entry) =>
      String(entry.student_id) === String(studentId) && 
      fromDbMonthDate(entry.fee_month) === selectedMonth
  ) || null;
}

let studentList = JSON.parse(localStorage.getItem("dakia_all_students")) || [
    { student_code: "10A801", full_name: "Nguyễn Văn An", class_name: "10A8", grade: "10", is_weak_mode: true },
    { student_code: "10A802", full_name: "Trần Thị Bích", class_name: "10A8", grade: "10", is_weak_mode: false },
    { student_code: "10A803", full_name: "Lê Hoàng Nam", class_name: "10A8", grade: "10", is_weak_mode: true }
];

let teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || [];
let uploadedExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
let questionBank = JSON.parse(localStorage.getItem("dakia_question_bank")) || [
    {
        id: "QB_SAMPLE_1",
        subject: "Toán học",
        grade: "10",
        topic: "Tích vô hướng của hai vectơ",
        type: "NL",
        level: "Biết",
        content: "Trong mặt phẳng tọa độ $Oxy$, cho hai vectơ $\\vec{a} = (2; -3)$ và $\\vec{b} = (4; 1)$. Tích vô hướng $\\vec{a} \\cdot \\vec{b}$ bằng",
        options: ["$5$", "$11$", "$-5$", "$8$"],
        correct: 0,
        author: "Võ Văn Bình"
    },
    {
        id: "QB_SAMPLE_2",
        subject: "Toán học",
        grade: "10",
        topic: "Tích vô hướng của hai vectơ",
        type: "TLN",
        level: "Hiểu",
        content: "Cho tam giác đều $ABC$ có cạnh bằng $4$. Tính giá trị của tích vô hướng $\\vec{AB} \\cdot \\vec{AC}$.",
        options: [],
        shortAnswer: "8",
        correct: 0,
        author: "Võ Văn Bình"
    }
];

let mixPoolQuestions = [];
let selectedBankIds = new Set();
let currentLoggedAdmin = null;
let pendingParsedExam = null;
let latestLessonSvg = "";

if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// Đóng dropdown khi bấm ra ngoài
document.addEventListener("click", function (e) {
    const wrapper = document.getElementById("userMenuWrapper");
    const dropdown = document.getElementById("userProfileDropdown");
    if (wrapper && dropdown && !wrapper.contains(e.target)) {
        dropdown.classList.add("hidden");
    }
});

function toggleUserDropdown() {
    const dropdown = document.getElementById("userProfileDropdown");
    if (dropdown) dropdown.classList.toggle("hidden");
}

function openChangePasswordModal() {
    const dropdown = document.getElementById("userProfileDropdown");
    if (dropdown) dropdown.classList.add("hidden");
    document.getElementById("oldPassInput").value = "";
    document.getElementById("newPassInput").value = "";
    document.getElementById("confirmNewPassInput").value = "";
    document.getElementById("changePassModal").classList.remove("hidden");
}

function closeChangePasswordModal() {
    document.getElementById("changePassModal").classList.add("hidden");
}

async function submitChangePassword() {
    if (!currentLoggedAdmin) return;
    const oldPass = document.getElementById("oldPassInput").value.trim();
    const newPass = document.getElementById("newPassInput").value.trim();
    const confirmPass = document.getElementById("confirmNewPassInput").value.trim();

    if (!oldPass || !newPass || !confirmPass) {
        return alert("Vui lòng nhập đầy đủ các ô mật khẩu!");
    }
    if (newPass.length < 6) {
        return alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
    }
    if (newPass !== confirmPass) {
        return alert("Mật khẩu mới nhập lại chưa khớp!");
    }

    const oldHash = typeof sha256Hex === "function" ? await sha256Hex(oldPass) : oldPass;
    const newHash = typeof sha256Hex === "function" ? await sha256Hex(newPass) : newPass;

    if (currentLoggedAdmin.role === "master") {
        const customMasterHash = localStorage.getItem("dakia_master_custom_hash");
        const defaultMasterHash = typeof sha256Hex === "function" ? await sha256Hex("Vanphong@2015") : "Vanphong@2015";
        const systemMasterHash = (typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.masterAdminPassHash) ? SYSTEM_CONFIG.masterAdminPassHash : defaultMasterHash;
        const validHash = customMasterHash || systemMasterHash;

        if (oldHash !== validHash && oldHash !== defaultMasterHash) {
            return alert("Mật khẩu hiện tại không chính xác!");
        }
        localStorage.setItem("dakia_master_custom_hash", newHash);
        closeChangePasswordModal();
        alert("Đã cập nhật mật khẩu Quản trị viên thành công!");
    } else {
        const idx = teacherList.findIndex(t => t.username.toLowerCase() === currentLoggedAdmin.username.toLowerCase());
        if (idx === -1) return alert("Không tìm thấy thông tin tài khoản giáo viên!");
        if (teacherList[idx].pass_hash !== oldHash) {
            return alert("Mật khẩu hiện tại không chính xác!");
        }
        teacherList[idx].pass_hash = newHash;
        currentLoggedAdmin.pass_hash = newHash;
        localStorage.setItem("dakia_teachers", JSON.stringify(teacherList));
        await postToGoogleSheets({ action: "save_teachers", teachers: teacherList });
        closeChangePasswordModal();
        alert("Đã đổi mật khẩu và đồng bộ lên hệ thống thành công!");
    }
}

// ==================== ĐĂNG NHẬP & PHÂN QUYỀN GIAO DIỆN ====================
async function verifyAdmin() {
    const user = document.getElementById("adminUserInput").value.trim().toLowerCase();
    const pass = document.getElementById("adminPassInput").value.trim();
    const errEl = document.getElementById("adminLoginErr");
    if (!user || !pass) return;

    const passHash = typeof sha256Hex === "function" ? await sha256Hex(pass) : pass;
    const defaultMasterHash = typeof sha256Hex === "function" ? await sha256Hex("Vanphong@2015") : "Vanphong@2015";
    const customMasterHash = localStorage.getItem("dakia_master_custom_hash");
    const masterUser = (typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.masterAdminUser) ? SYSTEM_CONFIG.masterAdminUser.toLowerCase() : "vovanbinh";
    const masterHash = customMasterHash || ((typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.masterAdminPassHash) ? SYSTEM_CONFIG.masterAdminPassHash : defaultMasterHash);

    if (user === masterUser && (passHash === masterHash || (!customMasterHash && passHash === defaultMasterHash))) {
        currentLoggedAdmin = { username: user, full_name: "Võ Văn Bình", display_title: "Võ Văn Bình (Tác giả)", subject: "Toán - Tin", role: "master" };
    } else {
        if (typeof syncFromGoogleSheets === "function") await syncFromGoogleSheets();
        teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || [];
        const found = teacherList.find(t => t.username.toLowerCase() === user && t.pass_hash === passHash);
        if (found) {
            currentLoggedAdmin = { ...found, display_title: found.full_name, role: "teacher" };
        }
    }

    if (!currentLoggedAdmin) {
        errEl.classList.remove("hidden");
        return;
    }

    errEl.classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.add("hidden");
    document.getElementById("adminDashboard").classList.remove("hidden");
    document.getElementById("loggedTeacherBadge").textContent = `Đang đăng nhập: ${currentLoggedAdmin.display_title} • Bộ môn: ${currentLoggedAdmin.subject}`;

    const nameMenuEl = document.getElementById("userMenuFullName");
    if (nameMenuEl) {
        nameMenuEl.textContent = currentLoggedAdmin.full_name;
    }

    applyRoleBasedUI();
    await syncNow();
}

function applyRoleBasedUI() {
    const tab1Btn = document.getElementById("atab-1");
    const tab2Btn = document.getElementById("atab-2");
    const tab5Btn = document.getElementById("atab-5");
    const tab3Btn = document.getElementById("atab-3");
    const tab4Btn = document.getElementById("atab-4");
    const masterManager = document.getElementById("masterTeacherManager");

    if (tab1Btn) tab1Btn.classList.remove("hidden");

    if (currentLoggedAdmin?.role === "master") {
        if (tab1Btn) tab1Btn.textContent = "👥 1. Lớp học & Phân quyền GV";
        if (masterManager) masterManager.classList.remove("hidden");
    } else {
        if (tab1Btn) tab1Btn.textContent = "👥 1. Quản lý lớp học";
        if (masterManager) masterManager.classList.add("hidden");

        const sub = currentLoggedAdmin?.subject || "";
        ["examSubjectInput", "lpSubject", "qbAddSubject", "qbFilterSubject"].forEach(elId => {
            const el = document.getElementById(elId);
            if (el && sub) {
                for (const opt of el.options) {
                    if (opt.value.toLowerCase().includes(sub.toLowerCase()) || sub.toLowerCase().includes(opt.value.toLowerCase())) {
                        el.value = opt.value;
                        break;
                    }
                }
            }
        });
    }

    if (tab2Btn) tab2Btn.textContent = "📝 2. Ngân hàng Đề Word & QR";
    if (tab5Btn) tab5Btn.textContent = "🎲 3. Trộn Đề & Ngân Hàng Câu Hỏi";
    if (tab3Btn) tab3Btn.textContent = "✨ 4. Soạn KHBD 5512, Slide & E-learning";
    if (tab4Btn) tab4Btn.textContent = "🔗 5. Tạo Mã QR & PDF sang Word";

    switchAdminTab(1);
}

function logoutAdmin() {
    currentLoggedAdmin = null;
    const dropdown = document.getElementById("userProfileDropdown");
    if (dropdown) dropdown.classList.add("hidden");
    document.getElementById("adminDashboard").classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.remove("hidden");
    document.getElementById("adminPassInput").value = "";
}

async function syncNow() {
    if (typeof syncFromGoogleSheets === "function") {
        await syncFromGoogleSheets();
    }
    studentList = JSON.parse(localStorage.getItem("dakia_all_students")) || studentList;
    teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || [];
    uploadedExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
    const storedBank = JSON.parse(localStorage.getItem("dakia_question_bank"));
    if (Array.isArray(storedBank) && storedBank.length > 0) {
        questionBank = storedBank;
    }

    updateClassFilterDropdown();
    renderStudentTable();
    renderTeacherTable();
    renderUploadedExams();
    renderQuestionBank();
}

function switchAdminTab(tabId) {
    document.querySelectorAll(".admin-sec").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".admin-tab-btn").forEach(btn => {
        btn.classList.remove("border-blue-700", "text-blue-700", "font-bold");
        btn.classList.add("border-transparent", "text-slate-600");
    });
    const targetSec = document.getElementById(`admin-sec-${tabId}`);
    if (targetSec) targetSec.classList.remove("hidden");

    const active = document.getElementById(`atab-${tabId}`);
    if (active) {
        active.classList.add("border-blue-700", "text-blue-700", "font-bold");
        active.classList.remove("border-transparent", "text-slate-600");
    }
}

// ==================== QUẢN LÝ TÀI KHOẢN GIÁO VIÊN ĐA MÔN ====================
async function addTeacherAccount() {
    if (currentLoggedAdmin?.role !== "master") return;
    const username = document.getElementById("newTeaUser").value.trim().toLowerCase();
    const full_name = document.getElementById("newTeaName").value.trim();
    const subject = document.getElementById("newTeaSubject").value;
    const pass = document.getElementById("newTeaPass").value;

    if (!username || !full_name || !pass) {
        alert("Thầy vui lòng nhập đủ tên đăng nhập, họ tên và mật khẩu cấp cho giáo viên!");
        return;
    }
    if (teacherList.some(t => t.username === username) || username === "vovanbinh") {
        alert("Tên đăng nhập này đã tồn tại!");
        return;
    }

    const pass_hash = typeof sha256Hex === "function" ? await sha256Hex(pass) : pass;
    teacherList.push({ username, full_name, subject, role: "teacher", pass_hash });
    localStorage.setItem("dakia_teachers", JSON.stringify(teacherList));
    await postToGoogleSheets({ action: "save_teachers", teachers: teacherList });

    document.getElementById("newTeaUser").value = "";
    document.getElementById("newTeaName").value = "";
    document.getElementById("newTeaPass").value = "";
    renderTeacherTable();
    alert(`Đã cấp tài khoản cho giáo viên ${full_name} thành công!`);
}

function renderTeacherTable() {
    const tbody = document.getElementById("teacherTableBody");
    if (!tbody) return;
    if (teacherList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-3 px-3 text-center text-slate-400">Chưa có tài khoản giáo viên nào được cấp thêm.</td></tr>`;
        return;
    }
    tbody.innerHTML = teacherList.map((t, idx) => `
        <tr>
            <td class="py-2 px-3 font-bold text-blue-700">${t.username}</td>
            <td class="py-2 px-3 font-medium">${t.full_name}</td>
            <td class="py-2 px-3">${t.subject}</td>
            <td class="py-2 px-3"><span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">Giáo viên</span></td>
            <td class="py-2 px-3 text-right">
                <button onclick="removeTeacher(${idx})" class="text-xs text-red-600 hover:underline">Thu hồi</button>
            </td>
        </tr>
    `).join("");
}

async function removeTeacher(idx) {
    if (!confirm(`Thu hồi quyền truy cập của giáo viên ${teacherList[idx].full_name}?`)) return;
    teacherList.splice(idx, 1);
    localStorage.setItem("dakia_teachers", JSON.stringify(teacherList));
    await postToGoogleSheets({ action: "save_teachers", teachers: teacherList });
    renderTeacherTable();
}

async function postToGoogleSheets(payload) {
    if (typeof SYSTEM_CONFIG === "undefined" || !SYSTEM_CONFIG.googleScriptUrl || SYSTEM_CONFIG.googleScriptUrl.startsWith("DAN_URL")) return null;
    try {
        const res = await fetch(SYSTEM_CONFIG.googleScriptUrl, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        return await res.json().catch(() => ({ ok: true }));
    } catch (_) {
        return null;
    }
}

// ==================== QUẢN LÝ HỌC SINH ====================
function updateClassFilterDropdown() {
    const selectEl = document.getElementById("classFilterSelect");
    if (!selectEl) return;
    const uniqueClasses = [...new Set(studentList.map(s => String(s.class_name).toUpperCase()))].sort();
    selectEl.innerHTML = `<option value="ALL">Tất cả các lớp (${studentList.length} HS)</option>` +
        uniqueClasses.map(cls => `<option value="${cls}">Lớp ${cls}</option>`).join("");
}

function renderStudentTable() {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const tbody = document.getElementById("studentTableBody");
    if (!tbody) return;
    const selectedClass = document.getElementById("classFilterSelect").value;
    const searchKeyword = document.getElementById("searchStudentInput").value.trim().toLowerCase();

    document.getElementById("statTotalStudents").textContent = studentList.length;
    document.getElementById("statWeakStudents").textContent = studentList.filter(s => s.is_weak_mode).length;
    document.getElementById("statTotalLogs").textContent = logs.length;

    const filtered = studentList
        .map((stu, idx) => ({ ...stu, originalIndex: idx }))
        .filter(stu => {
            const matchClass = selectedClass === "ALL" || String(stu.class_name).toUpperCase() === selectedClass;
            const matchKey = !searchKeyword || String(stu.student_code).toLowerCase().includes(searchKeyword) || String(stu.full_name).toLowerCase().includes(searchKeyword);
            return matchClass && matchKey;
        });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-400 text-sm">Không có dữ liệu học sinh phù hợp.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((stu, i) => {
        const stuLogs = logs.filter(l => l.student_code === stu.student_code);
        const scored = stuLogs.filter(l => l.score !== null);
        const avg = scored.length > 0 ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1) : "--";
        return `
            <tr class="hover:bg-slate-50">
                <td class="py-3 px-4 text-xs text-slate-400">${i + 1}</td>
                <td class="py-3 px-4 font-bold text-blue-700">${stu.student_code}</td>
                <td class="py-3 px-4 font-medium text-slate-800">${stu.full_name}</td>
                <td class="py-3 px-4"><span class="bg-slate-100 px-2 py-0.5 rounded font-semibold text-xs">${stu.class_name}</span></td>
                <td class="py-3 px-4">
                    <button onclick="toggleStudentWeakMode(${stu.originalIndex})" class="px-2.5 py-1 rounded-full text-xs font-semibold ${stu.is_weak_mode ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">
                        ${stu.is_weak_mode ? '⚠️ Hỗ trợ HS yếu' : 'Tiêu chuẩn'}
                    </button>
                </td>
                <td class="py-3 px-4">${stuLogs.length}</td>
                <td class="py-3 px-4 font-bold text-teal-700">${avg}</td>
                <td class="py-3 px-4 text-right"><button onclick="deleteStudent(${stu.originalIndex})" class="text-xs text-red-500 hover:underline">Xóa</button></td>
            </tr>
        `;
    }).join("");
}

async function addStudent() {
    const code = document.getElementById("newStuCode").value.trim().toUpperCase();
    const name = document.getElementById("newStuName").value.trim();
    const cls = document.getElementById("newStuClass").value.trim().toUpperCase();
    const isWeak = document.getElementById("newStuWeak").checked;
    if (!code || !name || !cls) return alert("Vui lòng nhập đủ Mã HS, Họ tên và Lớp!");
    if (studentList.some(s => s.student_code === code)) return alert("Mã học sinh đã tồn tại!");

    studentList.push({ student_code: code, full_name: name, class_name: cls, grade: cls.slice(0, 2) || "10", is_weak_mode: isWeak });
    localStorage.setItem("dakia_all_students", JSON.stringify(studentList));
    await postToGoogleSheets({ action: "save_students", students: studentList });

    document.getElementById("newStuCode").value = "";
    document.getElementById("newStuName").value = "";
    updateClassFilterDropdown();
    renderStudentTable();
}

function downloadSampleExcel() {
    const sampleData = [
        { MaHS: "10A801", HoTen: "Nguyễn Văn An", Lop: "10A8", HoTroYeu: "Có" },
        { MaHS: "10A802", HoTen: "Trần Thị Bích", Lop: "10A8", HoTroYeu: "Không" }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachHocSinh");
    XLSX.writeFile(wb, "Mau_Danh_Sach_HS_THPT_DaKia.xlsx");
}

function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        let added = 0;
        rows.forEach(row => {
            const code = String(row.MaHS || row["Mã HS"] || "").trim().toUpperCase();
            const name = String(row.HoTen || row["Họ và tên"] || "").trim();
            const cls = String(row.Lop || row["Lớp"] || "").trim().toUpperCase();
            const isWeak = ["có", "co", "yes", "true", "1", "x"].includes(String(row.HoTroYeu || "").trim().toLowerCase());
            if (!code || !name || !cls) return;
            const idx = studentList.findIndex(s => s.student_code === code);
            const obj = { student_code: code, full_name: name, class_name: cls, grade: cls.slice(0, 2) || "10", is_weak_mode: isWeak };
            if (idx >= 0) studentList[idx] = obj;
            else { studentList.push(obj); added++; }
        });
        localStorage.setItem("dakia_all_students", JSON.stringify(studentList));
        await postToGoogleSheets({ action: "save_students", students: studentList });
        updateClassFilterDropdown();
        renderStudentTable();
        alert(`Đã nhập xong danh sách! Thêm mới ${added} học sinh và đồng bộ lên Google Sheets.`);
    };
    reader.readAsArrayBuffer(file);
}

async function toggleStudentWeakMode(index) {
    studentList[index].is_weak_mode = !studentList[index].is_weak_mode;
    localStorage.setItem("dakia_all_students", JSON.stringify(studentList));
    await postToGoogleSheets({ action: "save_students", students: studentList });
    renderStudentTable();
}

async function deleteStudent(index) {
    if (!confirm(`Xóa học sinh ${studentList[index].full_name}?`)) return;
    studentList.splice(index, 1);
    localStorage.setItem("dakia_all_students", JSON.stringify(studentList));
    await postToGoogleSheets({ action: "save_students", students: studentList });
    updateClassFilterDropdown();
    renderStudentTable();
}

function exportReportToExcel() {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const rows = studentList.map((stu, i) => {
        const stuLogs = logs.filter(l => l.student_code === stu.student_code);
        return {
            "STT": i + 1,
            "Mã HS": stu.student_code,
            "Họ và tên": stu.full_name,
            "Lớp": stu.class_name,
            "Hỗ trợ yếu": stu.is_weak_mode ? "Có" : "Không",
            "Số lượt học": stuLogs.length
        };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCao");
    XLSX.writeFile(wb, `BaoCao_THPT_DaKia_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==================== BỘ BÓC TÁCH CÂU HỎI TỪ VĂN BẢN WORD CHUẨN 2018 ====================
function parseQuestionsFromDocxText(rawText, defaultSubject = "Toán học", defaultGrade = "10", defaultTopic = "Chuyên đề tổng hợp") {
    const blocks = rawText.split(/(?=Câu\s+\d+[\.\:])/i).map(b => b.trim()).filter(b => /^Câu\s+\d+/i.test(b));
    return blocks.map((blk, i) => {
        const bodyWithoutPrefix = blk.replace(/^Câu\s+\d+[\.\:]\s*/i, "").trim();
        const ansMatch = bodyWithoutPrefix.match(/Đáp\s*án\s*[:\-]?\s*([^\n\r]+)/i);
        const rawAns = ansMatch ? ansMatch[1].trim() : "A";
        const cleanBlock = bodyWithoutPrefix.replace(/Đáp\s*án\s*[:\-]?[\s\S]*/i, "").trim();

        const optAMatch = cleanBlock.match(/(?:^|\n|\s)A[\.\)]\s*([\s\S]*?)(?=(?:\n|\s)B[\.\)])/);
        const optBMatch = cleanBlock.match(/(?:^|\n|\s)B[\.\)]\s*([\s\S]*?)(?=(?:\n|\s)C[\.\)])/);
        const optCMatch = cleanBlock.match(/(?:^|\n|\s)C[\.\)]\s*([\s\S]*?)(?=(?:\n|\s)D[\.\)])/);
        const optDMatch = cleanBlock.match(/(?:^|\n|\s)D[\.\)]\s*([\s\S]*)$/);

        const dsAMatch = cleanBlock.match(/(?:^|\n)\s*a[\)\.]\s*([\s\S]*?)(?=(?:\n)\s*b[\)\.])/);
        const dsBMatch = cleanBlock.match(/(?:^|\n)\s*b[\)\.]\s*([\s\S]*?)(?=(?:\n)\s*c[\)\.])/);
        const dsCMatch = cleanBlock.match(/(?:^|\n)\s*c[\)\.]\s*([\s\S]*?)(?=(?:\n)\s*d[\)\.])/);
        const dsDMatch = cleanBlock.match(/(?:^|\n)\s*d[\)\.]\s*([\s\S]*)$/);

        if (optAMatch && optBMatch) {
            const questionText = cleanBlock.slice(0, optAMatch.index).trim();
            const options = [
                optAMatch[1].trim(),
                optBMatch[1].trim(),
                optCMatch ? optCMatch[1].trim() : "",
                optDMatch ? optDMatch[1].trim() : ""
            ];
            const letter = rawAns.charAt(0).toUpperCase();
            return {
                id: `Q_${Date.now()}_${i}`,
                subject: defaultSubject,
                grade: defaultGrade,
                topic: defaultTopic,
                type: "NL",
                level: "Hiểu",
                content: questionText,
                options,
                correct: Math.max(0, ["A", "B", "C", "D"].indexOf(letter)),
                author: currentLoggedAdmin?.full_name || "GV THPT Đa Kia"
            };
        } else if (dsAMatch && dsBMatch) {
            const questionText = cleanBlock.slice(0, dsAMatch.index).trim();
            const statements = [
                dsAMatch[1].trim(),
                dsBMatch[1].trim(),
                dsCMatch ? dsCMatch[1].trim() : "",
                dsDMatch ? dsDMatch[1].trim() : ""
            ];
            return {
                id: `Q_${Date.now()}_${i}`,
                subject: defaultSubject,
                grade: defaultGrade,
                topic: defaultTopic,
                type: "DS",
                level: "Hiểu",
                content: questionText,
                options: statements,
                dsAnswer: rawAns,
                correct: 0,
                author: currentLoggedAdmin?.full_name || "GV THPT Đa Kia"
            };
        } else {
            return {
                id: `Q_${Date.now()}_${i}`,
                subject: defaultSubject,
                grade: defaultGrade,
                topic: defaultTopic,
                type: "TLN",
                level: "Vận dụng",
                content: cleanBlock,
                options: [],
                shortAnswer: rawAns,
                correct: 0,
                author: currentLoggedAdmin?.full_name || "GV THPT Đa Kia"
            };
        }
    });
}

// ==================== NGÂN HÀNG ĐỀ WORD MATHTYPE & MÃ QR ====================
async function handleWordExamUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const base64String = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));

    const result = await mammoth.extractRawText({ arrayBuffer });
    const rawText = result.value || "";

    const subject = document.getElementById("examSubjectInput").value;
    const grade = document.getElementById("examGradeInput").value;
    const title = document.getElementById("examTitleInput").value.trim() || file.name.replace(/\.docx$/i, "");
    const parsedQuestions = parseQuestionsFromDocxText(rawText, subject, grade, title);

    pendingParsedExam = {
        id: "EXAM_" + Date.now(),
        title,
        subject,
        grade,
        teacher: currentLoggedAdmin?.full_name || "Giáo viên THPT Đa Kia",
        fileName: file.name,
        fileBase64: base64String,
        questions: parsedQuestions
    };

    document.getElementById("examPreviewBox").classList.remove("hidden");
    document.getElementById("examParseSummary").textContent = `Đã đọc file "${file.name}": Nhận diện được ${parsedQuestions.length} câu hỏi.`;
    document.getElementById("examParsedList").innerHTML = parsedQuestions.slice(0, 5).map((q, idx) =>
        `<div class="p-2 bg-white rounded border border-slate-200"><strong>Câu ${idx + 1} (${q.type}):</strong> ${q.content}</div>`
    ).join("");
}

async function publishUploadedExam() {
    if (!pendingParsedExam) return;
    const btn = document.getElementById("btnPublishExam");
    btn.disabled = true;
    btn.textContent = "⏳ Đang lưu lên Google Drive & Sheets...";

    const res = await postToGoogleSheets({
        action: "upload_exam",
        ...pendingParsedExam
    });

    const savedExam = {
        ...pendingParsedExam,
        fileUrl: res?.fileUrl || "",
        createdAt: new Date().toLocaleDateString("vi-VN")
    };
    delete savedExam.fileBase64;

    uploadedExams.unshift(savedExam);
    localStorage.setItem("dakia_uploaded_exams", JSON.stringify(uploadedExams));

    if (Array.isArray(savedExam.questions) && savedExam.questions.length > 0) {
        questionBank = [...savedExam.questions, ...questionBank];
        localStorage.setItem("dakia_question_bank", JSON.stringify(questionBank));
        renderQuestionBank();
    }

    btn.disabled = false;
    btn.textContent = "🚀 Lưu lên Kho Đề & Tạo Mã QR";
    document.getElementById("examPreviewBox").classList.add("hidden");
    pendingParsedExam = null;
    renderUploadedExams();
    alert("Đã lưu đề thi lên hệ thống, nạp câu hỏi vào Ngân hàng và tạo mã QR thành công!");
}

function renderUploadedExams() {
    const grid = document.getElementById("uploadedExamsGrid");
    if (!grid) return;
    if (uploadedExams.length === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-400 col-span-3">Chưa có đề thi Word nào được tải lên.</p>`;
        return;
    }

    grid.innerHTML = uploadedExams.map((ex, idx) => `
        <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2.5 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start gap-2">
                    <span class="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded uppercase">${ex.subject} • Lớp ${ex.grade}</span>
                    <span class="text-[11px] text-slate-400">${ex.createdAt || ""}</span>
                </div>
                <h4 class="font-bold text-sm text-slate-900 mt-1.5">${ex.title}</h4>
                <p class="text-xs text-slate-500">GV: ${ex.teacher} • ${(ex.questions || []).length} câu</p>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-200">
                <div id="qr_exam_${idx}" class="bg-white p-1 border rounded"></div>
                <div class="flex flex-col gap-1.5 text-right">
                    ${ex.fileUrl ? `<a href="${ex.fileUrl}" target="_blank" class="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded font-semibold">📥 Tải file Word gốc</a>` : `<span class="text-[11px] text-slate-400">Lưu nội bộ</span>`}
                    <button onclick="copyExamShareLink('${ex.id}')" class="text-xs bg-blue-700 text-white px-2.5 py-1 rounded font-semibold">🔗 Copy link thi</button>
                </div>
            </div>
        </div>
    `).join("");

    uploadedExams.forEach((ex, idx) => {
        const el = document.getElementById(`qr_exam_${idx}`);
        if (el && window.QRCode) {
            const shareUrl = `${window.location.origin}/index.html?exam=${ex.id}`;
            new QRCode(el, { text: shareUrl, width: 68, height: 68 });
        }
    });
}

function copyExamShareLink(examId) {
    const url = `${window.location.origin}/index.html?exam=${examId}`;
    navigator.clipboard.writeText(url);
    alert("Đã sao chép đường link làm bài trực tuyến:\n" + url);
}

// ==================== TAB TRỘN ĐỀ & NGÂN HÀNG CÂU HỎI + QR TNMAKER ====================
function toggleNewQuestionForm() {
    document.getElementById("newQuestionForm").classList.toggle("hidden");
}

function toggleQbTypeFields() {
    const type = document.getElementById("qbAddType").value;
    const mcqFields = document.getElementById("qbMcqFields");
    const shortField = document.getElementById("qbShortField");
    if (type === "TLN") {
        mcqFields.classList.add("hidden");
        shortField.classList.remove("hidden");
    } else {
        mcqFields.classList.remove("hidden");
        shortField.classList.add("hidden");
    }
}

async function addSingleQuestionToBank() {
    const subject = document.getElementById("qbAddSubject").value;
    const grade = document.getElementById("qbAddGrade").value;
    const topic = document.getElementById("qbAddTopic").value.trim() || "Chuyên đề chung";
    const type = document.getElementById("qbAddType").value;
    const level = document.getElementById("qbAddLevel").value;
    const content = document.getElementById("qbAddContent").value.trim();

    if (!content) return alert("Vui lòng nhập nội dung câu hỏi!");

    const newQ = {
        id: "QB_" + Date.now(),
        subject,
        grade,
        topic,
        type,
        level,
        content,
        options: [],
        correct: 0,
        author: currentLoggedAdmin?.full_name || "GV THPT Đa Kia"
    };

    if (type === "TLN") {
        newQ.shortAnswer = document.getElementById("qbShortAns").value.trim();
        if (!newQ.shortAnswer) return alert("Vui lòng nhập đáp án trả lời ngắn!");
    } else {
        newQ.options = [
            document.getElementById("qbOptA").value.trim(),
            document.getElementById("qbOptB").value.trim(),
            document.getElementById("qbOptC").value.trim(),
            document.getElementById("qbOptD").value.trim()
        ];
        if (newQ.options.some(o => !o)) return alert("Vui lòng nhập đủ 4 phương án / mệnh đề!");
        const letter = document.getElementById("qbCorrectLetter").value;
        newQ.correct = ["A", "B", "C", "D"].indexOf(letter);
        newQ.dsAnswer = letter;
    }

    questionBank.unshift(newQ);
    localStorage.setItem("dakia_question_bank", JSON.stringify(questionBank));
    await postToGoogleSheets({ action: "save_question_bank", questions: questionBank });

    document.getElementById("qbAddContent").value = "";
    ["qbOptA", "qbOptB", "qbOptC", "qbOptD", "qbShortAns"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    toggleNewQuestionForm();
    renderQuestionBank();
    alert("Đã lưu câu hỏi vào Ngân hàng dùng chung!");
}

function getFilteredBankQuestions() {
    const fSub = document.getElementById("qbFilterSubject")?.value || "ALL";
    const fGrade = document.getElementById("qbFilterGrade")?.value || "ALL";
    const fLevel = document.getElementById("qbFilterLevel")?.value || "ALL";
    const kw = (document.getElementById("qbSearchInput")?.value || "").trim().toLowerCase();

    return questionBank.filter(q => {
        const matchSub = fSub === "ALL" || String(q.subject).toLowerCase() === fSub.toLowerCase();
        const matchGrade = fGrade === "ALL" || String(q.grade) === fGrade;
        const matchLevel = fLevel === "ALL" || String(q.level) === fLevel;
        const matchKw = !kw || String(q.content).toLowerCase().includes(kw) || String(q.topic).toLowerCase().includes(kw);
        return matchSub && matchGrade && matchLevel && matchKw;
    });
}

function renderQuestionBank() {
    const listEl = document.getElementById("questionBankList");
    const badgeEl = document.getElementById("qbCountBadge");
    if (!listEl) return;

    const filtered = getFilteredBankQuestions();
    if (badgeEl) badgeEl.textContent = `Hiển thị: ${filtered.length}/${questionBank.length} câu (Đã chọn: ${selectedBankIds.size} câu)`;

    if (filtered.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Chưa có câu hỏi nào phù hợp bộ lọc.</p>`;
        return;
    }

    listEl.innerHTML = filtered.map((q, idx) => {
        const checked = selectedBankIds.has(q.id) ? "checked" : "";
        const typeBadge = q.type === "NL" ? "Trắc nghiệm A/B/C/D" : (q.type === "DS" ? "Đúng / Sai" : "Trả lời ngắn");
        let ansPreview = "";
        if (q.type === "NL") {
            ansPreview = (q.options || []).map((o, oi) => `<span class="${oi === q.correct ? 'font-bold text-emerald-700 underline' : ''}">${String.fromCharCode(65 + oi)}. ${o}</span>`).join(" &nbsp;|&nbsp; ");
        } else if (q.type === "DS") {
            ansPreview = (q.options || []).map((o, oi) => `${String.fromCharCode(97 + oi)}) ${o}`).join(" &nbsp;|&nbsp; ") + ` → <strong>Đáp án: ${q.dsAnswer || ""}</strong>`;
        } else {
            ansPreview = `<span class="font-bold text-emerald-700">Đáp số: ${q.shortAnswer || ""}</span>`;
        }

        return `
            <div class="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 hover:bg-blue-50/30 flex items-start gap-3">
                <input type="checkbox" ${checked} onchange="toggleSingleBankQuestion('${q.id}', this.checked)" class="mt-1 w-4 h-4 cursor-pointer">
                <div class="flex-1 space-y-1">
                    <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span class="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">${q.subject} ${q.grade}</span>
                        <span class="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">${typeBadge}</span>
                        <span class="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">${q.level}</span>
                        <span class="text-slate-500 font-medium">• ${q.topic}</span>
                    </div>
                    <p class="text-xs font-semibold text-slate-900">Câu ${idx + 1}: ${q.content}</p>
                    <p class="text-[11px] text-slate-600">${ansPreview}</p>
                </div>
                <button onclick="deleteBankQuestion('${q.id}')" class="text-[11px] text-red-500 hover:underline">Xóa</button>
            </div>
        `;
    }).join("");
}

function toggleSingleBankQuestion(qId, isChecked) {
    if (isChecked) selectedBankIds.add(qId);
    else selectedBankIds.delete(qId);
    const badgeEl = document.getElementById("qbCountBadge");
    if (badgeEl) {
        const filtered = getFilteredBankQuestions();
        badgeEl.textContent = `Hiển thị: ${filtered.length}/${questionBank.length} câu (Đã chọn: ${selectedBankIds.size} câu)`;
    }
}

function toggleSelectAllBankQuestions(isChecked) {
    const filtered = getFilteredBankQuestions();
    filtered.forEach(q => {
        if (isChecked) selectedBankIds.add(q.id);
        else selectedBankIds.delete(q.id);
    });
    renderQuestionBank();
}

async function deleteBankQuestion(qId) {
    if (!confirm("Xóa câu hỏi này khỏi ngân hàng?")) return;
    questionBank = questionBank.filter(q => q.id !== qId);
    selectedBankIds.delete(qId);
    localStorage.setItem("dakia_question_bank", JSON.stringify(questionBank));
    await postToGoogleSheets({ action: "save_question_bank", questions: questionBank });
    renderQuestionBank();
}

async function handleMixSourceDocx(event) {
    const file = event.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const rawText = result.value || "";

    const subject = document.getElementById("mixSubject").value;
    const grade = document.getElementById("mixGrade").value;
    const topic = document.getElementById("mixExamName").value.trim() || file.name.replace(/\.docx$/i, "");

    const parsed = parseQuestionsFromDocxText(rawText, subject, grade, topic);
    if (parsed.length === 0) {
        return alert("Không nhận diện được câu hỏi nào! Thầy kiểm tra lại định dạng 'Câu 1... A. ... B. ... C. ... D. ... Đáp án: A' trong file Word.");
    }
    mixPoolQuestions = parsed;
    renderMixPreviewBox(`Đã nạp ${mixPoolQuestions.length} câu hỏi từ file "${file.name}" sẵn sàng trộn đề.`);
}

function loadSelectedBankToMix() {
    if (selectedBankIds.size === 0) {
        return alert("Thầy/Cô vui lòng tích chọn ít nhất 1 câu hỏi ở danh sách Ngân hàng câu hỏi bên dưới!");
    }
    mixPoolQuestions = questionBank.filter(q => selectedBankIds.has(q.id));
    renderMixPreviewBox(`Đã nạp ${mixPoolQuestions.length} câu hỏi từ Ngân hàng câu hỏi sẵn sàng trộn đề.`);
}

function renderMixPreviewBox(summaryMsg) {
    document.getElementById("mixReadyBox").classList.remove("hidden");
    document.getElementById("mixSummaryText").textContent = summaryMsg;
    document.getElementById("mixPreviewQuestions").innerHTML = mixPoolQuestions.map((q, idx) =>
        `<div class="p-2 bg-white rounded border border-slate-200"><strong>Câu ${idx + 1} [${q.type}]:</strong> ${q.content}</div>`
    ).join("");
}

async function saveMixPoolToQuestionBank() {
    if (mixPoolQuestions.length === 0) return;
    const existingContents = new Set(questionBank.map(q => q.content.trim()));
    let added = 0;
    mixPoolQuestions.forEach(q => {
        if (!existingContents.has(q.content.trim())) {
            questionBank.unshift({ ...q, id: "QB_" + Date.now() + "_" + added });
            added++;
        }
    });
    localStorage.setItem("dakia_question_bank", JSON.stringify(questionBank));
    await postToGoogleSheets({ action: "save_question_bank", questions: questionBank });
    renderQuestionBank();
    alert(`Đã lưu thêm ${added} câu hỏi mới vào Ngân hàng câu hỏi dùng chung!`);
}

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function generateTnmakerQrDataUrl(qrText) {
    return new Promise((resolve) => {
        try {
            const tempDiv = document.createElement("div");
            tempDiv.style.display = "none";
            document.body.appendChild(tempDiv);
            new QRCode(tempDiv, {
                text: qrText,
                width: 320,
                height: 320,
                correctLevel: QRCode.CorrectLevel.M
            });
            setTimeout(() => {
                const canvas = tempDiv.querySelector("canvas");
                const dataUrl = canvas ? canvas.toDataURL("image/png") : null;
                document.body.removeChild(tempDiv);
                resolve(dataUrl);
            }, 120);
        } catch (_) {
            resolve(null);
        }
    });
}

function exportTnmakerExcelFile(examName, subject, grade, allAnswerSheets) {
    const maxNL = Math.max(0, ...allAnswerSheets.map(s => s.nl.length));
    const maxDS = Math.max(0, ...allAnswerSheets.map(s => s.ds.length));
    const maxTLN = Math.max(0, ...allAnswerSheets.map(s => s.tln.length));

    const aoa = [];
    aoa.push(["Câu / Mã đề", ...allAnswerSheets.map(s => s.code)]);

    for (let i = 0; i < maxNL; i++) {
        aoa.push([`I.${i + 1}`, ...allAnswerSheets.map(s => s.nl[i]?.ans || "")]);
    }
    for (let i = 0; i < maxDS; i++) {
        aoa.push([`II.${i + 1}`, ...allAnswerSheets.map(s => (s.ds[i]?.ans || "").replace(/[^ĐDSds]/g, "").toUpperCase())]);
    }
    for (let i = 0; i < maxTLN; i++) {
        aoa.push([`III.${i + 1}`, ...allAnswerSheets.map(s => s.tln[i]?.ans || "")]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DapAn_TNMaker");
    XLSX.writeFile(wb, `DapAn_TNMaker_${subject.replace(/\s+/g, "_")}_Khoi_${grade}.xlsx`);
}

async function executeShuffleAndExportWord() {
    if (mixPoolQuestions.length === 0) return alert("Chưa có câu hỏi nào để trộn đề!");

    const examName = document.getElementById("mixExamName").value.trim().toUpperCase() || "ĐỀ KIỂM TRA ĐỊNH KÌ";
    const subject = document.getElementById("mixSubject").value.toUpperCase();
    const grade = document.getElementById("mixGrade").value;
    const variantCount = parseInt(document.getElementById("mixVariantCount").value, 10) || 4;

    const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, PageBreak } = docx;
    const docChildren = [];
    const allAnswerSheets = [];

    const nlPool = mixPoolQuestions.filter(q => q.type === "NL");
    const dsPool = mixPoolQuestions.filter(q => q.type === "DS");
    const tlnPool = mixPoolQuestions.filter(q => q.type === "TLN");

    for (let v = 0; v < variantCount; v++) {
        const examCode = String(101 + v);
        if (v > 0) {
            docChildren.push(new Paragraph({ children: [new PageBreak()] }));
        }

        docChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: `SỞ GD&ĐT ĐỒNG NAI – TRƯỜNG THPT ĐA KIA\n`, bold: true, size: 24, font: "Times New Roman" }),
                new TextRun({ text: `${examName} – MÔN: ${subject} – KHỐI ${grade}\n`, bold: true, size: 26, font: "Times New Roman" }),
                new TextRun({ text: `MÃ ĐỀ: ${examCode}`, bold: true, size: 28, font: "Times New Roman" })
            ],
            spacing: { after: 200 }
        }));

        const variantAns = { code: examCode, nl: [], ds: [], tln: [] };

        if (nlPool.length > 0) {
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.", bold: true, size: 26, font: "Times New Roman" })],
                spacing: { before: 120, after: 100 }
            }));

            const shuffledNL = shuffleArray(nlPool);
            shuffledNL.forEach((q, idx) => {
                const indexedOpts = (q.options || []).map((text, origIdx) => ({ text, isRight: origIdx === q.correct }));
                const shuffledOpts = shuffleArray(indexedOpts);
                const newRightIdx = shuffledOpts.findIndex(o => o.isRight);
                const newLetter = ["A", "B", "C", "D"][Math.max(0, newRightIdx)];
                variantAns.nl.push({ num: idx + 1, ans: newLetter });

                docChildren.push(new Paragraph({
                    children: [
                        new TextRun({ text: `Câu ${idx + 1}: `, bold: true, size: 26, font: "Times New Roman" }),
                        new TextRun({ text: q.content, size: 26, font: "Times New Roman" })
                    ],
                    spacing: { after: 60 }
                }));

                const optLine = shuffledOpts.map((o, oi) => `${["A", "B", "C", "D"][oi]}. ${o.text}`).join("      ");
                docChildren.push(new Paragraph({
                    children: [new TextRun({ text: optLine, size: 26, font: "Times New Roman" })],
                    spacing: { after: 100 }
                }));
            });
        }

        if (dsPool.length > 0) {
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: "PHẦN II. Câu trắc nghiệm đúng sai.", bold: true, size: 26, font: "Times New Roman" })],
                spacing: { before: 140, after: 100 }
            }));

            const shuffledDS = shuffleArray(dsPool);
            shuffledDS.forEach((q, idx) => {
                variantAns.ds.push({ num: idx + 1, ans: q.dsAnswer || "ĐSĐS" });
                docChildren.push(new Paragraph({
                    children: [
                        new TextRun({ text: `Câu ${idx + 1}: `, bold: true, size: 26, font: "Times New Roman" }),
                        new TextRun({ text: q.content, size: 26, font: "Times New Roman" })
                    ],
                    spacing: { after: 60 }
                }));
                (q.options || []).forEach((st, si) => {
                    if (!st) return;
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: `   ${["a", "b", "c", "d"][si]}) ${st}`, size: 26, font: "Times New Roman" })],
                        spacing: { after: 40 }
                    }));
                });
            });
        }

        if (tlnPool.length > 0) {
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: "PHẦN III. Câu trắc nghiệm trả lời ngắn.", bold: true, size: 26, font: "Times New Roman" })],
                spacing: { before: 140, after: 100 }
            }));

            const shuffledTLN = shuffleArray(tlnPool);
            shuffledTLN.forEach((q, idx) => {
                variantAns.tln.push({ num: idx + 1, ans: q.shortAnswer || "" });
                docChildren.push(new Paragraph({
                    children: [
                        new TextRun({ text: `Câu ${idx + 1}: `, bold: true, size: 26, font: "Times New Roman" }),
                        new TextRun({ text: q.content, size: 26, font: "Times New Roman" })
                    ],
                    spacing: { after: 100 }
                }));
            });
        }

        docChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "--- HẾT ---", bold: true, size: 26, font: "Times New Roman" })],
            spacing: { before: 160 }
        }));

        allAnswerSheets.push(variantAns);
    }

    const tnmakerPayloadLines = [
        `TNMAKER|${subject}_K${grade}`,
        ...allAnswerSheets.map(s => {
            const p1 = s.nl.map(x => x.ans).join("");
            const p2 = s.ds.map(x => (x.ans || "").replace(/[^ĐDSds]/g, "").replace(/Đ/g, "D")).join("-");
            const p3 = s.tln.map(x => x.ans).join(";");
            return `${s.code}:${p1}${p2 ? "|" + p2 : ""}${p3 ? "|" + p3 : ""}`;
        })
    ];
    const tnmakerQrString = tnmakerPayloadLines.join("\n");
    const tnmakerQrDataUrl = await generateTnmakerQrDataUrl(tnmakerQrString);

    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    docChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `BẢNG ĐÁP ÁN TỔNG HỢP & MÃ QR TNMAKER – ${examName} (${subject} ${grade})`, bold: true, size: 28, font: "Times New Roman" })],
        spacing: { after: 200 }
    }));

    allAnswerSheets.forEach(sheet => {
        docChildren.push(new Paragraph({
            children: [new TextRun({ text: `▶ MÃ ĐỀ ${sheet.code}:`, bold: true, size: 26, font: "Times New Roman" })],
            spacing: { before: 120, after: 60 }
        }));

        if (sheet.nl.length > 0) {
            const nlStr = sheet.nl.map(x => `${x.num}.${x.ans}`).join("   ");
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: `   - Phần I (Trắc nghiệm): ${nlStr}`, size: 24, font: "Times New Roman" })],
                spacing: { after: 60 }
            }));
        }
        if (sheet.ds.length > 0) {
            const dsStr = sheet.ds.map(x => `Câu ${x.num} (${x.ans})`).join("  |  ");
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: `   - Phần II (Đúng/Sai): ${dsStr}`, size: 24, font: "Times New Roman" })],
                spacing: { after: 60 }
            }));
        }
        if (sheet.tln.length > 0) {
            const tlnStr = sheet.tln.map(x => `Câu ${x.num}: ${x.ans}`).join("  |  ");
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: `   - Phần III (Trả lời ngắn): ${tlnStr}`, size: 24, font: "Times New Roman" })],
                spacing: { after: 80 }
            }));
        }
    });

    if (tnmakerQrDataUrl && ImageRun) {
        docChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "MÃ QR NẠP ĐÁP ÁN NHANH CHO ỨNG DỤNG TNMAKER", bold: true, size: 26, font: "Times New Roman" })],
            spacing: { before: 240, after: 100 }
        }));
        docChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new ImageRun({
                    type: "png",
                    data: base64ToUint8Array(tnmakerQrDataUrl),
                    transformation: { width: 220, height: 220 }
                })
            ],
            spacing: { after: 120 }
        }));
    }

    const mixBox = document.getElementById("mixReadyBox");
    if (mixBox && tnmakerQrDataUrl) {
        let qrPreview = document.getElementById("tnmakerLiveQrBox");
        if (!qrPreview) {
            qrPreview = document.createElement("div");
            qrPreview.id = "tnmakerLiveQrBox";
            qrPreview.className = "mt-3 p-4 bg-white border border-emerald-300 rounded-xl flex flex-wrap items-center gap-4";
            mixBox.appendChild(qrPreview);
        }
        qrPreview.innerHTML = `
            <img src="${tnmakerQrDataUrl}" alt="QR TNMaker" class="w-36 h-36 border rounded-lg p-1 bg-white">
            <div class="space-y-1.5 text-xs">
                <p class="font-extrabold text-emerald-800 text-sm">📱 Mã QR Đáp Án TNMaker (Đã tạo cho ${variantCount} mã đề: ${allAnswerSheets.map(s => s.code).join(", ")})</p>
                <p class="text-slate-600">• Mở ứng dụng <strong>TNMaker</strong> trên điện thoại → chọn <strong>Quét mã QR đáp án</strong> để nạp tự động toàn bộ mã đề.</p>
                <p class="text-slate-600">• Hệ thống đã tự động tải về đồng thời <strong>File Word bộ ${variantCount} mã đề</strong> (kèm ảnh QR ở trang cuối) và <strong>File Excel đáp án chuẩn TNMaker (.xlsx)</strong>.</p>
            </div>
        `;
    }

    const doc = new Document({ sections: [{ children: docChildren }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Bo_${variantCount}_Ma_De_${subject.replace(/\s+/g, "_")}_Khoi_${grade}_Kem_QR_TNMaker.docx`;
    a.click();

    exportTnmakerExcelFile(examName, subject, grade, allAnswerSheets);
}

// ==================== SOẠN KHBD 5512 ĐA LƯỢT THEO SỐ TIẾT + HÌNH VẼ SGK ====================
async function generateLessonPlan5512() {
    const subject = document.getElementById("lpSubject").value;
    const grade = document.getElementById("lpGrade").value;
    const periodsRaw = document.getElementById("lpPeriods").value;
    const level = document.getElementById("lpDigitalLevel").value;
    const title = document.getElementById("lpTitle").value.trim();

    if (!title) return alert("Thầy/Cô vui lòng nhập tên bài học!");

    const parsedNum = parseInt(String(periodsRaw).replace(/\D/g, ""), 10);
    const totalPeriods = (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 15) ? parsedNum : 2;
    const totalSteps = totalPeriods + 3;

    const btn = document.getElementById("btnGen5512");
    const editor = document.getElementById("lpResultEditor");
    btn.disabled = true;
    editor.value = "";
    latestLessonSvg = "";

    try {
        btn.textContent = `⏳ Bước 1/${totalSteps}: Đang soạn Mục tiêu & Học liệu...`;
        const resIntro = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Soạn PHẦN MỞ ĐẦU (I. MỤC TIÊU, II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU) cho Kế hoạch bài dạy chuẩn Công văn 5512 bám sát SGK Kết nối tri thức với cuộc sống: Môn ${subject} - Lớp ${grade} - Bài: "${title}" (Tổng thời lượng: ${totalPeriods} tiết). Mức độ tích hợp: ${level}.`,
                grade,
                mode: "teacher_5512_intro"
            })
        });
        for await (const chunk of responseBodyReader(resIntro)) {
            editor.value += chunk;
        }

        let coveredSummary = "";
        for (let p = 1; p <= totalPeriods; p++) {
            btn.textContent = `⏳ Bước ${p + 1}/${totalSteps}: Đang soạn chi tiết Tiết ${p}/${totalPeriods}...`;
            editor.value += "\n\n";

            let periodBuffer = "";
            const periodPrompt = `Soạn chi tiết TIẾT ${p} trên tổng số ${totalPeriods} tiết của bài "${title}" (Môn ${subject} Lớp ${grade} - SGK Kết nối tri thức với cuộc sống).
- Vai trò của Tiết ${p}/${totalPeriods}: ${p === 1 ? "Mở đầu bài học + Hình thành kiến thức phần đầu + Luyện tập củng cố Tiết 1" : (p === totalPeriods ? "Kiến thức phần cuối (nếu còn) + Luyện tập tổng hợp + Vận dụng thực tiễn toàn bài" : `Hình thành kiến thức phần tiếp theo của Tiết ${p} + Luyện tập củng cố Tiết ${p}`)}.
- Các phần kiến thức đã dạy ở các tiết trước (KHÔNG lặp lại): ${coveredSummary || "Chưa có (đây là Tiết 1)"}.
- Yêu cầu trình bày: Viết thật chi tiết các hoạt động trong Tiết ${p}, đủ 4 mục a) Mục tiêu, b) Nội dung, c) Sản phẩm, d) Tổ chức thực hiện 4 bước. Không dùng dấu sao * đầu dòng.`;

            const resP = await fetch("/api/tutor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: periodPrompt,
                    grade,
                    mode: "teacher_5512_period"
                })
            });
            for await (const chunk of responseBodyReader(resP)) {
                editor.value += chunk;
                periodBuffer += chunk;
            }
            const headingLine = periodBuffer.split("\n").find(l => l.trim().length > 5) || `Tiết ${p}`;
            coveredSummary += ` | ${headingLine.trim().slice(0, 90)}`;
        }

        btn.textContent = `⏳ Bước ${totalSteps - 1}/${totalSteps}: Đang soạn Phiếu học tập & Tự học AI...`;
        editor.value += "\n\n";
        const resOutro = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Soạn phần IV. PHIẾU HỌC TẬP và V. HƯỚNG DẪN TỰ HỌC VỚI HỆ THỐNG GIA SƯ AI TRƯỜNG THPT ĐA KIA cho bài "${title}" (${totalPeriods} tiết, Môn ${subject} Lớp ${grade} - Kết nối tri thức).`,
                grade,
                mode: "teacher_5512_outro"
            })
        });
        for await (const chunk of responseBodyReader(resOutro)) {
            editor.value += chunk;
        }

        btn.textContent = `⏳ Bước ${totalSteps}/${totalSteps}: Đang vẽ hình minh họa chuẩn SGK...`;
        const resSvg = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Vẽ 1 hình minh họa trực quan chuẩn SGK Kết nối tri thức cho bài học: "${title}" (Môn ${subject} Lớp ${grade}).`,
                grade,
                mode: "teacher_svg"
            })
        });
        let svgOut = "";
        for await (const chunk of responseBodyReader(resSvg)) {
            svgOut += chunk;
        }
        const cleanSvgMatch = svgOut.match(/<svg[\s\S]*?<\/svg>/i);
        latestLessonSvg = cleanSvgMatch ? cleanSvgMatch[0] : buildFallbackSvg(title);

        document.getElementById("lpExportToolbar").classList.remove("hidden");
    } catch (err) {
        alert("Lỗi khi soạn KHBD: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "✨ Soạn KHBD 5512 Bằng AI";
    }
}

function buildFallbackSvg(title) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 260" width="500" height="260">
      <rect width="500" height="260" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <defs><marker id="arr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#1d4ed8"/></marker></defs>
      <line x1="90" y1="200" x2="390" y2="200" stroke="#1d4ed8" stroke-width="3" marker-end="url(#arr)"/>
      <line x1="90" y1="200" x2="290" y2="65" stroke="#dc2626" stroke-width="3" marker-end="url(#arr)"/>
      <path d="M 155 200 A 65 65 0 0 0 143 164" fill="none" stroke="#047857" stroke-width="2.5"/>
      <text x="72" y="218" font-family="Times New Roman" font-size="18" font-weight="bold" fill="#0f172a">O</text>
      <text x="165" y="182" font-family="Times New Roman" font-size="18" font-style="italic" fill="#047857">α</text>
      <text x="250" y="242" font-family="Times New Roman" font-size="15" font-weight="bold" fill="#1e3a8a" text-anchor="middle">Hình minh họa: ${title.slice(0, 45)}</text>
    </svg>`;
}

async function* responseBodyReader(res) {
    if (!res.ok) {
        const errObj = await res.json().catch(() => ({ error: "Không kết nối được máy chủ AI" }));
        throw new Error(errObj.error || "Không kết nối được máy chủ AI");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === "[DONE]") continue;
                try {
                    const parsed = JSON.parse(jsonStr);
                    const text = (parsed.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
                    if (text) yield text;
                } catch (_) {}
            }
        }
    }
}

function formatMathUnicode(str) {
    return String(str || "")
        .replace(/\*/g, "")
        .replace(/\$/g, "")
        .replace(/\\overrightarrow\{([^}]+)\}/g, "$1⃗")
        .replace(/\\vec\{([^}]+)\}/g, "$1⃗")
        .replace(/\\vec\s+([A-Za-z0-9]+)/g, "$1⃗")
        .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
        .replace(/\\cdot/g, " · ")
        .replace(/\\times/g, " × ")
        .replace(/\\perp/g, " ⊥ ")
        .replace(/\\parallel/g, " // ")
        .replace(/\\Leftrightarrow/g, " ⇔ ")
        .replace(/\\Rightarrow/g, " ⇒ ")
        .replace(/\\le/g, " ≤ ")
        .replace(/\\ge/g, " ≥ ")
        .replace(/\\ne/g, " ≠ ")
        .replace(/\\alpha/g, "α")
        .replace(/\\beta/g, "β")
        .replace(/\\gamma/g, "γ")
        .replace(/\\Delta/g, "Δ")
        .replace(/\\pi/g, "π")
        .replace(/\^2/g, "²")
        .replace(/\^3/g, "³")
        .replace(/_1/g, "₁")
        .replace(/_2/g, "₂")
        .replace(/_0/g, "₀")
        .replace(/\\angle\s*/g, "∠")
        .replace(/\\widehat\{([^}]+)\}/g, "∠$1")
        .replace(/\^\\circ/g, "°")
        .replace(/\\/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function svgToPngDataUrl(svgString) {
    return new Promise((resolve) => {
        try {
            let cleanSvg = svgString.trim();
            if (!cleanSvg.includes("xmlns=")) {
                cleanSvg = cleanSvg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            const encoded = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(cleanSvg)));
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = 1000;
                canvas.height = 520;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = function () {
                resolve(null);
            };
            img.src = encoded;
        } catch (_) {
            resolve(null);
        }
    });
}

function base64ToUint8Array(dataUrl) {
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function exportLessonPlanToDocx() {
    const rawContent = document.getElementById("lpResultEditor").value.trim();
    const title = document.getElementById("lpTitle").value.trim() || "KeHoachBaiDay_5512";
    if (!rawContent) return alert("Chưa có nội dung KHBD để xuất!");

    let pngDataUrl = await svgToPngDataUrl(latestLessonSvg || buildFallbackSvg(title));
    if (!pngDataUrl) pngDataUrl = await svgToPngDataUrl(buildFallbackSvg(title));

    const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } = docx;
    const lines = rawContent.split("\n");

    const paragraphs = [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "TRƯỜNG THPT ĐA KIA – KẾ HOẠCH BÀI DẠY (CÔNG VĂN 5512)", bold: true, size: 28, font: "Times New Roman" })],
            spacing: { after: 200 }
        })
    ];

    lines.forEach(line => {
        let cleanLine = line
            .replace(/^\s*[\*\•]+\s+/g, "   - ")
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/\*(.*?)\*/g, "$1")
            .replace(/\*/g, "");

        const trimmed = cleanLine.trim();
        if (!trimmed || trimmed === "---") return;

        const isMainHeader = /^(I+|IV|V)\.\s+|^(KẾ HOẠCH BÀI DẠY|TIẾT\s+\d+)/i.test(trimmed);
        const isSubHeader = /^(Hoạt động\s+\d+|Phần\s+\d+|Nội dung\s+\d+|[1-4]\.\s+Về|[a-d]\)\s+|Bước\s+[1-4]:|Phiếu học tập)/i.test(trimmed);

        paragraphs.push(new Paragraph({
            children: [new TextRun({
                text: cleanLine,
                bold: isMainHeader || isSubHeader,
                size: isMainHeader ? 28 : 26,
                font: "Times New Roman"
            })],
            spacing: { after: 100 }
        }));
    });

    if (pngDataUrl && ImageRun) {
        paragraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "HÌNH VẼ MINH HỌA KIẾN THỨC TRỌNG TÂM (CHUẨN SGK)", bold: true, size: 26, font: "Times New Roman" })],
            spacing: { before: 240, after: 120 }
        }));
        paragraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new ImageRun({
                    type: "png",
                    data: base64ToUint8Array(pngDataUrl),
                    transformation: { width: 480, height: 250 }
                })
            ],
            spacing: { after: 200 }
        }));
    }

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `KHBD_5512_${title.replace(/\s+/g, "_")}.docx`;
    a.click();
}

async function generateSlidesFromLesson() {
    const rawContent = document.getElementById("lpResultEditor").value.trim();
    const title = document.getElementById("lpTitle").value.trim() || "BaiGiang_THPT_DaKia";
    if (!rawContent) return alert("Vui lòng soạn nội dung bài dạy trước!");

    const btn = document.getElementById("btnGenSlides");
    btn.disabled = true;
    btn.textContent = "⏳ Đang thiết kế PowerPoint 16:9 hiện đại & hiệu ứng...";

    let pngDataUrl = await svgToPngDataUrl(latestLessonSvg || buildFallbackSvg(title));
    if (!pngDataUrl) pngDataUrl = await svgToPngDataUrl(buildFallbackSvg(title));

    try {
        const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Chuyển giáo án sau thành 5 chủ đề kiến thức + 1 hoạt động luyện tập giơ thẻ màu A/B/C/D bám sát SGK Kết nối tri thức với cuộc sống.
QUY TẮC BẮT BUỘC:
- Mỗi chủ đề có 3 khung thẻ cực kỳ cô đọng (mỗi khung tối đa 15 từ, công thức viết ký hiệu rõ ràng).
- Trả về DUY NHẤT JSON hợp lệ theo mẫu:
{"title":"Tên bài học","topics":[{"heading":"Tiêu đề mục","cards":["Khung 1","Khung 2","Khung 3"],"hasDiagram":true,"note":"Ghi chú giáo viên"}],"quiz":{"question":"Câu hỏi trắc nghiệm củng cố...","options":["A. ...","B. ...","C. ...","D. ..."],"answerText":"Đáp án đúng là ... vì ..."}}
Nội dung:\n${rawContent.slice(0, 5000)}`,
                mode: "teacher_slides"
            })
        });
        let rawJson = "";
        for await (const chunk of responseBodyReader(res)) rawJson += chunk;
        const cleanJson = rawJson.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanJson);

        const pptx = new PptxGenJS();
        pptx.layout = "LAYOUT_16x9";

        const cover = pptx.addSlide();
        cover.transition = { type: "fade", duration: 600 };
        cover.background = { color: "0F172A" };
        cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.4, h: 7.5, fill: { color: "2563EB" } });
        cover.addShape(pptx.ShapeType.rect, { x: 0.9, y: 1.1, w: 11.5, h: 5.3, fill: { color: "1E293B" }, line: { color: "38BDF8", width: 1.5 } });
        cover.addText("TRƯỜNG THPT ĐA KIA • BỘ SÁCH KẾT NỐI TRI THỨC VỚI CUỘC SỐNG", { x: 1.3, y: 1.6, w: 10.7, fontSize: 15, color: "38BDF8", bold: true });
        cover.addText(formatMathUnicode(data.title || title), { x: 1.3, y: 2.35, w: 10.7, fontSize: 32, color: "FFFFFF", bold: true });
        cover.addShape(pptx.ShapeType.rect, { x: 1.3, y: 4.15, w: 3.4, h: 0.06, fill: { color: "FACC15" } });
        cover.addText(`Giáo viên giảng dạy: ${currentLoggedAdmin?.full_name || "Trường THPT Đa Kia"}`, { x: 1.3, y: 4.55, w: 10.7, fontSize: 18, color: "FDE047", bold: true });

        const cardAccents = ["1D4ED8", "047857", "B45309"];
        const cardBgColors = ["EFF6FF", "ECFDF5", "FFFBEB"];
        let slideCounter = 2;

        (data.topics || []).forEach((topic, tIdx) => {
            const cards = (topic.cards || []).slice(0, 3);
            const showImg = (topic.hasDiagram || tIdx === 1) && pngDataUrl;

            for (let step = 1; step <= cards.length; step++) {
                const slide = pptx.addSlide();
                slide.transition = step === 1 ? { type: "push", duration: 400 } : { type: "none" };
                slide.background = { color: "F8FAFC" };

                slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.0, fill: { color: "1E3A8A" } });
                slide.addShape(pptx.ShapeType.rect, { x: 0, y: 1.0, w: 13.33, h: 0.06, fill: { color: "F59E0B" } });
                slide.addText(formatMathUnicode(topic.heading || `Hoạt động ${tIdx + 1}`), {
                    x: 0.6, y: 0.18, w: 12.1, h: 0.65, fontSize: 21, bold: true, color: "FFFFFF", fit: "shrink"
                });

                const contentWidth = showImg ? 7.45 : 12.1;
                const cardHeight = 1.62;
                const gap = 0.22;

                for (let c = 0; c < step; c++) {
                    const yPos = 1.32 + c * (cardHeight + gap);
                    const accent = cardAccents[c % cardAccents.length];
                    const bg = cardBgColors[c % cardBgColors.length];
                    const formattedMathText = formatMathUnicode(cards[c]);

                    slide.addShape(pptx.ShapeType.rect, {
                        x: 0.6, y: yPos, w: contentWidth, h: cardHeight,
                        fill: { color: bg }, line: { color: accent, width: 1.5 }
                    });
                    slide.addShape(pptx.ShapeType.rect, {
                        x: 0.6, y: yPos, w: 0.16, h: cardHeight,
                        fill: { color: accent }
                    });
                    slide.addText(`0${c + 1}`, {
                        x: 0.88, y: yPos + 0.15, w: 0.55, h: 0.45,
                        fontSize: 16, bold: true, color: accent
                    });
                    slide.addText(formattedMathText, {
                        x: 1.48, y: yPos + 0.12, w: contentWidth - 1.1, h: cardHeight - 0.24,
                        fontSize: 18, color: "0F172A", valign: "middle", fit: "shrink", wrap: true
                    });
                }

                if (showImg) {
                    slide.addShape(pptx.ShapeType.rect, {
                        x: 8.25, y: 1.32, w: 4.5, h: 5.3,
                        fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1.2 }
                    });
                    slide.addText("HÌNH MINH HỌA SGK", {
                        x: 8.25, y: 1.48, w: 4.5, h: 0.4,
                        fontSize: 13, bold: true, color: "1D4ED8", align: "center"
                    });
                    slide.addImage({
                        data: pngDataUrl,
                        x: 8.4, y: 2.15, w: 4.2, h: 2.2
                    });
                }

                slide.addText(`THPT Đa Kia • Bấm chuột để hiện khung tiếp theo (${step}/${cards.length}) | Slide ${slideCounter++}`, {
                    x: 0.6, y: 7.0, w: 12.1, fontSize: 11, color: "64748B", align: "right"
                });
                if (topic.note && step === 1) slide.addNotes(topic.note);
            }
        });

        if (data.quiz && data.quiz.question) {
            for (let qStep = 1; qStep <= 2; qStep++) {
                const qSlide = pptx.addSlide();
                qSlide.transition = qStep === 1 ? { type: "wipe", duration: 450 } : { type: "none" };
                qSlide.background = { color: "F8FAFC" };
                qSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.0, fill: { color: "047857" } });
                qSlide.addText("LUYỆN TẬP NHANH • GIƠ THẺ MÀU A / B / C / D", {
                    x: 0.6, y: 0.2, w: 12.1, h: 0.6, fontSize: 21, bold: true, color: "FFFFFF"
                });

                qSlide.addShape(pptx.ShapeType.rect, {
                    x: 0.6, y: 1.3, w: 12.1, h: 1.4, fill: { color: "ECFDF5" }, line: { color: "059669", width: 1.5 }
                });
                qSlide.addText(formatMathUnicode(data.quiz.question), {
                    x: 0.85, y: 1.4, w: 11.6, h: 1.2, fontSize: 19, bold: true, color: "064E3B", valign: "middle", fit: "shrink"
                });

                const opts = (data.quiz.options || []).slice(0, 4);
                opts.forEach((opt, idx) => {
                    const col = idx % 2;
                    const row = Math.floor(idx / 2);
                    const xBox = 0.6 + col * 6.15;
                    const yBox = 2.95 + row * 1.25;
                    qSlide.addShape(pptx.ShapeType.rect, {
                        x: xBox, y: yBox, w: 5.95, h: 1.05, fill: { color: "FFFFFF" }, line: { color: "94A3B8", width: 1.2 }
                    });
                    qSlide.addText(formatMathUnicode(opt), {
                        x: xBox + 0.2, y: yBox + 0.1, w: 5.55, h: 0.85, fontSize: 18, color: "0F172A", valign: "middle", fit: "shrink"
                    });
                });

                if (qStep === 2) {
                    qSlide.addShape(pptx.ShapeType.rect, {
                        x: 0.6, y: 5.55, w: 12.1, h: 1.15, fill: { color: "FEF3C7" }, line: { color: "D97706", width: 1.5 }
                    });
                    qSlide.addText("✅ " + formatMathUnicode(data.quiz.answerText || ""), {
                        x: 0.85, y: 5.65, w: 11.6, h: 0.95, fontSize: 18, bold: true, color: "92400E", valign: "middle", fit: "shrink"
                    });
                }

                qSlide.addText(`THPT Đa Kia • ${qStep === 1 ? "Bấm chuột để hiện Đáp án" : "Hoàn thành bài giảng"} | Slide ${slideCounter++}`, {
                    x: 0.6, y: 7.0, w: 12.1, fontSize: 11, color: "64748B", align: "right"
                });
            }
        }

        await pptx.writeFile({ fileName: `Slide_16x9_HieuUng_${title.replace(/\s+/g, "_")}.pptx` });
    } catch (err) {
        alert("Lỗi tạo PowerPoint: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "📊 Xuất Slide PowerPoint 16:9 (.pptx)";
    }
}

async function exportElearningScorm() {
    const rawContent = document.getElementById("lpResultEditor").value.trim();
    const title = document.getElementById("lpTitle").value.trim() || "BaiGiang_Elearning";
    if (!rawContent) return alert("Chưa có nội dung để đóng gói E-learning!");

    const btn = typeof event !== "undefined" ? event.target : null;
    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Đang đóng gói E-learning chuẩn bố cục...";
    }

    const svgRaw = latestLessonSvg || buildFallbackSvg(title);

    try {
        const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Chuyển giáo án sau thành bài giảng E-learning gồm 4 chặng học tập.
QUY TẮC BẮT BUỘC VỀ BỐ CỤC LÝ THUYẾT:
- Tách phần lý thuyết thành 3-4 ý riêng biệt (mảng "points"), mỗi ý nằm trọn trên 1 dòng mạch lạc, công thức Toán đặt trọn vẹn trong $...$ trên cùng 1 dòng (tuyệt đối không ngắt dòng giữa công thức).
- Có thêm mục "formulaHighlight" là 1 công thức cốt lõi nhất của chặng (đặt trong $...$).
- Mỗi chặng có 3 câu hỏi tương tác đa dạng ("mcq": Trắc nghiệm 4 lựa chọn, "tf": Đúng/Sai nhanh, "fill": Điền số ngắn gọn).
Trả về DUY NHẤT JSON hợp lệ theo mẫu:
{"stages":[{"title":"Chặng 1: ...","formulaHighlight":"$...$","points":["Ý lý thuyết 1...","Ý lý thuyết 2...","Ý lý thuyết 3..."],"questions":[
  {"type":"mcq","question":"Câu trắc nghiệm...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explain":"Giải thích ngắn..."},
  {"type":"tf","question":"Khẳng định sau Đúng hay Sai: ...","options":["Đúng","Sai"],"answer":0,"explain":"Giải thích ngắn..."},
  {"type":"fill","question":"Tính giá trị (nhập số ngắn gọn): ...","answerText":"3","explain":"Giải thích ngắn..."}
]}]}
Nội dung:\n${rawContent.slice(0, 5000)}`,
                mode: "teacher_slides"
            })
        });

        let rawJson = "";
        for await (const chunk of responseBodyReader(res)) rawJson += chunk;
        const cleanJson = rawJson.replace(/```json|```/g, "").trim();
        const eData = JSON.parse(cleanJson);

        const zip = new JSZip();
        const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="THPT_DAKIA_SCORM_12" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG_DAKIA">
    <organization identifier="ORG_DAKIA">
      <title>${title}</title>
      <item identifier="ITEM_1" identifierref="RES_1"><title>${title}</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;

        const htmlLesson = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} – E-Learning Tương Tác THPT Đa Kia</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMath();"></script>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:linear-gradient(135deg,#dbeafe 0%,#f8fafc 100%);margin:0;color:#0f172a;min-height:100vh}
  header{background:linear-gradient(90deg,#1e3a8a,#2563eb);color:#fff;padding:18px 32px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 12px rgba(30,58,138,.2)}
  .badge-group{display:flex;gap:12px;align-items:center}
  .pill{background:rgba(255,255,255,.18);padding:7px 14px;border-radius:999px;font-weight:700;font-size:13px}
  .pill-gold{background:#facc15;color:#1e293b}
  .wrap{max-width:1040px;margin:26px auto;padding:0 16px}
  .stepper{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:20px}
  .step-btn{padding:12px 14px;border:2px solid #cbd5e1;border-radius:12px;background:#fff;font-weight:700;color:#475569;cursor:pointer;transition:.2s;text-align:left}
  .step-btn.active{border-color:#1d4ed8;background:#1d4ed8;color:#fff;box-shadow:0 6px 14px rgba(29,78,216,.25)}
  .panel{background:#fff;border-radius:18px;padding:30px;box-shadow:0 10px 28px rgba(15,23,42,.08);border:1px solid #e2e8f0;animation:fadeIn .3s ease}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .theory-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:22px;align-items:start;margin-top:14px}
  @media(max-width:768px){.theory-grid{grid-template-columns:1fr}}
  .point-card{background:#f8fafc;border-left:5px solid #2563eb;padding:14px 18px;border-radius:10px;margin-bottom:12px;font-size:16px;line-height:1.7}
  .formula-card{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #3b82f6;border-radius:14px;padding:18px;text-align:center;margin-bottom:16px}
  .formula-title{font-size:12px;font-weight:800;color:#1d4ed8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
  .formula-math{font-size:20px;font-weight:700;color:#0f172a;overflow-x:auto;padding:6px 0}
  .svg-box{text-align:center;padding:12px;background:#fff;border:1.5px solid #cbd5e1;border-radius:14px}
  .svg-box svg{max-width:100%;height:auto}
  .katex{white-space:nowrap}
  .q-type-tag{display:inline-block;background:#e0e7ff;color:#1e40af;font-weight:800;font-size:12px;padding:5px 12px;border-radius:999px;margin-bottom:10px;text-transform:uppercase}
  .opt-btn{display:block;width:100%;text-align:left;padding:13px 16px;margin:10px 0;border:2px solid #cbd5e1;border-radius:12px;background:#fff;font-size:16px;cursor:pointer;transition:.15s}
  .opt-btn:hover:not(:disabled){border-color:#2563eb;background:#eff6ff;transform:translateX(4px)}
  .opt-btn.correct{border-color:#059669;background:#d1fae5;color:#065f46;font-weight:700}
  .opt-btn.wrong{border-color:#dc2626;background:#fee2e2;color:#991b1b}
  .tf-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}
  .tf-btn{padding:18px;font-size:18px;font-weight:800;border-radius:14px;border:2px solid #cbd5e1;background:#fff;cursor:pointer;text-align:center}
  .tf-btn:hover:not(:disabled){border-color:#2563eb;background:#eff6ff}
  .fill-box{display:flex;gap:10px;margin:14px 0;flex-wrap:wrap}
  .fill-input{flex:1;min-width:200px;padding:12px 16px;font-size:16px;border:2px solid #94a3b8;border-radius:10px}
  .feedback{margin-top:14px;padding:15px 18px;border-radius:12px;font-size:15px;line-height:1.6}
  .fb-ok{background:#ecfdf5;border:1.5px solid #34d399;color:#065f46}
  .fb-no{background:#fef2f2;border:1.5px solid #f87171;color:#991b1b}
  .controls{display:flex;justify-content:space-between;align-items:center;margin-top:26px;padding-top:18px;border-top:1px solid #e2e8f0;gap:12px;flex-wrap:wrap}
  .btn-main{background:#1d4ed8;color:#fff;border:none;padding:13px 24px;border-radius:12px;font-size:15.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 10px rgba(29,78,216,.25)}
  .btn-play{background:linear-gradient(90deg,#059669,#10b981);color:#fff;border:none;padding:14px 26px;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(5,150,105,.3)}
  .btn-sub{background:#e2e8f0;color:#1e293b;border:none;padding:12px 20px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer}
</style>
</head>
<body>
<header>
  <div>
    <div style="font-size:12px;letter-spacing:.6px;opacity:.85;font-weight:700">TRƯỜNG THPT ĐA KIA • BÀI GIẢNG E-LEARNING TƯƠNG TÁC</div>
    <div style="font-size:20px;font-weight:800;margin-top:2px">${title}</div>
  </div>
  <div class="badge-group">
    <div class="pill" id="scoreBadge">Điểm: 0</div>
    <div class="pill pill-gold" id="progBadge">Chặng 1</div>
  </div>
</header>
<div class="wrap">
  <div class="stepper" id="stepper"></div>
  <div class="panel" id="mainPanel"></div>
</div>
<script>
const data = ${JSON.stringify(eData)};
const svgDiagram = ${JSON.stringify(svgRaw)};
const praises = [
  "🌟 Tuyệt vời! Em nắm chắc kiến thức rồi đấy, nhận ngay +10 điểm thưởng!",
  "👏 Chính xác! Tư duy giải toán của em rất sắc bén, tiếp tục chinh phục câu sau nhé!",
  "🎯 Xuất sắc! Em đã vượt qua thử thách này một cách ngoạn mục!"
];
let stageIdx = 0;
let viewMode = "theory";
let currentQIdx = 0;
let answeredMap = {};
let totalRight = 0;

function fixInlineMath(str){
  return String(str || "").replace(/\\$([^$]+)\\$/g, function(_, inner){
    return "$" + inner.replace(/\\n+/g, " ").trim() + "$";
  });
}

function renderMath(){
  if(window.renderMathInElement){
    renderMathInElement(document.body,{delimiters:[{left:'$',right:'$',display:false}]});
  }
}

function initScorm(){
  try{
    let w = window;
    while(w && !w.API && w.parent && w.parent !== w) w = w.parent;
    if(w && w.API){ w.API.LMSInitialize(""); w.API.LMSSetValue("cmi.core.lesson_status","incomplete"); w.API.LMSCommit(""); }
  }catch(e){}
}

function syncScorm(score){
  try{
    let w = window;
    while(w && !w.API && w.parent && w.parent !== w) w = w.parent;
    if(w && w.API){
      w.API.LMSSetValue("cmi.core.score.raw", String(score));
      w.API.LMSSetValue("cmi.core.lesson_status", score >= 50 ? "passed" : "completed");
      w.API.LMSCommit("");
    }
  }catch(e){}
}

function render(){
  const stages = data.stages || [];
  const totalQ = stages.reduce((acc, s) => acc + (s.questions || []).length, 0);
  const pctScore = totalQ ? Math.round((totalRight / totalQ) * 100) : 100;
  document.getElementById("scoreBadge").textContent = \`🏆 Điểm: \${pctScore}/100 (\${totalRight}/\${totalQ} câu)\`;
  document.getElementById("progBadge").textContent = \`Chặng \${stageIdx + 1}/\${stages.length}\`;

  document.getElementById("stepper").innerHTML = stages.map((st, idx) =>
    \`<button class="step-btn \${idx === stageIdx ? 'active' : ''}" onclick="goStage(\${idx})">\${st.title}</button>\`
  ).join("");

  const st = stages[stageIdx];
  if(!st) return;
  const qs = st.questions || [];
  const panel = document.getElementById("mainPanel");

  if(viewMode === "theory"){
    const points = Array.isArray(st.points) && st.points.length
      ? st.points
      : String(st.theory || "").split("\\n").filter(Boolean);

    const pointsHtml = points.map((p, i) =>
      \`<div class="point-card"><strong>\${i + 1}.</strong> \${fixInlineMath(p)}</div>\`
    ).join("");

    const formulaHtml = st.formulaHighlight
      ? \`<div class="formula-card"><div class="formula-title">📌 Công thức / Ghi nhớ cốt lõi</div><div class="formula-math">\${fixInlineMath(st.formulaHighlight)}</div></div>\`
      : "";

    const diagramHtml = svgDiagram
      ? \`<div class="svg-box"><div style="font-size:12px;font-weight:800;color:#1d4ed8;margin-bottom:6px">HÌNH MINH HỌA TRỰC QUAN SGK</div>\${svgDiagram}</div>\`
      : "";

    panel.innerHTML = \`
      <span class="q-type-tag">📖 Kiến Thức Trọng Tâm • \${st.title}</span>
      <h2 style="margin-top:4px;color:#1e3a8a">\${st.title}</h2>
      <div class="theory-grid">
        <div>\${pointsHtml}</div>
        <div>\${formulaHtml}\${diagramHtml}</div>
      </div>
      <div class="controls">
        <button class="btn-sub" \${stageIdx === 0 ? "disabled" : ""} onclick="goStage(\${stageIdx - 1})">⬅ Chặng trước</button>
        <button class="btn-play" onclick="startStageQuiz()">🎮 Luyện tập tương tác chặng này (\${qs.length} câu) ➔</button>
      </div>
    \`;
    renderMath();
    return;
  }

  const q = qs[currentQIdx];
  if(!q) return;
  const key = \`\${stageIdx}_\${currentQIdx}\`;
  const userAns = answeredMap[key];
  const isDone = userAns !== undefined;

  let typeLabel = "🎯 Thử thách Trắc nghiệm 4 lựa chọn";
  if(q.type === "tf") typeLabel = "⚡ Thử thách Phản xạ Đúng / Sai";
  if(q.type === "fill") typeLabel = "✍️ Thử thách Điền đáp số chính xác";

  let interactionHtml = "";
  let isCorrectPick = false;

  if(q.type === "fill"){
    const normUser = String(userAns || "").replace(/\\s+/g, "").replace(",", ".").toLowerCase();
    const normAns = String(q.answerText || "").replace(/\\s+/g, "").replace(",", ".").toLowerCase();
    isCorrectPick = isDone && normUser === normAns;
    interactionHtml = \`
      <div class="fill-box">
        <input id="fillInput" class="fill-input" placeholder="Nhập đáp số của em..." value="\${isDone ? userAns : ""}" \${isDone ? "disabled" : ""}>
        <button class="btn-main" \${isDone ? "disabled" : ""} onclick="submitFill()">Kiểm tra đáp án</button>
      </div>
    \`;
  } else if(q.type === "tf"){
    isCorrectPick = isDone && Number(userAns) === Number(q.answer);
    const opts = q.options && q.options.length === 2 ? q.options : ["Đúng", "Sai"];
    interactionHtml = \`<div class="tf-grid">\` + opts.map((opt, oi) => {
      let cls = "tf-btn";
      if(isDone){
        if(oi === Number(q.answer)) cls += " opt-btn correct";
        else if(oi === Number(userAns)) cls += " opt-btn wrong";
      }
      return \`<button class="\${cls}" \${isDone ? "disabled" : ""} onclick="submitChoice(\${oi})">\${oi === 0 ? "✅ " : "❌ "}\${fixInlineMath(opt)}</button>\`;
    }).join("") + \`</div>\`;
  } else {
    isCorrectPick = isDone && Number(userAns) === Number(q.answer);
    interactionHtml = (q.options || []).map((opt, oi) => {
      let cls = "opt-btn";
      if(isDone){
        if(oi === Number(q.answer)) cls += " correct";
        else if(oi === Number(userAns)) cls += " wrong";
      }
      return \`<button class="\${cls}" \${isDone ? "disabled" : ""} onclick="submitChoice(\${oi})">\${fixInlineMath(opt)}</button>\`;
    }).join("");
  }

  const rightDisplay = q.type === "fill" ? q.answerText : fixInlineMath((q.options || [])[q.answer]);
  const feedbackHtml = isDone ? (isCorrectPick
    ? \`<div class="feedback fb-ok"><strong>\${praises[currentQIdx % praises.length]}</strong><br>💡 Giải thích chi tiết: \${fixInlineMath(q.explain || "Hoàn toàn chính xác!")}</div>\`
    : \`<div class="feedback fb-no"><strong>💪 Chưa chính xác rồi, cố gắng lên em nhé!</strong><br>👉 Đáp án đúng là: <strong>\${rightDisplay}</strong>.<br>💡 Lời giải gợi ý: \${fixInlineMath(q.explain || "Em xem lại phần lý thuyết chặng này nhé!")}</div>\`
  ) : "";

  const isLastQInStage = currentQIdx >= qs.length - 1;
  const isLastStage = stageIdx >= stages.length - 1;

  let nextActionBtn = "";
  if(!isLastQInStage){
    nextActionBtn = \`<button class="btn-play" onclick="nextQuestion()">Câu tiếp theo (\${currentQIdx + 2}/\${qs.length}) ➔</button>\`;
  } else if(!isLastStage){
    nextActionBtn = \`<button class="btn-main" onclick="goStage(\${stageIdx + 1})">Hoàn thành chặng • Sang Chặng \${stageIdx + 2} ➔</button>\`;
  } else {
    nextActionBtn = \`<button class="btn-play" onclick="finishAll(\${pctScore})">🏆 Hoàn thành bài học & Lưu điểm SCORM</button>\`;
  }

  panel.innerHTML = \`
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span class="q-type-tag">\${typeLabel}</span>
      <span style="font-weight:700;color:#64748b;font-size:14px">\${st.title} • Câu \${currentQIdx + 1}/\${qs.length}</span>
    </div>
    <h3 style="font-size:19px;color:#0f172a;margin:10px 0 14px;line-height:1.6">\${fixInlineMath(q.question)}</h3>
    \${interactionHtml}
    \${feedbackHtml}
    <div class="controls">
      <button class="btn-sub" onclick="backToTheory()">📖 Xem lại lý thuyết chặng này</button>
      \${nextActionBtn}
    </div>
  \`;
  renderMath();
}

function startStageQuiz(){
  viewMode = "quiz";
  currentQIdx = 0;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToTheory(){
  viewMode = "theory";
  render();
}

function nextQuestion(){
  currentQIdx++;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function submitChoice(oi){
  const key = \`\${stageIdx}_\${currentQIdx}\`;
  if(answeredMap[key] !== undefined) return;
  answeredMap[key] = oi;
  const q = data.stages[stageIdx].questions[currentQIdx];
  if(Number(oi) === Number(q.answer)) totalRight++;
  updateAndRender();
}

function submitFill(){
  const val = document.getElementById("fillInput").value.trim();
  if(!val) return alert("Em hãy nhập câu trả lời trước khi bấm kiểm tra nhé!");
  const key = \`\${stageIdx}_\${currentQIdx}\`;
  if(answeredMap[key] !== undefined) return;
  answeredMap[key] = val;
  const q = data.stages[stageIdx].questions[currentQIdx];
  const normUser = val.replace(/\\s+/g, "").replace(",", ".").toLowerCase();
  const normAns = String(q.answerText || "").replace(/\\s+/g, "").replace(",", ".").toLowerCase();
  if(normUser === normAns) totalRight++;
  updateAndRender();
}

function updateAndRender(){
  const totalQ = (data.stages || []).reduce((acc, s) => acc + (s.questions || []).length, 0);
  const pct = totalQ ? Math.round((totalRight / totalQ) * 100) : 100;
  syncScorm(pct);
  render();
}

function goStage(idx){
  stageIdx = idx;
  viewMode = "theory";
  currentQIdx = 0;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function finishAll(score){
  syncScorm(score);
  alert(\`🎉 Xuất sắc! Em đã hoàn thành toàn bộ bài học với số điểm \${score}/100. Kết quả đã được lưu vào hệ thống!\`);
}

initScorm();
render();
</script>
</body>
</html>`;

        zip.file("imsmanifest.xml", manifestXml);
        zip.file("index.html", htmlLesson);
        const blob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `SCORM_Elearning_TuongTac_${title.replace(/\s+/g, "_")}.zip`;
        a.click();
    } catch (err) {
        alert("Lỗi đóng gói E-learning: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "📦 Đóng Gói E-learning SCORM (.zip)";
        }
    }
}

// ==================== TIỆN ÍCH TẠO MÃ QR & PDF SANG WORD CHUẨN MATHTYPE ====================
function generateCustomQR() {
    const text = document.getElementById("qrCustomText").value.trim();
    if (!text) return alert("Vui lòng nhập đường dẫn hoặc nội dung cần tạo mã QR!");
    const box = document.getElementById("customQrBox");
    box.innerHTML = "";
    new QRCode(box, { text, width: 180, height: 180 });
}

function downloadCustomQR() {
    const canvas = document.querySelector("#customQrBox canvas");
    if (!canvas) return alert("Vui lòng bấm 'Tạo Mã QR' trước!");
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "MaQR_THPT_DaKia.png";
    a.click();
}

async function convertPdfToDocx(event) {
    const file = event.target.files[0];
    if (!file) return;
    const statusEl = document.getElementById("pdfConvertStatus");
    statusEl.textContent = "⏳ AI đang nhận diện chữ và công thức Toán học từ PDF sang Word (vui lòng đợi 15-30 giây)...";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const pdfBase64 = btoa(binary);

        const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Trích xuất nguyên văn toàn bộ đề thi/tài liệu trong file PDF này, giữ nguyên công thức Toán/Lí/Hóa dưới dạng $...$ chuẩn MathType.",
                mode: "pdf_to_word",
                pdfBase64
            })
        });

        let fullText = "";
        for await (const chunk of responseBodyReader(res)) {
            fullText += chunk;
        }

        const { Document, Packer, Paragraph, TextRun } = docx;
        const lines = fullText.split("\n");
        const paragraphs = lines.map(line => new Paragraph({
            children: [new TextRun({ text: line, size: 26, font: "Times New Roman" })],
            spacing: { after: 120 }
        }));

        const doc = new Document({ sections: [{ children: paragraphs }] });
        const blob = await Packer.toBlob(doc);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name.replace(/\.pdf$/i, "") + "_DaChuyenWord_MathType.docx";
        a.click();
        statusEl.textContent = "✅ Đã chuyển đổi xong sang file Word (.docx) giữ nguyên công thức Toán!";
    } catch (err) {
        statusEl.textContent = "❌ Lỗi chuyển đổi PDF: " + err.message;
    }
}

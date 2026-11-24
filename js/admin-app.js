// Dữ liệu mẫu khởi tạo ban đầu
let studentList = JSON.parse(localStorage.getItem("dakia_all_students")) || [
    { student_code: "10A801", full_name: "Nguyễn Văn An", class_name: "10A8", grade: "10", is_weak_mode: true },
    { student_code: "10A802", full_name: "Trần Thị Bích", class_name: "10A8", grade: "10", is_weak_mode: false },
    { student_code: "10A803", full_name: "Lê Hoàng Nam", class_name: "10A8", grade: "10", is_weak_mode: true }
];

function verifyAdmin() {
    const pass = document.getElementById("adminPassInput").value;
    if (pass === TEACHER_ADMIN_PASS) {
        document.getElementById("adminLoginScreen").classList.add("hidden");
        document.getElementById("adminDashboard").classList.remove("hidden");
        loadAdminData();
    } else {
        document.getElementById("adminLoginErr").classList.remove("hidden");
    }
}

async function loadAdminData() {
    if (supabaseClient) {
        const { data } = await supabaseClient.from("students").select("*").order("student_code");
        if (data && data.length > 0) {
            studentList = data;
            localStorage.setItem("dakia_all_students", JSON.stringify(studentList));
        }
    }
    updateClassFilterDropdown();
    renderStudentTable();
}

// Tự động cập nhật danh sách các lớp vào ô chọn lọc
function updateClassFilterDropdown() {
    const selectEl = document.getElementById("classFilterSelect");
    const currentSelected = selectEl.value;
    const uniqueClasses = [...new Set(studentList.map(s => s.class_name.toUpperCase()))].sort();

    selectEl.innerHTML = `<option value="ALL">Tất cả các lớp (${studentList.length} HS)</option>` +
        uniqueClasses.map(cls => {
            const count = studentList.filter(s => s.class_name.toUpperCase() === cls).length;
            return `<option value="${cls}">Lớp ${cls} (${count} HS)</option>`;
        }).join("");

    // Giữ nguyên lớp đang chọn nếu lớp đó vẫn còn trong danh sách
    if (uniqueClasses.includes(currentSelected)) {
        selectEl.value = currentSelected;
    }
}

function renderStudentTable() {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const tbody = document.getElementById("studentTableBody");

    const selectedClass = document.getElementById("classFilterSelect").value;
    const searchKeyword = document.getElementById("searchStudentInput").value.trim().toLowerCase();

    // Thống kê tổng quan toàn trường
    let weakCount = 0;
    const classesSet = new Set();
    studentList.forEach(s => {
        if (s.is_weak_mode) weakCount++;
        classesSet.add(s.class_name.toUpperCase());
    });

    document.getElementById("statTotalStudents").textContent = studentList.length;
    document.getElementById("statWeakStudents").textContent = weakCount;
    document.getElementById("statTotalLogs").textContent = logs.length;
    document.getElementById("statClasses").textContent = [...classesSet].sort().join(", ") || "Chưa có";

    // Lọc danh sách hiển thị theo lớp và từ khóa tìm kiếm
    const filteredList = studentList
        .map((stu, originalIndex) => ({ ...stu, originalIndex }))
        .filter(stu => {
            const matchClass = selectedClass === "ALL" || stu.class_name.toUpperCase() === selectedClass;
            const matchKeyword = !searchKeyword ||
                stu.student_code.toLowerCase().includes(searchKeyword) ||
                stu.full_name.toLowerCase().includes(searchKeyword);
            return matchClass && matchKeyword;
        });

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-slate-400 text-sm">Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredList.map((stu, displayIdx) => {
        const stuLogs = logs.filter(l => l.student_code === stu.student_code);
        const scored = stuLogs.filter(l => l.score !== null);
        const avgScore = scored.length > 0
            ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1)
            : "--";

        const weakPoints = [...new Set(stuLogs.map(l => l.weak_points).filter(Boolean))].join(", ") || "Chưa ghi nhận";

        return `
            <tr class="hover:bg-slate-50">
                <td class="py-3 px-4 text-slate-400 text-xs">${displayIdx + 1}</td>
                <td class="py-3 px-4 font-bold text-blue-700">${stu.student_code}</td>
                <td class="py-3 px-4 font-medium text-slate-800">${stu.full_name}</td>
                <td class="py-3 px-4"><span class="bg-slate-100 px-2 py-0.5 rounded font-semibold text-xs text-slate-700">${stu.class_name}</span></td>
                <td class="py-3 px-4">
                    <button onclick="toggleStudentWeakMode(${stu.originalIndex})" class="px-2.5 py-1 rounded-full text-xs font-semibold transition ${stu.is_weak_mode ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                        ${stu.is_weak_mode ? '⚠️ Hỗ trợ HS yếu' : 'Tiêu chuẩn'}
                    </button>
                </td>
                <td class="py-3 px-4">${stuLogs.length}</td>
                <td class="py-3 px-4 font-bold text-teal-700">${avgScore}</td>
                <td class="py-3 px-4 text-xs text-red-600 max-w-xs truncate" title="${weakPoints}">${weakPoints}</td>
                <td class="py-3 px-4 text-right">
                    <button onclick="deleteStudent(${stu.originalIndex})" class="text-xs text-red-500 hover:underline">Xóa</button>
                </td>
            </tr>
        `;
    }).join("");
}

// ==================== THÊM LẺ 1 HỌC SINH ====================
async function addStudent() {
    const code = document.getElementById("newStuCode").value.trim().toUpperCase();
    const name = document.getElementById("newStuName").value.trim();
    const cls = document.getElementById("newStuClass").value.trim().toUpperCase();
    const isWeak = document.getElementById("newStuWeak").checked;

    if (!code || !name || !cls) {
        alert("Thầy/Cô vui lòng nhập đủ Mã học sinh, Họ tên và Lớp!");
        return;
    }

    if (studentList.some(s => s.student_code === code)) {
        alert(`Mã học sinh "${code}" đã tồn tại trong danh sách!`);
        return;
    }

    const newStu = {
        student_code: code,
        full_name: name,
        class_name: cls,
        grade: cls.slice(0, 2) || "10",
        is_weak_mode: isWeak
    };

    studentList.push(newStu);
    localStorage.setItem("dakia_all_students", JSON.stringify(studentList));

    if (supabaseClient) {
        await supabaseClient.from("students").upsert([newStu]);
    }

    document.getElementById("newStuCode").value = "";
    document.getElementById("newStuName").value = "";
    updateClassFilterDropdown();
    renderStudentTable();
}

// ==================== TẢI FILE EXCEL MẪU ====================
function downloadSampleExcel() {
    const sampleData = [
        { MaHS: "10A801", HoTen: "Nguyễn Văn An", Lop: "10A8", HoTroYeu: "Có" },
        { MaHS: "10A802", HoTen: "Trần Thị Bích", Lop: "10A8", HoTroYeu: "Không" },
        { MaHS: "11A101", HoTen: "Phạm Minh Tuấn", Lop: "11A1", HoTroYeu: "Có" }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachHocSinh");
    XLSX.writeFile(wb, "Mau_Nhap_Danh_Sach_Hoc_Sinh_THPT_DaKia.xlsx");
}

// ==================== NHẬP DANH SÁCH TỪ FILE EXCEL ====================
function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (rows.length === 0) {
                alert("File Excel trống, không có dữ liệu học sinh!");
                return;
            }

            let addedCount = 0;
            let updatedCount = 0;
            const recordsToSync = [];

            rows.forEach(row => {
                // Hỗ trợ linh hoạt nhiều cách đặt tên cột trong Excel của Giáo viên
                const rawCode = row.MaHS || row["Mã HS"] || row["Mã học sinh"] || row.student_code || "";
                const rawName = row.HoTen || row["Họ và tên"] || row["Họ tên"] || row.full_name || "";
                const rawClass = row.Lop || row["Lớp"] || row.class_name || "";
                const rawWeak = String(row.HoTroYeu || row["Hỗ trợ yếu"] || row["HS yếu"] || "").trim().toLowerCase();

                const code = String(rawCode).trim().toUpperCase();
                const name = String(rawName).trim();
                const cls = String(rawClass).trim().toUpperCase();

                if (!code || !name || !cls) return; // Bỏ qua dòng thiếu thông tin

                const isWeak = ["có", "co", "yes", "true", "1", "x"].includes(rawWeak);
                const stuObj = {
                    student_code: code,
                    full_name: name,
                    class_name: cls,
                    grade: cls.slice(0, 2) || "10",
                    is_weak_mode: isWeak
                };

                const existingIdx = studentList.findIndex(s => s.student_code === code);
                if (existingIdx >= 0) {
                    studentList[existingIdx] = { ...studentList[existingIdx], ...stuObj };
                    updatedCount++;
                } else {
                    studentList.push(stuObj);
                    addedCount++;
                }
                recordsToSync.push(stuObj);
            });

            localStorage.setItem("dakia_all_students", JSON.stringify(studentList));

            // Đồng bộ hàng loạt lên Supabase nếu đã kết nối
            if (supabaseClient && recordsToSync.length > 0) {
                await supabaseClient.from("students").upsert(recordsToSync, { onConflict: "student_code" });
            }

            updateClassFilterDropdown();
            renderStudentTable();
            alert(`Nhập Excel thành công!\n- Thêm mới: ${addedCount} học sinh\n- Cập nhật: ${updatedCount} học sinh`);
        } catch (err) {
            alert("Lỗi đọc file Excel: " + err.message + "\nThầy/Cô hãy tải 'File Excel mẫu' để xem định dạng chuẩn nhé.");
        } finally {
            event.target.value = ""; // Reset ô chọn file để có thể nhập tiếp file khác
        }
    };
    reader.readAsArrayBuffer(file);
}

async function toggleStudentWeakMode(index) {
    studentList[index].is_weak_mode = !studentList[index].is_weak_mode;
    localStorage.setItem("dakia_all_students", JSON.stringify(studentList));

    if (supabaseClient) {
        await supabaseClient
            .from("students")
            .update({ is_weak_mode: studentList[index].is_weak_mode })
            .eq("student_code", studentList[index].student_code);
    }
    renderStudentTable();
}

async function deleteStudent(index) {
    if (!confirm(`Xóa học sinh ${studentList[index].full_name} (${studentList[index].class_name})?`)) return;
    const code = studentList[index].student_code;
    studentList.splice(index, 1);
    localStorage.setItem("dakia_all_students", JSON.stringify(studentList));

    if (supabaseClient) {
        await supabaseClient.from("students").delete().eq("student_code", code);
    }
    updateClassFilterDropdown();
    renderStudentTable();
}

function assignHomework() {
    const cls = document.getElementById("assignClass").value.trim().toUpperCase();
    const title = document.getElementById("assignTitle").value.trim();
    const content = document.getElementById("assignContent").value.trim();
    if (!title || !content) {
        alert("Vui lòng nhập tiêu đề và nội dung bài tập!");
        return;
    }
    alert(`Đã giao bài tập "${title}" cho lớp ${cls} thành công!`);
    document.getElementById("assignTitle").value = "";
    document.getElementById("assignContent").value = "";
}

// Xuất báo cáo kết quả học tập ra file Excel (.xlsx) - Xuất theo lớp đang lọc hoặc toàn bộ
function exportReportToExcel() {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const selectedClass = document.getElementById("classFilterSelect").value;

    const listToExport = selectedClass === "ALL"
        ? studentList
        : studentList.filter(s => s.class_name.toUpperCase() === selectedClass);

    const rows = listToExport.map((stu, i) => {
        const stuLogs = logs.filter(l => l.student_code === stu.student_code);
        const scored = stuLogs.filter(l => l.score !== null);
        const avg = scored.length > 0
            ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1)
            : "Chưa kiểm tra";

        return {
            "STT": i + 1,
            "Mã học sinh": stu.student_code,
            "Họ và tên": stu.full_name,
            "Lớp": stu.class_name,
            "Chế độ hỗ trợ": stu.is_weak_mode ? "Hỗ trợ học sinh yếu" : "Tiêu chuẩn",
            "Số lượt học & làm bài": stuLogs.length,
            "Điểm trung bình": avg,
            "Kiến thức cần củng cố": [...new Set(stuLogs.map(l => l.weak_points).filter(Boolean))].join("; ") || "Tốt"
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    const sheetName = selectedClass === "ALL" ? "TatCaCacLop" : `Lop_${selectedClass}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `BaoCao_ToanAI_${sheetName}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
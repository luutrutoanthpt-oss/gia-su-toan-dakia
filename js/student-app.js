// Trạng thái toàn cục của ứng dụng Học sinh
let currentStudent = JSON.parse(localStorage.getItem("dakia_student")) || null;
let chatHistory = [];
let selectedImageBase64 = null;
let currentQuizQuestions = [];

// Khởi tạo khi tải trang
document.addEventListener("DOMContentLoaded", () => {
    updateStudentUI();
    renderTopics("10");
    startPracticeQuiz();
    renderMathInElementSafe(document.body);
    initClipboardImagePaste();
});

// Hàm render công thức Toán KaTeX an toàn
function renderMathInElementSafe(element) {
    if (window.renderMathInElement && element) {
        renderMathInElement(element, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false }
            ],
            throwOnError: false
        });
    }
}

// Chèn ký hiệu Toán học từ thanh công cụ vào ô nhập chat
window.insertMathSymbol = function(symbol) {
    const input = document.getElementById("chatInput");
    if (!input) return;

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const text = input.value;

    const before = text.slice(0, start);
    const dollarCount = (before.match(/\$/g) || []).length;
    const wrapped = (dollarCount % 2 === 0) ? `$${symbol}$` : symbol;

    input.value = before + wrapped + text.slice(end);
    input.focus();

    const bracePos = wrapped.indexOf("{}");
    const newPos = bracePos !== -1 ? start + bracePos + 1 : start + wrapped.length;
    input.setSelectionRange(newPos, newPos);
};

// Nén ảnh từ Blob/File sang Base64 JPEG (tối đa 1024px) và hiển thị xem trước
function processAndPreviewImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement("canvas");
            const MAX_DIM = 1024;
            let width = img.width;
            let height = img.height;
            if (width > MAX_DIM || height > MAX_DIM) {
                if (width > height) {
                    height = Math.round(height * MAX_DIM / width);
                    width = MAX_DIM;
                } else {
                    width = Math.round(width * MAX_DIM / height);
                    height = MAX_DIM;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            selectedImageBase64 = canvas.toDataURL("image/jpeg", 0.82);
            const previewImg = document.getElementById("imagePreview");
            const previewBox = document.getElementById("imagePreviewContainer");
            if (previewImg) previewImg.src = selectedImageBase64;
            if (previewBox) previewBox.classList.remove("hidden");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Lắng nghe sự kiện dán ảnh trực tiếp (Ctrl + V) vào ô chat
function initClipboardImagePaste() {
    const chatInput = document.getElementById("chatInput");
    if (!chatInput) return;

    chatInput.addEventListener("paste", function(event) {
        const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                event.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    processAndPreviewImageFile(blob);
                }
                break;
            }
        }
    });
}

// Chuyển đổi giữa các Tab
function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("border-white", "text-white", "font-semibold");
        btn.classList.add("border-transparent");
    });

    document.getElementById(`tab-${tabName}`).classList.add("active");
    const activeBtn = document.getElementById(`nav-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.add("border-white", "text-white", "font-semibold");
        activeBtn.classList.remove("border-transparent");
    }
    if (tabName === "progress") loadProgressTab();
}

// ==================== 1. ĐĂNG NHẬP BẰNG MÃ HỌC SINH ====================
function openLoginModal() {
    document.getElementById("loginModal").classList.remove("hidden");
    document.getElementById("loginModal").classList.add("flex");
}

function closeLoginModal() {
    document.getElementById("loginModal").classList.add("hidden");
    document.getElementById("loginModal").classList.remove("flex");
}

async function loginWithStudentCode() {
    const code = document.getElementById("studentCodeInput").value.trim().toUpperCase();
    const errEl = document.getElementById("loginErrorMsg");
    if (!code) {
        errEl.textContent = "Vui lòng nhập mã học sinh!";
        errEl.classList.remove("hidden");
        return;
    }

    if (typeof supabaseClient !== "undefined" && supabaseClient) {
        const { data, error } = await supabaseClient
            .from("students")
            .select("*")
            .eq("student_code", code)
            .single();

        if (error || !data) {
            errEl.textContent = "Không tìm thấy mã học sinh này. Em hãy hỏi lại Thầy/Cô nhé!";
            errEl.classList.remove("hidden");
            return;
        }
        currentStudent = data;
    } else {
        const localStudents = JSON.parse(localStorage.getItem("dakia_all_students")) || [];
        const found = localStudents.find(s => s.student_code === code);
        currentStudent = found || {
            student_code: code,
            full_name: `Học sinh (${code})`,
            class_name: code.slice(0, 4) || "10A8",
            grade: "10",
            is_weak_mode: false,
            total_solved: 0
        };
    }

    localStorage.setItem("dakia_student", JSON.stringify(currentStudent));
    errEl.classList.add("hidden");
    closeLoginModal();
    updateStudentUI();
}

function updateStudentUI() {
    if (currentStudent) {
        document.getElementById("studentDisplayName").textContent = `${currentStudent.full_name} (${currentStudent.class_name})`;
        document.getElementById("welcomeGreeting").textContent = `Chào ${currentStudent.full_name} – Lớp ${currentStudent.class_name}!`;
        document.getElementById("weakModeToggle").checked = !!currentStudent.is_weak_mode;
    }
}

function toggleWeakMode() {
    const isWeak = document.getElementById("weakModeToggle").checked;
    if (currentStudent) {
        currentStudent.is_weak_mode = isWeak;
        localStorage.setItem("dakia_student", JSON.stringify(currentStudent));
    }
    const notice = isWeak
        ? "Đã bật <strong>Chế độ Học sinh yếu</strong>: Thầy sẽ chia nhỏ từng bước cực dễ và cho ví dụ mẫu trước khi em làm."
        : "Đã chuyển sang <strong>Chế độ Tiêu chuẩn</strong>.";
    appendMessageToChat("ai", notice);
}

// ==================== 2. GIA SƯ AI & XỬ LÝ ẢNH CHỤP TỪ ĐIỆN THOẠI / CLIPBOARD ====================
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    processAndPreviewImageFile(file);
}

function clearSelectedImage() {
    selectedImageBase64 = null;
    const imgInput = document.getElementById("imageInput");
    if (imgInput) imgInput.value = "";
    const previewBox = document.getElementById("imagePreviewContainer");
    if (previewBox) previewBox.classList.add("hidden");
}

function handleChatKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendTutorMessage();
    }
}

function sendQuickPrompt(text) {
    document.getElementById("chatInput").value = text;
    sendTutorMessage();
}

function resetChat() {
    chatHistory = [];
    clearSelectedImage();
    document.getElementById("chatMessages").innerHTML = `
        <div class="msg-ai max-w-2xl text-sm sm:text-base">
            <p>Đã bắt đầu bài mới! Em hãy nhập đề bài hoặc chụp/dán ảnh bài tập tiếp theo nhé.</p>
        </div>
    `;
}

async function sendTutorMessage() {
    const inputEl = document.getElementById("chatInput");
    const text = inputEl.value.trim();
    if (!text && !selectedImageBase64) return;

    const gradeEl = document.getElementById("tutorGradeSelect");
    const grade = gradeEl ? gradeEl.value : "10";
    const isWeakMode = document.getElementById("weakModeToggle").checked;

    let studentHtml = text ? `<p class="whitespace-pre-wrap">${escapeHtml(text)}</p>` : "";
    if (selectedImageBase64) {
        studentHtml += `<img src="${selectedImageBase64}" class="mt-2 max-h-48 rounded-lg border border-blue-300">`;
    }
    appendMessageToChat("student", studentHtml);

    const imageToSend = selectedImageBase64;
    inputEl.value = "";
    clearSelectedImage();

    const loadingId = appendLoadingBubble();

    try {
        const response = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text || "Em gửi ảnh bài tập này, thầy hướng dẫn giúp em từng bước với ạ!",
                imageBase64: imageToSend,
                grade: grade,
                isWeakMode: isWeakMode,
                history: chatHistory.slice(-6)
            })
        });

        removeLoadingBubble(loadingId);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Lỗi máy chủ (Mã ${response.status})`);
        }

        const data = await response.json();
        const aiReply = data.reply || "Thầy chưa nhận được phản hồi, em thử gửi lại nhé!";

        chatHistory.push({ role: "user", text: text || "[Hình ảnh bài tập]" });
        chatHistory.push({ role: "model", text: aiReply });

        appendMessageToChat("ai", formatAiResponse(aiReply));
        if (typeof logLearningActivity === "function") {
            logLearningActivity("ai_tutor", `Hỏi Gia sư AI Toán ${grade}`, null, "");
        }

    } catch (err) {
        removeLoadingBubble(loadingId);
        appendMessageToChat("ai", `<span class="text-red-600 font-semibold">⚠️ Lỗi kết nối AI:</span> ${err.message}`);
    }
}

function appendMessageToChat(sender, htmlContent) {
    const container = document.getElementById("chatMessages");
    const div = document.createElement("div");
    div.className = sender === "ai" ? "msg-ai max-w-2xl text-sm sm:text-base space-y-2" : "msg-student max-w-xl text-sm sm:text-base";
    div.innerHTML = htmlContent;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    renderMathInElementSafe(div);
}

function appendLoadingBubble() {
    const id = "loading-" + Date.now();
    const container = document.getElementById("chatMessages");
    const div = document.createElement("div");
    div.id = id;
    div.className = "msg-ai w-24 flex items-center justify-center space-x-1.5 py-3";
    div.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeLoadingBubble(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function formatAiResponse(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ==================== 3. HỌC TOÁN THEO CHỦ ĐỀ ====================
function renderTopics(grade) {
    document.querySelectorAll(".grade-filter-btn").forEach(btn => {
        btn.classList.remove("bg-blue-700", "text-white");
        btn.classList.add("bg-slate-100", "text-slate-700");
    });
    const activeBtn = document.getElementById(`gradeBtn-${grade}`);
    if (activeBtn) {
        activeBtn.classList.add("bg-blue-700", "text-white");
        activeBtn.classList.remove("bg-slate-100", "text-slate-700");
    }

    const topics = (typeof CURRICULUM_DATA !== "undefined" ? CURRICULUM_DATA[grade] : []) || [];
    const listEl = document.getElementById("topicList");
    if (!listEl) return;

    listEl.innerHTML = topics.map((t, idx) => `
        <button onclick="showTopicDetail('${grade}', ${idx})" class="w-full text-left bg-white hover:bg-blue-50 border border-slate-200 p-3.5 rounded-xl shadow-sm transition font-semibold text-sm text-slate-800">
            ${t.title}
        </button>
    `).join("");

    if (topics.length > 0) showTopicDetail(grade, 0);
}

function showTopicDetail(grade, index) {
    const topic = CURRICULUM_DATA[grade][index];
    const detailEl = document.getElementById("topicDetail");
    if (!detailEl) return;

    detailEl.innerHTML = `
        <div class="border-b border-slate-200 pb-3 flex flex-wrap justify-between items-center gap-2">
            <h3 class="font-bold text-lg text-blue-800">${topic.title}</h3>
            <button onclick="askAiAboutTopic('${topic.title}')" class="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-lg">
                🤖 Luyện chủ đề này với AI
            </button>
        </div>

        <div class="space-y-2 text-sm text-slate-700 leading-relaxed">
            <h4 class="font-bold text-slate-900">I. Tóm tắt lý thuyết trọng tâm</h4>
            ${topic.summary}
        </div>

        <div class="bg-blue-50/80 border border-blue-200 rounded-xl p-4 space-y-2">
            <h4 class="font-bold text-blue-900 text-sm">II. Công thức cần nhớ</h4>
            <div class="space-y-1.5 text-sm">
                ${topic.formulas.map(f => `<div class="bg-white px-3 py-2 rounded-lg border border-blue-100">$$${f}$$</div>`).join("")}
            </div>
        </div>

        <div class="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2 text-sm">
            <h4 class="font-bold text-amber-900">III. Ví dụ minh họa</h4>
            <p class="font-medium text-slate-800"><strong>Đề bài:</strong> ${topic.example.problem}</p>
            <p class="text-slate-700"><strong>Hướng dẫn giải:</strong> ${topic.example.solution}</p>
        </div>
    `;
    renderMathInElementSafe(detailEl);
}

function askAiAboutTopic(topicTitle) {
    switchTab("tutor");
    sendQuickPrompt(`Em muốn ôn tập và làm bài tập cơ bản về chủ đề "${topicTitle}". Thầy ra cho em 1 bài dễ để em tập làm từng bước nhé!`);
}

// ==================== 4. LUYỆN TẬP & KIỂM TRA (4 DẠNG CÂU HỎI) ====================
function startPracticeQuiz() {
    const gradeEl = document.getElementById("pracGrade");
    if (!gradeEl || typeof PRACTICE_QUESTIONS === "undefined") return;

    const grade = gradeEl.value;
    const level = document.getElementById("pracLevel").value;
    const type = document.getElementById("pracType").value;

    currentQuizQuestions = PRACTICE_QUESTIONS.filter(q => {
        const matchGrade = q.grade === grade;
        const matchLevel = level === "all" || q.level === level;
        const matchType = type === "all" || q.type === type;
        return matchGrade && matchLevel && matchType;
    });

    const container = document.getElementById("quizContainer");
    document.getElementById("quizAnalysisResult").classList.add("hidden");

    if (currentQuizQuestions.length === 0) {
        container.innerHTML = `<div class="bg-white p-6 rounded-xl border border-slate-200 text-center text-sm text-slate-500">Chưa có câu hỏi đúng bộ lọc này. Em hãy chọn "Tất cả mức độ" hoặc "Tất cả dạng câu hỏi" nhé!</div>`;
        return;
    }

    container.innerHTML = currentQuizQuestions.map((q, idx) => {
        let inputArea = "";

        if (q.type === "trac_nghiem") {
            inputArea = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                ${q.options.map((opt, optIdx) => `
                    <label class="option-btn border border-slate-300 rounded-xl p-3 cursor-pointer flex items-center gap-2.5 text-sm">
                        <input type="radio" name="q_${q.id}" value="${optIdx}" class="accent-blue-700">
                        <span><strong>${String.fromCharCode(65 + optIdx)}.</strong> ${opt}</span>
                    </label>
                `).join("")}
            </div>`;
        } else if (q.type === "dung_sai") {
            inputArea = `<div class="mt-3 space-y-2">
                ${q.subQuestions.map((sub, sIdx) => `
                    <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-sm">
                        <span>${sub.text}</span>
                        <div class="flex gap-3">
                            <label class="cursor-pointer font-medium text-teal-700"><input type="radio" name="q_${q.id}_${sIdx}" value="true"> Đúng</label>
                            <label class="cursor-pointer font-medium text-red-700"><input type="radio" name="q_${q.id}_${sIdx}" value="false"> Sai</label>
                        </div>
                    </div>
                `).join("")}
            </div>`;
        } else if (q.type === "tra_loi_ngan") {
            inputArea = `<div class="mt-3">
                <input type="text" id="ans_${q.id}" maxlength="6" placeholder="Nhập đáp số (tối đa 4 ký tự, VD: 3.61)" class="border border-slate-300 rounded-lg px-3.5 py-2 text-sm w-64 focus:border-blue-600 focus:outline-none">
            </div>`;
        } else if (q.type === "tu_luan") {
            inputArea = `<div class="mt-3 bg-blue-50 p-3.5 rounded-xl border border-blue-200 space-y-2 text-sm">
                <p class="font-semibold text-blue-900">Gợi ý từng bước suy nghĩ:</p>
                <ul class="list-disc pl-5 text-slate-700 space-y-1">
                    ${q.steps.map(s => `<li>${s}</li>`).join("")}
                </ul>
                <textarea id="ans_${q.id}" rows="2" placeholder="Nhập bài làm tóm tắt của em vào đây..." class="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white mt-2"></textarea>
            </div>`;
        }

        return `
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="card_${q.id}">
                <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span class="font-bold text-blue-700 uppercase">Câu ${idx + 1} • ${q.topicName}</span>
                    <span class="bg-slate-100 px-2 py-0.5 rounded">${typeof formatLevelLabel === "function" ? formatLevelLabel(q.level) : q.level}</span>
                </div>
                <div class="text-sm sm:text-base text-slate-800 font-medium">${q.content}</div>
                ${inputArea}
                <div id="exp_${q.id}" class="hidden mt-3 p-3 rounded-lg bg-slate-100 text-xs sm:text-sm text-slate-700 border-l-4 border-teal-600">
                    <strong>Lời giải chi tiết:</strong> ${q.explanation}
                </div>
            </div>
        `;
    }).join("") + `
        <div class="flex justify-end">
            <button onclick="submitPracticeQuiz()" class="bg-teal-700 hover:bg-teal-800 text-white font-bold px-6 py-3 rounded-xl shadow-md text-sm sm:text-base">
                Nộp Bài & Xem Phân Tích AI
            </button>
        </div>
    `;

    renderMathInElementSafe(container);
}

function submitPracticeQuiz() {
    let correctCount = 0;
    let weakTopics = [];

    currentQuizQuestions.forEach(q => {
        let isCorrect = false;

        if (q.type === "trac_nghiem") {
            const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
            if (selected && parseInt(selected.value) === q.correct) isCorrect = true;
        } else if (q.type === "dung_sai") {
            let subCorrect = 0;
            q.subQuestions.forEach((sub, sIdx) => {
                const sel = document.querySelector(`input[name="q_${q.id}_${sIdx}"]:checked`);
                if (sel && (sel.value === "true") === sub.answer) subCorrect++;
            });
            if (subCorrect === q.subQuestions.length) isCorrect = true;
        } else if (q.type === "tra_loi_ngan") {
            const val = document.getElementById(`ans_${q.id}`).value.trim().replace(",", ".");
            if (val === q.correctText) isCorrect = true;
        } else if (q.type === "tu_luan") {
            const val = document.getElementById(`ans_${q.id}`).value.trim();
            if (val.length >= 5) isCorrect = true;
        }

        if (isCorrect) {
            correctCount++;
            document.getElementById(`card_${q.id}`).classList.add("border-green-500");
        } else {
            document.getElementById(`card_${q.id}`).classList.add("border-red-400");
            weakTopics.push(q.weakPoint);
        }
        document.getElementById(`exp_${q.id}`).classList.remove("hidden");
    });

    const total = currentQuizQuestions.length;
    const score = Math.round((correctCount / total) * 10 * 10) / 10;
    const wrongCount = total - correctCount;

    const analysisEl = document.getElementById("quizAnalysisResult");
    analysisEl.classList.remove("hidden");
    analysisEl.innerHTML = `
        <h3 class="font-bold text-lg text-blue-900">📊 Kết Quả & Phân Tích Từ Gia Sư AI</h3>
        <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-green-50 p-3 rounded-xl border border-green-200">
                <span class="text-xs text-slate-500 block">Số câu đúng</span>
                <strong class="text-xl text-green-700">${correctCount}/${total}</strong>
            </div>
            <div class="bg-red-50 p-3 rounded-xl border border-red-200">
                <span class="text-xs text-slate-500 block">Số câu sai</span>
                <strong class="text-xl text-red-700">${wrongCount}</strong>
            </div>
            <div class="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <span class="text-xs text-slate-500 block">Điểm số</span>
                <strong class="text-xl text-blue-800">${score} / 10</strong>
            </div>
        </div>
        <div class="text-sm text-slate-700 space-y-2">
            <p><strong>Nhận xét:</strong> ${score >= 8 ? "Em nắm bài rất tốt! Hãy thử sức với các câu Vận dụng nhé." : score >= 5 ? "Em đã hiểu phần cơ bản, hãy xem lại lời giải các câu màu đỏ và luyện thêm với Gia sư AI nhé!" : "Em nên bật Chế độ Học sinh yếu ở tab Gia sư AI để thầy hướng dẫn lại từng bước cơ bản nhé!"}</p>
            ${weakTopics.length > 0 ? `<p class="text-red-700"><strong>Nội dung cần củng cố:</strong> ${[...new Set(weakTopics)].join(", ")}</p>` : ""}
        </div>
    `;
    renderMathInElementSafe(analysisEl);
    if (typeof logLearningActivity === "function") {
        logLearningActivity("practice_quiz", `Luyện tập (${correctCount}/${total} câu đúng)`, score, weakTopics.join(", "));
    }
}

let currentStudent = JSON.parse(localStorage.getItem("dakia_student")) || null;
let chatHistory = [];
let selectedImageBase64 = null;
let currentQuizQuestions = [];

document.addEventListener("DOMContentLoaded", async () => {
    updateStudentUI();
    renderTopics("10");
    startPracticeQuiz();
    renderMathInElementSafe(document.body);
    initClipboardImagePaste();
    loadProgressTab();

    if (typeof syncFromGoogleSheets === "function") {
        await syncFromGoogleSheets();
        renderTeacherUploadedExamsForStudent();
    } else {
        renderTeacherUploadedExamsForStudent();
    }
});

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

window.switchMathGroup = function(groupName) {
    document.querySelectorAll(".math-panel").forEach(el => {
        el.classList.add("hidden");
        el.classList.remove("flex");
    });
    document.querySelectorAll(".math-grp-btn").forEach(btn => {
        btn.classList.remove("bg-blue-700", "text-white");
        btn.classList.add("bg-slate-200", "text-slate-700");
    });

    const targetPanel = document.getElementById(`mpanel-${groupName}`);
    if (targetPanel) {
        targetPanel.classList.remove("hidden");
        targetPanel.classList.add("flex");
    }
    const targetBtn = document.getElementById(`mgrp-${groupName}`);
    if (targetBtn) {
        targetBtn.classList.add("bg-blue-700", "text-white");
        targetBtn.classList.remove("bg-slate-200", "text-slate-700");
    }
};

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

function onSubjectChange() {
    const sel = document.getElementById("tutorSubjectSelect");
    const label = sel ? sel.options[sel.selectedIndex].text : "Toán học";
    chatHistory = [];
    appendMessageToChat("ai", `Đã chuyển sang <strong>Gia sư môn ${label}</strong>. Em hãy gửi đề bài hoặc câu hỏi của môn này nhé!`);
}

function processAndPreviewImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement("canvas");
            const MAX_DIM = 800;
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

            selectedImageBase64 = canvas.toDataURL("image/jpeg", 0.72);
            const previewImg = document.getElementById("imagePreview");
            const previewBox = document.getElementById("imagePreviewContainer");
            if (previewImg) previewImg.src = selectedImageBase64;
            if (previewBox) previewBox.classList.remove("hidden");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

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
                if (blob) processAndPreviewImageFile(blob);
                break;
            }
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("border-white", "text-white", "font-semibold");
        btn.classList.add("border-transparent");
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add("active");
    const activeBtn = document.getElementById(`nav-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.add("border-white", "text-white", "font-semibold");
        activeBtn.classList.remove("border-transparent");
    }
    if (tabName === "progress") loadProgressTab();
}

function openLoginModal() {
    const m = document.getElementById("loginModal");
    if (m) { m.classList.remove("hidden"); m.classList.add("flex"); }
}

function closeLoginModal() {
    const m = document.getElementById("loginModal");
    if (m) { m.classList.add("hidden"); m.classList.remove("flex"); }
}

async function loginWithStudentCode() {
    const code = document.getElementById("studentCodeInput").value.trim().toUpperCase();
    const errEl = document.getElementById("loginErrorMsg");
    if (!code) {
        errEl.textContent = "Vui lòng nhập mã học sinh!";
        errEl.classList.remove("hidden");
        return;
    }

    if (typeof syncFromGoogleSheets === "function") {
        await syncFromGoogleSheets();
    }

    const localStudents = JSON.parse(localStorage.getItem("dakia_all_students")) || [];
    const found = localStudents.find(s => String(s.student_code).toUpperCase() === code);
    currentStudent = found || {
        student_code: code,
        full_name: `Học sinh (${code})`,
        class_name: code.slice(0, 4) || "10A8",
        grade: code.slice(0, 2) || "10",
        is_weak_mode: false
    };

    localStorage.setItem("dakia_student", JSON.stringify(currentStudent));
    errEl.classList.add("hidden");
    closeLoginModal();
    updateStudentUI();
    loadProgressTab();
}

function updateStudentUI() {
    if (currentStudent) {
        const disp = document.getElementById("studentDisplayName");
        const greet = document.getElementById("welcomeGreeting");
        const weak = document.getElementById("weakModeToggle");
        if (disp) disp.textContent = `${currentStudent.full_name} (${currentStudent.class_name})`;
        if (greet) greet.textContent = `Chào ${currentStudent.full_name} – Lớp ${currentStudent.class_name}!`;
        if (weak) weak.checked = !!currentStudent.is_weak_mode;
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
    const input = document.getElementById("chatInput");
    if (input) {
        input.value = text;
        sendTutorMessage();
    }
}

function resetChat() {
    chatHistory = [];
    clearSelectedImage();
    const box = document.getElementById("chatMessages");
    if (box) {
        box.innerHTML = `
            <div class="msg-ai max-w-2xl text-sm sm:text-base">
                <p>Đã bắt đầu bài mới! Em hãy nhập đề bài hoặc chụp/dán ảnh bài tập tiếp theo nhé.</p>
            </div>
        `;
    }
}

async function sendTutorMessage() {
    const inputEl = document.getElementById("chatInput");
    const text = inputEl.value.trim();
    if (!text && !selectedImageBase64) return;

    const grade = document.getElementById("tutorGradeSelect")?.value || "10";
    const subject = document.getElementById("tutorSubjectSelect")?.value || "toan";
    const isWeakMode = document.getElementById("weakModeToggle")?.checked || false;

    let studentHtml = text ? `<p class="whitespace-pre-wrap">${escapeHtml(text)}</p>` : "";
    if (selectedImageBase64) {
        studentHtml += `<img src="${selectedImageBase64}" class="mt-2 max-h-48 rounded-lg border border-blue-300">`;
    }
    appendMessageToChat("student", studentHtml);

    const imageToSend = selectedImageBase64;
    inputEl.value = "";
    clearSelectedImage();

    const loadingId = appendLoadingBubble();
    const NEWLINE = String.fromCharCode(10);

    try {
        const response = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text || "Em gửi ảnh bài tập này, thầy hướng dẫn giúp em từng bước với ạ!",
                imageBase64: imageToSend,
                grade: grade,
                subject: subject,
                isWeakMode: isWeakMode,
                history: chatHistory.slice(-4)
            })
        });

        removeLoadingBubble(loadingId);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Lỗi máy chủ (Mã ${response.status})`);
        }

        const container = document.getElementById("chatMessages");
        const aiDiv = document.createElement("div");
        aiDiv.className = "msg-ai max-w-2xl text-sm sm:text-base space-y-2";
        container.appendChild(aiDiv);

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullReply = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split(NEWLINE);
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr || jsonStr === "[DONE]") continue;
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const parts = parsed.candidates?.[0]?.content?.parts || [];
                        const chunk = parts
                            .filter(p => !p.thought && p.text)
                            .map(p => p.text)
                            .join("");
                        if (chunk) {
                            fullReply += chunk;
                            aiDiv.innerHTML = formatAiResponse(fullReply);
                            container.scrollTop = container.scrollHeight;
                        }
                    } catch (_) {}
                }
            }
        }

        if (!fullReply) fullReply = "Thầy chưa nhận được phản hồi, em thử gửi lại nhé!";
        aiDiv.innerHTML = formatAiResponse(fullReply);
        renderMathInElementSafe(aiDiv);
        container.scrollTop = container.scrollHeight;

        chatHistory.push({ role: "user", text: text || "[Hình ảnh bài tập]" });
        chatHistory.push({ role: "model", text: fullReply });

        logLearningActivity("ai_tutor", `Hỏi Gia sư AI (${subject.toUpperCase()} ${grade})`, null, "");

    } catch (err) {
        removeLoadingBubble(loadingId);
        appendMessageToChat("ai", `<span class="text-red-600 font-semibold">⚠️ Lỗi kết nối AI:</span> ${err.message}`);
    }
}

function appendMessageToChat(sender, htmlContent) {
    const container = document.getElementById("chatMessages");
    if (!container) return;
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

function renderMathPlotSVG(cfg) {
    const W = 320, H = 240, cx = 160, cy = 120, scale = 22;
    let content = `
        <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#334155"/>
            </marker>
        </defs>
        <rect width="${W}" height="${H}" fill="#ffffff"/>
    `;

    const drawAxes = () => {
        let grid = "";
        for (let x = cx % scale; x < W; x += scale) {
            grid += `<line x1="${x}" y1="10" x2="${x}" y2="${H - 10}" stroke="#f1f5f9" stroke-width="1"/>`;
        }
        for (let y = cy % scale; y < H; y += scale) {
            grid += `<line x1="10" y1="${y}" x2="${W - 10}" y2="${y}" stroke="#f1f5f9" stroke-width="1"/>`;
        }
        return grid + `
            <line x1="12" y1="${cy}" x2="${W - 12}" y2="${cy}" stroke="#334155" stroke-width="1.5" marker-end="url(#arrow)"/>
            <line x1="${cx}" y1="${H - 12}" x2="${cx}" y2="12" stroke="#334155" stroke-width="1.5" marker-end="url(#arrow)"/>
            <text x="${W - 16}" y="${cy - 6}" font-size="12" font-weight="bold" fill="#0f172a">x</text>
            <text x="${cx + 8}" y="18" font-size="12" font-weight="bold" fill="#0f172a">y</text>
            <text x="${cx - 12}" y="${cy + 14}" font-size="11" font-weight="bold" fill="#0f172a">O</text>
        `;
    };

    if (cfg.type === "parabola") {
        const a = Number(cfg.a) || 1, b = Number(cfg.b) || 0, c = Number(cfg.c) || 0;
        content += drawAxes();
        let pts = [];
        for (let px = 15; px <= W - 15; px += 2) {
            const x = (px - cx) / scale;
            const y = a * x * x + b * x + c;
            const py = cy - y * scale;
            if (py >= -20 && py <= H + 20) pts.push(`${px},${py.toFixed(1)}`);
        }
        const vx = -b / (2 * a);
        const vy = a * vx * vx + b * vx + c;
        const vpx = cx + vx * scale, vpy = cy - vy * scale;

        content += `<polyline fill="none" stroke="#1d4ed8" stroke-width="2.2" points="${pts.join(" ")}"/>`;
        if (vpy >= 10 && vpy <= H - 10) {
            content += `<circle cx="${vpx}" cy="${vpy}" r="3.5" fill="#dc2626"/>`;
            content += `<text x="${vpx + 6}" y="${vpy + 4}" font-size="11" font-weight="bold" fill="#dc2626">I(${vx.toFixed(1).replace(/\.0$/, "")}; ${vy.toFixed(1).replace(/\.0$/, "")})</text>`;
        }
    } else if (cfg.type === "line") {
        const a = Number(cfg.a) || 1, b = Number(cfg.b) || 0;
        content += drawAxes();
        const x1 = -7, y1 = a * x1 + b;
        const x2 = 7, y2 = a * x2 + b;
        content += `<line x1="${cx + x1 * scale}" y1="${cy - y1 * scale}" x2="${cx + x2 * scale}" y2="${cy - y2 * scale}" stroke="#0d9488" stroke-width="2.2"/>`;
    } else if (cfg.type === "ineq") {
        const a = Number(cfg.a) || 1, b = Number(cfg.b) || 1, c = Number(cfg.c) || 0;
        const op = cfg.op || "<=";
        content += drawAxes();
        for (let gx = -7; gx <= 7; gx += 0.5) {
            for (let gy = -5; gy <= 5; gy += 0.5) {
                const val = a * gx + b * gy;
                const ok = op.includes("<") ? val <= c : val >= c;
                if (ok) {
                    content += `<circle cx="${cx + gx * scale}" cy="${cy - gy * scale}" r="1.6" fill="#93c5fd" opacity="0.65"/>`;
                }
            }
        }
        if (Math.abs(b) > 0.001) {
            const x1 = -7, y1 = (c - a * x1) / b;
            const x2 = 7, y2 = (c - a * x2) / b;
            const dash = (op === "<" || op === ">") ? `stroke-dasharray="5,4"` : "";
            content += `<line x1="${cx + x1 * scale}" y1="${cy - y1 * scale}" x2="${cx + x2 * scale}" y2="${cy - y2 * scale}" stroke="#1d4ed8" stroke-width="2" ${dash}/>`;
        }
    } else if (cfg.type === "triangle") {
        const ab = Number(cfg.AB) || 5, ac = Number(cfg.AC) || 6;
        const rad = ((Number(cfg.angleA) || 60) * Math.PI) / 180;
        const s = Math.min(180 / Math.max(ab, ac, 5), 28);
        const Ax = 65, Ay = 190;
        const Cx = Ax + ac * s, Cy = Ay;
        const Bx = Ax + ab * Math.cos(rad) * s, By = Ay - ab * Math.sin(rad) * s;

        content += `
            <polygon points="${Ax},${Ay} ${Bx.toFixed(1)},${By.toFixed(1)} ${Cx.toFixed(1)},${Cy}" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>
            <text x="${Ax - 14}" y="${Ay + 14}" font-size="13" font-weight="bold" fill="#0f172a">A</text>
            <text x="${Bx - 4}" y="${By - 8}" font-size="13" font-weight="bold" fill="#0f172a">B</text>
            <text x="${Cx + 6}" y="${Cy + 14}" font-size="13" font-weight="bold" fill="#0f172a">C</text>
            <text x="${(Ax + Bx) / 2 - 22}" y="${(Ay + By) / 2}" font-size="11" font-weight="bold" fill="#0369a1">${ab}</text>
            <text x="${(Ax + Cx) / 2 - 6}" y="${Ay + 15}" font-size="11" font-weight="bold" fill="#0369a1">${ac}</text>
            <text x="${Ax + 18}" y="${Ay - 8}" font-size="11" font-weight="bold" fill="#dc2626">${cfg.angleA || 60}°</text>
        `;
    }

    const caption = cfg.label ? `<div class="text-center text-xs font-semibold text-slate-600 mt-1">${escapeHtml(cfg.label)}</div>` : "";
    return `<div class="my-2.5 p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm inline-block max-w-full">
        <svg viewBox="0 0 ${W} ${H}" class="w-full max-w-[320px] h-auto mx-auto block">${content}</svg>
        ${caption}
    </div>`;
}

function formatAiResponse(text) {
    const plotBlocks = [];
    const NEWLINE = String.fromCharCode(10);

    let processed = text.replace(/```mathplot\s*([\s\S]*?)```/gi, (_, jsonStr) => {
        const idx = plotBlocks.length;
        try {
            const cfg = JSON.parse(jsonStr.trim());
            plotBlocks.push(renderMathPlotSVG(cfg));
        } catch (e) {
            plotBlocks.push("");
        }
        return `__PLOT_BLOCK_${idx}__`;
    });

    processed = processed.replace(/```svg\s*([\s\S]*?)```/gi, (_, svgCode) => {
        const idx = plotBlocks.length;
        plotBlocks.push(`<div class="my-2 p-2 bg-white border border-slate-200 rounded-xl flex justify-center overflow-x-auto shadow-sm">${svgCode.trim()}</div>`);
        return `__PLOT_BLOCK_${idx}__`;
    });

    processed = processed
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .split(NEWLINE).join("<br>");

    plotBlocks.forEach((html, idx) => {
        processed = processed.replace(`__PLOT_BLOCK_${idx}__`, html);
    });

    return processed;
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

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

// ==================== HIỂN THỊ & MỞ ĐỀ THI WORD TỪ MÃ QR CỦA GIÁO VIÊN ====================
function renderTeacherUploadedExamsForStudent() {
    const exams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
    const banner = document.getElementById("teacherExamsBanner");
    const listEl = document.getElementById("studentTeacherExamsList");
    if (!banner || !listEl || exams.length === 0) return;

    banner.classList.remove("hidden");
    listEl.innerHTML = exams.map((ex, idx) => `
        <div class="bg-white border border-emerald-200 rounded-lg p-3 flex flex-col justify-between gap-2 shadow-sm">
            <div>
                <span class="text-[11px] font-bold uppercase text-emerald-700">${ex.subject} • Khối ${ex.grade}</span>
                <p class="font-bold text-xs sm:text-sm text-slate-800 mt-0.5">${ex.title}</p>
                <p class="text-[11px] text-slate-500">GV: ${ex.teacher} • ${(ex.questions || []).length} câu</p>
            </div>
            <div class="flex gap-2">
                <button onclick="startTeacherExam(${idx})" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 rounded">Làm bài ngay</button>
                ${ex.fileUrl ? `<a href="${ex.fileUrl}" target="_blank" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded">Tải đề gốc</a>` : ""}
            </div>
        </div>
    `).join("");

    // Tự động mở đề nếu học sinh quét mã QR (?exam=ID)
    const params = new URLSearchParams(window.location.search);
    const targetExamId = params.get("exam");
    if (targetExamId) {
        const foundIdx = exams.findIndex(e => String(e.id) === targetExamId);
        if (foundIdx >= 0) {
            switchTab("practice");
            startTeacherExam(foundIdx);
        }
    }
}

function startTeacherExam(examIdx) {
    const exams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
    const exam = exams[examIdx];
    if (!exam || !Array.isArray(exam.questions) || exam.questions.length === 0) {
        alert("Đề thi này chưa có câu hỏi trắc nghiệm bóc tách, em hãy bấm 'Tải đề gốc' để xem nhé!");
        return;
    }

    currentQuizQuestions = exam.questions.map((q, i) => ({
        id: q.id || `texam_${i}`,
        topicName: exam.title,
        level: "thong_hieu",
        type: "trac_nghiem",
        content: q.content,
        options: q.options || ["A", "B", "C", "D"],
        correct: typeof q.correct === "number" ? q.correct : 0,
        explanation: `Đáp án đúng là ${String.fromCharCode(65 + (q.correct || 0))}.`,
        weakPoint: exam.title
    }));

    renderQuizQuestionsToContainer(exam.title);
}

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

    renderQuizQuestionsToContainer();
}

function renderQuizQuestionsToContainer(customTitle) {
    const container = document.getElementById("quizContainer");
    document.getElementById("quizAnalysisResult").classList.add("hidden");

    if (currentQuizQuestions.length === 0) {
        container.innerHTML = `<div class="bg-white p-6 rounded-xl border border-slate-200 text-center text-sm text-slate-500">Chưa có câu hỏi đúng bộ lọc này. Em hãy chọn "Tất cả mức độ" hoặc "Tất cả dạng câu hỏi" nhé!</div>`;
        return;
    }

    const headerBanner = customTitle ? `<div class="bg-blue-900 text-white px-4 py-3 rounded-xl font-bold text-sm sm:text-base">📝 Đang làm đề: ${customTitle} (${currentQuizQuestions.length} câu)</div>` : "";

    container.innerHTML = headerBanner + currentQuizQuestions.map((q, idx) => {
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
                <input type="text" id="ans_${q.id}" maxlength="8" placeholder="Nhập đáp số (VD: 3.61)" class="border border-slate-300 rounded-lg px-3.5 py-2 text-sm w-64 focus:border-blue-600 focus:outline-none">
            </div>`;
        } else if (q.type === "tu_luan") {
            inputArea = `<div class="mt-3 bg-blue-50 p-3.5 rounded-xl border border-blue-200 space-y-2 text-sm">
                <p class="font-semibold text-blue-900">Gợi ý từng bước suy nghĩ:</p>
                <ul class="list-disc pl-5 text-slate-700 space-y-1">
                    ${(q.steps || []).map(s => `<li>${s}</li>`).join("")}
                </ul>
                <textarea id="ans_${q.id}" rows="2" placeholder="Nhập bài làm tóm tắt của em vào đây..." class="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white mt-2"></textarea>
            </div>`;
        }

        return `
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" id="card_${q.id}">
                <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span class="font-bold text-blue-700 uppercase">Câu ${idx + 1} • ${q.topicName}</span>
                    <span class="bg-slate-100 px-2 py-0.5 rounded">${q.level}</span>
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
    logLearningActivity("practice_quiz", `Luyện tập (${correctCount}/${total} câu đúng)`, score, weakTopics.join(", "));
}

function logLearningActivity(type, title, score, weakPoints) {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    logs.unshift({
        student_code: currentStudent?.student_code || "GUEST",
        type,
        title,
        score,
        weak_points: weakPoints,
        timestamp: new Date().toLocaleString("vi-VN")
    });
    localStorage.setItem("dakia_learning_logs", JSON.stringify(logs.slice(0, 100)));
}

function loadProgressTab() {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const code = currentStudent?.student_code || "GUEST";
    const myLogs = logs.filter(l => l.student_code === code);
    const scored = myLogs.filter(l => l.score !== null && l.score !== undefined);
    const avg = scored.length > 0 ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1) : "--";

    if (document.getElementById("progName")) {
        document.getElementById("progName").textContent = currentStudent ? `${currentStudent.full_name} (${currentStudent.class_name})` : "Khách tự do";
        document.getElementById("progSolved").textContent = myLogs.length;
        document.getElementById("progAvgScore").textContent = avg;
        document.getElementById("progMode").textContent = currentStudent?.is_weak_mode ? "Hỗ trợ HS yếu" : "Tiêu chuẩn";
    }

    const listEl = document.getElementById("learningHistoryList");
    if (listEl && myLogs.length > 0) {
        listEl.innerHTML = myLogs.slice(0, 15).map(l => `
            <div class="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap justify-between items-center gap-2">
                <div>
                    <span class="font-semibold text-slate-800">${l.title}</span>
                    ${l.weak_points ? `<span class="block text-xs text-red-600">Cần ôn lại: ${l.weak_points}</span>` : ""}
                </div>
                <div class="text-right text-xs">
                    ${l.score !== null ? `<strong class="text-teal-700 text-sm">${l.score} điểm</strong><br>` : ""}
                    <span class="text-slate-400">${l.timestamp}</span>
                </div>
            </div>
        `).join("");
    }
}

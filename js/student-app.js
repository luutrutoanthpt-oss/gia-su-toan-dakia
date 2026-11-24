let currentStudent = JSON.parse(localStorage.getItem("dakia_student")) || null;
let chatHistory = [];
let selectedImageBase64 = null;
let currentQuizQuestions = [];

document.addEventListener("DOMContentLoaded", () => {
    updateStudentUI();
    renderTopics("10");
    startPracticeQuiz();
    renderMathInElementSafe(document.body);
    initClipboardImagePaste();
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
    if (tabName === "progress" && typeof loadProgressTab === "function") loadProgressTab();
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

    const gradeEl = document.getElementById("tutorGradeSelect");
    const grade = gradeEl ? gradeEl.value : "10";
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
        const op = cfg

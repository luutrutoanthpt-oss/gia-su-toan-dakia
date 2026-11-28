async function streamDirectFromVietnamClient(keyList, payloadObj, onDeltaText) {
    const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];
    let lastErr = "Không thể kết nối trực tiếp tới Google AI.";

    for (let i = 0; i < models.length; i++) {
        const key = keyList[i % keyList.length];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
        const directRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadObj)
        });

        if (directRes.ok && directRes.body) {
            const reader = directRes.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buf = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop();
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.slice(6).trim();
                        if (!dataStr || dataStr === "[DONE]") continue;
                        try {
                            const parsed = JSON.parse(dataStr);
                            const delta = (parsed.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
                            if (delta) onDeltaText(delta);
                        } catch (_) {}
                    }
                }
            }
            return;
        }
        lastErr = `Lỗi AI (${directRes.status}): ${(await directRes.text()).slice(0, 200)}`;
    }
    throw new Error(lastErr);
}

async function handleSendTutor() {
    const inputEl = document.getElementById("tutorPromptInput");
    const msg = inputEl.value.trim();
    if (!msg && !currentAttachedImage) return;

    const subject = document.getElementById("tutorSubjectSelect").value;
    const grade = document.getElementById("tutorGradeSelect").value;
    const isWeak = document.getElementById("weakModeCheckbox").checked;
    const box = document.getElementById("tutorMessagesContainer");
    const btn = document.getElementById("btnSendPrompt");

    const userRow = document.createElement("div");
    userRow.className = "flex justify-end";
    const userBubble = document.createElement("div");
    userBubble.className = "max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 text-sm shadow-xs space-y-2";
    if (currentAttachedImage) {
        const img = document.createElement("img");
        img.src = currentAttachedImage;
        img.className = "max-h-44 rounded-lg border border-blue-300";
        userBubble.appendChild(img);
    }
    const pUser = document.createElement("p");
    pUser.className = "whitespace-pre-wrap";
    pUser.textContent = msg || "Em nhờ Thầy (Cô) hướng dẫn bài tập trong ảnh này.";
    userBubble.appendChild(pUser);
    userRow.appendChild(userBubble);
    box.appendChild(userRow);
    renderKatexInElement(pUser);

    const aiRow = document.createElement("div");
    aiRow.className = "flex justify-start";
    const aiBubble = document.createElement("div");
    aiBubble.className = "max-w-[92%] bg-slate-50 border-l-4 border-blue-600 text-slate-800 rounded-r-2xl px-4 py-3.5 text-sm shadow-xs";
    aiBubble.innerHTML = `<div class="dot-pulse"><span></span><span></span><span></span></div>`;
    aiRow.appendChild(aiBubble);
    box.appendChild(aiRow);
    box.scrollTop = box.scrollHeight;

    const imgPayload = currentAttachedImage;
    inputEl.value = "";
    clearAttachedImg();
    btn.disabled = true;

    const activeKey = resolveActiveGeminiKey();
    let fullText = "";
    let lastRenderTime = 0;

    const handleDelta = (delta) => {
        fullText += delta;
        const now = Date.now();
        if (now - lastRenderTime > 160) {
            lastRenderTime = now;
            const streamPreview = fullText
                .replace(/\[\[\s*(?:PLOT|SHAPE3D):[\s\S]*$/i, "\n⏳ Đang dựng hình minh họa...")
                .replace(/<svg[\s\S]*$/i, "\n⏳ Đang dựng hình...");
            aiBubble.innerHTML = `<div class="space-y-1 text-slate-800">${markdownTextToHtml(streamPreview)}</div>`;
            box.scrollTop = box.scrollHeight;
        }
    };

    try {
        const res = await fetch("/api/tutor", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(activeKey ? { "x-gemini-key": activeKey } : {})
            },
            body: JSON.stringify({
                message: `[Môn ${subject} - Lớp ${grade}] ${msg || "Hướng dẫn giải chi tiết bài tập trong ảnh."}`,
                grade,
                isWeakMode: isWeak,
                imageBase64: imgPayload || undefined,
                history: chatConversationHistory.slice(-2),
                mode: "student_tutor",
                apiKey: activeKey
            })
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({ error: "Không kết nối được máy chủ AI" }));
            const serverKeys = Array.isArray(errJson.keys) && errJson.keys.length > 0
                ? errJson.keys
                : (activeKey ? [activeKey] : []);

            // Nếu nút máy chủ Cloudflare bị định tuyến qua vùng Google chặn -> tự động gọi thẳng từ IP Việt Nam của thiết bị
            if ((errJson.locationBlocked || String(errJson.error || "").includes("User location is not supported")) && serverKeys.length > 0) {
                const sysPrompt = `Gia sư AI Trường THPT Đa Kia, xưng "Thầy (Cô)", gọi học sinh "em". Bám sát SGK Kết nối tri thức Lớp ${grade}.
${isWeak ? "Chế độ HỖ TRỢ NỀN TẢNG: giải thích cực kỳ ngắn gọn, dễ hiểu, nhắc công thức cơ bản rồi gợi mở bước đầu tiên." : "Trả lời súc tích, rõ từng bước, không dài dòng."}
Quy tắc công thức & hình vẽ:
- Công thức đặt trong $...$.
- KHÔNG tự viết thẻ <svg> bằng tay.
- Khi vẽ ĐỒ THỊ HÀM SỐ $y = f(x)$, xuất đúng 1 dòng: [[PLOT: biểu_thức | xmin=-4 | xmax=4 | ymin=-2 | ymax=6 | points=(x1,y1);(x2,y2)]]
- Khi vẽ HÌNH HỌC KHÔNG GIAN 3D, xuất đúng 1 dòng: [[SHAPE3D: loại_hình | labels=tên_đỉnh | altitude=chân_đường_cao | extra=nét_thêm]]`;

                const directParts = [];
                if (imgPayload) {
                    const m = imgPayload.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
                    if (m) directParts.push({ inlineData: { mimeType: m[1], data: m[2] } });
                }
                directParts.push({ text: `[Môn ${subject} - Lớp ${grade}] ${msg || "Hướng dẫn giải chi tiết bài tập trong ảnh."}` });

                const shuffled = [...serverKeys].sort(() => Math.random() - 0.5);
                await streamDirectFromVietnamClient(shuffled, {
                    systemInstruction: { parts: [{ text: sysPrompt }] },
                    contents: [{ role: "user", parts: directParts }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
                }, handleDelta);
            } else {
                throw new Error(errJson.error || "Không kết nối được máy chủ AI");
            }
        } else {
            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let sseBuffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split("\n");
                sseBuffer = lines.pop();
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.slice(6).trim();
                        if (!dataStr || dataStr === "[DONE]") continue;
                        try {
                            const parsed = JSON.parse(dataStr);
                            const delta = (parsed.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
                            if (delta) handleDelta(delta);
                        } catch (_) {}
                    }
                }
            }
        }

        renderAiMessageWithSvg(aiBubble, fullText);
        box.scrollTop = box.scrollHeight;

        chatConversationHistory.push({ role: "user", text: msg });
        chatConversationHistory.push({ role: "model", text: fullText });
        recordStudentProgress(`Học với Gia sư AI (${subject} ${grade})`, null);
    } catch (err) {
        aiBubble.textContent = "❌ " + err.message;
    } finally {
        btn.disabled = false;
    }
}

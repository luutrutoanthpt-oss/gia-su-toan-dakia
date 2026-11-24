let cachedFlashModels = null;

async function getAvailableFlashModels(apiKey) {
    if (cachedFlashModels && cachedFlashModels.length > 0) {
        return cachedFlashModels;
    }

    const fallbackModels = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-3.8-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.7-flash"
    ];

    try {
        const isUnifiedKey = apiKey.startsWith("AQ.");
        const url = isUnifiedKey
            ? "https://generativelanguage.googleapis.com/v1beta/models"
            : `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const headers = isUnifiedKey ? { "x-goog-api-key": apiKey } : {};

        const res = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(3500)
        });

        if (!res.ok) return fallbackModels;

        const data = await res.json();
        const valid = (data.models || [])
            .filter(m =>
                Array.isArray(m.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes("generateContent") &&
                m.name.includes("gemini-") &&
                m.name.includes("flash") &&
                !m.name.includes("2.0") &&
                !m.name.includes("1.5") &&
                !m.name.includes("tts") &&
                !m.name.includes("audio") &&
                !m.name.includes("image") &&
                !m.name.includes("thinking")
            )
            .map(m => m.name.replace("models/", ""))
            .sort((a, b) => {
                const score = name =>
                    (name.includes("lite") ? 10 : 0) +
                    (name.includes("2.5") ? 8 : name.includes("3.8") ? 7 : name.includes("3.7") ? 6 : 1);
                return score(b) - score(a);
            });

        if (valid.length > 0) {
            cachedFlashModels = valid;
            return valid;
        }
    } catch (_) {}

    return fallbackModels;
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const rawKeys = (env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
    if (rawKeys.length === 0) {
        return new Response(JSON.stringify({ error: "Chưa cấu hình GEMINI_API_KEY trên Cloudflare" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { message, imageBase64, grade = "10", isWeakMode = false, history = [] } = body;

        const systemInstruction = `Gia Sư Toán AI – THPT Đa Kia. Hướng dẫn HS lớp ${grade} (KNTT) giải từng bước nhỏ, ngắn gọn bằng tiếng Việt, gợi mở, không đưa ngay đáp án cuối. Công thức đặt trong $...$. ${isWeakMode ? "Chế độ HS yếu: chia siêu nhỏ từng bước, cho 1 ví dụ tương tự cực dễ trước." : ""}
QUY TẮC VẼ HÌNH BẮT BUỘC: Khi đề bài nhắc đến vẽ đồ thị, parabol, đường thẳng, bất phương trình/miền nghiệm hoặc tam giác, BẮT BUỘC chèn đúng 1 khối \`\`\`mathplot ở cuối câu trả lời, JSON viết gọn trên CÙNG 1 DÒNG DUY NHẤT:
\`\`\`mathplot
{"type":"parabola","a":1,"b":-2,"c":-3,"label":"y = x^2 - 2x - 3"}
\`\`\`
Các mẫu hợp lệ khác (thay đúng hệ số của đề bài):
- Đường thẳng: \`\`\`mathplot\n{"type":"line","a":2,"b":-1,"label":"y = 2x - 1"}\n\`\`\`
- Miền nghiệm BPT: \`\`\`mathplot\n{"type":"ineq","a":1,"b":2,"c":4,"op":"<=","label":"x + 2y <= 4"}\n\`\`\`
- Tam giác: \`\`\`mathplot\n{"type":"triangle","AB":5,"AC":7,"angleA":60,"label":"Tam giác ABC"}\n\`\`\``;

        const contents = (Array.isArray(history) ? history : []).slice(-4).map(t => ({
            role: t.role === "model" ? "model" : "user",
            parts: [{ text: t.text }]
        }));

        const currentParts = [{ text: message || "Thầy hướng dẫn giúp em bài này từng bước ạ!" }];
        if (imageBase64 && imageBase64.startsWith("data:image")) {
            const [meta, base64Data] = imageBase64.split(",");
            const mimeType = (meta.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/) || [])[1] || "image/jpeg";
            currentParts.push({ inlineData: { mimeType, data: base64Data } });
        }
        contents.push({ role: "user", parts: currentParts });

        const pickedKeys = [...rawKeys].sort(() => Math.random() - 0.5).slice(0, 2);
        const models = await getAvailableFlashModels(pickedKeys[0]);
        const logs = [];

        for (const apiKey of pickedKeys) {
            const isUnifiedKey = apiKey.startsWith("AQ.");
            const headers = { "Content-Type": "application/json" };
            if (isUnifiedKey) headers["x-goog-api-key"] = apiKey;

            for (const model of models) {
                const generationConfig = {
                    temperature: 0.3,
                    maxOutputTokens: 2000
                };
                if (model.includes("2.5")) {
                    generationConfig.thinkingConfig = { thinkingBudget: 0 };
                } else {
                    generationConfig.thinkingConfig = { thinkingLevel: "low" };
                }

                const url = isUnifiedKey
                    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`
                    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

                // Chỉ giới hạn thời gian chờ phản hồi đầu tiên (6s), hủy bộ đếm ngay khi bắt đầu chạy chữ
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 6000);

                try {
                    const res = await fetch(url, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: systemInstruction }] },
                            contents,
                            generationConfig
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timer);

                    if (res.ok && res.body) {
                        return new Response(res.body, {
                            status: 200,
                            headers: {
                                "Content-Type": "text/event-stream; charset=utf-8",
                                "Cache-Control": "no-cache"
                            }
                        });
                    }

                    const errData = await res.json().catch(() => ({}));
                    logs.push(`${model}(${res.status}): ${errData.error?.message || "Lỗi"}`);
                    if (res.status === 429 || res.status === 400 || res.status === 403) break;
                } catch (_) {
                    clearTimeout(timer);
                    logs.push(`${model}(timeout)`);
                }
            }
        }

        return new Response(JSON.stringify({
            error: `Máy chủ Google đang quá tải hoặc hết lượt. Chi tiết: ${logs.slice(0, 3).join(" | ")}`
        }), {
            status: 502,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

let cachedFlashModels = null;

async function getAvailableFlashModels(apiKey) {
    if (cachedFlashModels && cachedFlashModels.length > 0) {
        return cachedFlashModels;
    }

    const fallbackModels = [
        "gemini-3.8-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.7-flash-lite",
        "gemini-3.7-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash"
    ];

    try {
        const isUnifiedKey = apiKey.startsWith("AQ.");
        const url = isUnifiedKey
            ? "https://generativelanguage.googleapis.com/v1beta/models"
            : `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const headers = isUnifiedKey ? { "x-goog-api-key": apiKey } : {};

        const res = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(3000)
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
            // Ưu tiên bản lite và đời mới nhất lên đầu để phản hồi nhanh nhất
            .sort((a, b) => {
                const score = name =>
                    (name.includes("lite") ? 10 : 0) +
                    (name.includes("3.8") ? 8 : name.includes("3.7") ? 7 : name.includes("2.5") ? 5 : 1);
                return score(b) - score(a);
            });

        if (valid.length > 0) {
            cachedFlashModels = valid;
            return valid;
        }
    } catch (_) {
        // Bỏ qua nếu quá 3s và dùng danh sách dự phòng
    }

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
Khi có hàm số, BPT hoặc tam giác, chèn 1 khối JSON trong \`\`\`mathplot ... \`\`\`:
- Parabol: \`\`\`mathplot {"type":"parabola","a":1,"b":-2,"c":-3,"label":"y = x^2 - 2x - 3"} \`\`\`
- Đường thẳng: \`\`\`mathplot {"type":"line","a":2,"b":-1,"label":"y = 2x - 1"} \`\`\`
- Miền nghiệm BPT: \`\`\`mathplot {"type":"ineq","a":1,"b":2,"c":4,"op":"<=","label":"x + 2y <= 4"} \`\`\`
- Tam giác: \`\`\`mathplot {"type":"triangle","AB":5,"AC":7,"angleA":60,"label":"Tam giác ABC"} \`\`\``;

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

        // Chọn tối đa 2 Key ngẫu nhiên để phản hồi tức thì, tránh treo vòng lặp dài
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
                }

                const url = isUnifiedKey
                    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`
                    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

                try {
                    const res = await fetch(url, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: systemInstruction }] },
                            contents,
                            generationConfig
                        }),
                        signal: AbortSignal.timeout(5000)
                    });

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
                    logs.push(`${model}(timeout 5s)`);
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

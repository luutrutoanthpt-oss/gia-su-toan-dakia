export async function onRequestPost(context) {
    const { request, env } = context;
    const apiKey = env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
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

        // Đưa thẳng các model phản hồi tức thì (< 0.8s) lên đầu, không chạy vòng lặp thừa
        const models = [
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-3.1-pro-preview",
            "gemini-3.8-flash"
        ];
        let lastError = "";

        for (const model of models) {
            const generationConfig = {
                temperature: 0.3,
                maxOutputTokens: 2500
            };

            // Tắt suy nghĩ ngầm trên 2.5 và giảm mức suy nghĩ xuống tối thiểu trên 3.1-pro để nhả chữ ngay lập tức
            if (model.includes("2.5")) {
                generationConfig.thinkingConfig = { thinkingBudget: 0 };
            } else if (model.includes("3.1-pro")) {
                generationConfig.thinkingConfig = { thinkingLevel: "low" };
            }

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents,
                    generationConfig
                })
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
            lastError = `[${model}]: ${errData.error?.message || res.status}`;
        }

        return new Response(JSON.stringify({
            error: `Hệ thống AI đang bận, em bấm Gửi lại nhé! (${lastError})`
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

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

        const systemInstruction = `Bạn là Gia Sư Toán AI – Trường THPT Đa Kia, hướng dẫn học sinh lớp ${grade} (GDPT 2018, Kết nối tri thức) giải Toán từng bước ngắn gọn, súc tích, gợi mở từng bước nhỏ, không đưa ngay đáp án cuối. Công thức đặt trong dấu $...$. ${isWeakMode ? "Chế độ HS yếu: chia siêu nhỏ từng bước, cho 1 ví dụ tương tự cực dễ trước." : ""}
QUY TẮC VẼ HÌNH TỨC THÌ (BẮT BUỘC DÙNG KHI CÓ HÀM SỐ, BPT HOẶC TAM GIÁC):
Chỉ chèn 1 khối lệnh JSON gọn nhẹ đặt trong \`\`\`mathplot ... \`\`\` theo đúng 1 trong 4 mẫu sau:
1. Parabol y = ax^2 + bx + c: \`\`\`mathplot {"type":"parabola","a":1,"b":-2,"c":-3,"label":"y = x^2 - 2x - 3"} \`\`\`
2. Đường thẳng y = ax + b: \`\`\`mathplot {"type":"line","a":2,"b":-1,"label":"y = 2x - 1"} \`\`\`
3. Miền nghiệm BPT ax + by <= c (hoặc >=, <, >): \`\`\`mathplot {"type":"ineq","a":1,"b":2,"c":4,"op":"<=","label":"x + 2y <= 4"} \`\`\`
4. Tam giác ABC: \`\`\`mathplot {"type":"triangle","AB":5,"AC":7,"angleA":60,"label":"Tam giác ABC"} \`\`\``;

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

        // Đa tuyến model: Flash -> Pro -> Gemma (khác hàng đợi, chống quá tải giờ cao điểm)
        const fastModels = [
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-3.8-flash-lite",
            "gemini-3.8-flash",
            "gemini-2.5-pro",
            "gemma-3-27b-it"
        ];
        let lastError = "";

        for (const model of fastModels) {
            const isGemma = model.startsWith("gemma");
            const finalContents = isGemma
                ? [{ role: "user", parts: [{ text: systemInstruction + "\n\n" + (message || "") }] }]
                : contents;

            const payload = {
                contents: finalContents,
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 900
                }
            };

            if (!isGemma) {
                payload.systemInstruction = { parts: [{ text: systemInstruction }] };
            }
            if (model.includes("2.5-flash")) {
                payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
            }

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
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

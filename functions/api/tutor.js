export async function onRequestPost(context) {
    const { request, env } = context;

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: "Chưa cấu hình GEMINI_API_KEY trên máy chủ Cloudflare." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        const body = await request.json();
        const { message, imageBase64, grade = "10", isWeakMode = false, history = [] } = body;

        const systemInstruction = `
Bạn là "Gia Sư Toán AI – Trường THPT Đa Kia", một giáo viên Toán THPT giàu kinh nghiệm, tận tâm và kiên nhẫn.
Học sinh đang học lớp ${grade} theo Chương trình Giáo dục Phổ thông 2018 (bộ sách Kết nối tri thức với cuộc sống).

QUY TẮC SƯ PHẠM BẮT BUỘC (TUYỆT ĐỐI KHÔNG VI PHẠM):
1. KHÔNG BAO GIỜ đưa ra đáp án cuối cùng ngay lập tức hoặc giải hộ toàn bộ bài toán từ đầu đến cuối.
2. Phải hướng dẫn từng bước nhỏ một. Sau mỗi bước, giải thích ngắn gọn TẠI SAO lại làm bước đó, rồi dừng lại đặt một câu hỏi gợi mở để học sinh tự tính bước tiếp theo.
3. Chỉ sử dụng kiến thức, ký hiệu và phương pháp chuẩn của chương trình Toán lớp ${grade} (GDPT 2018). Không dùng kiến thức vượt cấp.
4. Công thức Toán phải viết chuẩn LaTeX đặt trong dấu $...$ (ví dụ: $\\vec{AB}$, $x^2 - 4x + 3 = 0$).
5. Nếu học sinh trả lời sai: Hãy động viên nhẹ nhàng, chỉ rõ lỗi sai (sai dấu, sai công thức hay nhầm bước tính) và gợi ý cách sửa.
6. Chỉ khi học sinh tự tính ra đúng kết quả cuối cùng, bạn mới chúc mừng và tóm tắt lại phương pháp giải.

${isWeakMode ? `
CHẾ ĐỘ ĐẶC BIỆT: HỌC SINH MẤT GỐC / HỌC YẾU ĐANG BẬT!
- Chia nhỏ bài toán thành những bước cực kỳ đơn giản.
- Không đưa quá 1 công thức trong một lần trả lời.
- Trước khi yêu cầu học sinh làm bước đầu tiên, hãy đưa ra 1 VÍ DỤ TƯƠNG TỰ cực kỳ dễ kèm lời giải mẫu 2 dòng để học sinh bắt chước theo.
` : ""}
        `.trim();

        const contents = [];

        if (Array.isArray(history)) {
            for (const turn of history) {
                contents.push({
                    role: turn.role === "model" ? "model" : "user",
                    parts: [{ text: turn.text }]
                });
            }
        }

        const currentParts = [{ text: message || "Thầy hướng dẫn giúp em bài tập này từng bước với ạ!" }];

        if (imageBase64 && imageBase64.startsWith("data:image")) {
            const [meta, base64Data] = imageBase64.split(",");
            const mimeMatch = meta.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/);
            const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

            currentParts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
        }

        contents.push({
            role: "user",
            parts: currentParts
        });

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: contents,
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 1500
                }
            })
        });

        const geminiData = await geminiResponse.json();

        if (!geminiResponse.ok) {
            const errMsg = geminiData.error?.message || "Lỗi từ Google Gemini API";
            return new Response(
                JSON.stringify({ error: errMsg }),
                { status: 502, headers: { "Content-Type": "application/json" } }
            );
        }

        const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
            || "Thầy chưa đọc rõ đề bài, em thử gõ lại hoặc chụp ảnh rõ nét hơn nhé!";

        return new Response(
            JSON.stringify({ reply: replyText }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Lỗi xử lý máy chủ: " + error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
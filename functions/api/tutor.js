export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { message, grade = "10", isWeakMode = false, mode = "student_tutor", pdfBase64 = "" } = body;

    if (!message && !pdfBase64) {
      return new Response(JSON.stringify({ error: "Thiếu nội dung yêu cầu" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const rawKeys = (env.GEMINI_API_KEY || "")
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);

    if (rawKeys.length === 0) {
      return new Response(JSON.stringify({ error: "Chưa cấu hình GEMINI_API_KEY trên Cloudflare Pages" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const apiKeys = [...rawKeys].sort(() => Math.random() - 0.5);

    let systemInstruction = "";
    let maxTokens = 4096;
    let temperature = 0.4;

    if (mode === "teacher_5512") {
      maxTokens = 8192;
      temperature = 0.35;
      systemInstruction = `Bạn là Chuyên gia sư phạm và Tổ trưởng chuyên môn cấp THPT (bộ sách Kết nối tri thức với cuộc sống).
Hãy soạn Kế hoạch bài dạy (KHBD) chuẩn Công văn 5512/BGDĐT-GDTrH thật chi tiết, đầy đủ từ đầu đến cuối, KHÔNG được tóm tắt hay cắt bớt:
- Phải viết trọn vẹn cả 4 phần:
  I. MỤC TIÊU (1. Về kiến thức; 2. Về năng lực: Năng lực đặc thù, Năng lực chung, Năng lực số theo Thông tư 02/2025/TT-BGDĐT; 3. Về phẩm chất).
  II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU (Giáo viên: máy chiếu/TV, phiếu học tập, phần mềm/AI; Học sinh: SGK Kết nối tri thức, bảng con/thẻ màu).
  III. TIẾN TRÌNH DẠY HỌC (Đủ 4 hoạt động: Hoạt động 1. Mở đầu; Hoạt động 2. Hình thành kiến thức mới; Hoạt động 3. Luyện tập; Hoạt động 4. Vận dụng. Trong MỖI hoạt động bắt buộc trình bày rõ 4 mục: a) Mục tiêu; b) Nội dung; c) Sản phẩm; d) Tổ chức thực hiện theo 4 bước: Chuyển giao nhiệm vụ -> Thực hiện nhiệm vụ -> Báo cáo, thảo luận -> Kết luận, nhận định).
  IV. PHIẾU HỌC TẬP & CÂU HỎI TỰ HỌC VỚI AI Ở NHÀ.
- Công thức Toán/Lí/Hóa viết bằng ký hiệu $...$ chuẩn MathType. Trình bày văn bản sạch đẹp, không dùng ký tự thừa.`;
    } else if (mode === "teacher_slides") {
      maxTokens = 8192;
      temperature = 0.3;
      systemInstruction = `Bạn là chuyên gia thiết kế bài giảng PowerPoint 16:9 cho lớp học phổ thông sử dụng 1 máy tính giáo viên chiếu lên TV/máy chiếu (học sinh không dùng điện thoại trên lớp, tương tác qua giơ thẻ màu A/B/C/D hoặc bảng con).
Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ (không bọc trong markdown \`\`\`json) theo đúng cấu trúc:
{
  "title": "Tên bài giảng",
  "slides": [
    {
      "heading": "Tiêu đề slide 1",
      "bullets": ["Ý ngắn gọn 1", "Ý ngắn gọn 2", "Ý ngắn gọn 3"],
      "note": "Ghi chú hoạt động sư phạm cho giáo viên"
    }
  ]
}`;
    } else if (mode === "pdf_to_word") {
      maxTokens = 8192;
      temperature = 0.1;
      systemInstruction = `Bạn là công cụ chuyển đổi đề thi và tài liệu PDF sang văn bản Word chuẩn MathType.
Hãy trích xuất TOÀN BỘ nội dung từ tệp PDF được đính kèm theo đúng thứ tự từ trang đầu đến trang cuối:
- Giữ nguyên mọi công thức Toán, Vật lí, Hóa học dưới dạng ký hiệu LaTeX $...$ (ví dụ: $A(1;2;3)$, $\\vec{u}=(1;-2;3)$, $\\frac{a}{b}$, $\\sqrt{x}$) để phần mềm MathType nhận diện được.
- Không giải thích thêm, chỉ xuất ra nguyên văn nội dung tài liệu đã trích xuất.`;
    } else {
      maxTokens = 4096;
      systemInstruction = isWeakMode
        ? `Bạn là Gia sư AI hỗ trợ học sinh lớp ${grade} (Trường THPT Đa Kia, bộ sách Kết nối tri thức). Học sinh đang bật CHẾ ĐỘ HỖ TRỢ CƠ BẢN: hãy chia lời giải thành từng bước rất nhỏ, giải thích chậm rãi, nhắc lại công thức cơ bản trước khi thay số, dùng ngôn ngữ gần gũi, khích lệ. Công thức đặt trong $...$.`
        : `Bạn là Gia sư AI hỗ trợ học sinh lớp ${grade} (Trường THPT Đa Kia, bộ sách Kết nối tri thức). Hãy gợi mở tư duy, nêu phương pháp giải rõ ràng, trình bày từng bước mạch lạc và có câu hỏi kiểm tra mức độ hiểu bài ở cuối. Công thức đặt trong $...$.`;
    }

    const parts = [];
    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64
        }
      });
    }
    parts.push({ text: message || "Hãy trích xuất toàn bộ nội dung." });

    const requestBody = JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    });

    let lastError = "";
    for (const apiKey of apiKeys) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody
      });

      if (geminiRes.ok) {
        return new Response(geminiRes.body, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      }
      lastError = await geminiRes.text();
    }

    return new Response(JSON.stringify({ error: "Cả 4 API Key đều gặp lỗi: " + lastError }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

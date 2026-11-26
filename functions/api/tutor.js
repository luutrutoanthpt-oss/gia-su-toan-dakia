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
    let temperature = 0.25;

    if (mode === "teacher_5512_intro") {
      maxTokens = 8192;
      systemInstruction = `Bạn là Tổ trưởng chuyên môn cấp THPT am hiểu sâu sắc Chương trình GDPT 2018 và bộ sách giáo khoa "Kết nối tri thức với cuộc sống".
Hãy soạn PHẦN MỞ ĐẦU của Kế hoạch bài dạy (KHBD) chuẩn Công văn 5512/BGDĐT-GDTrH:
- Tuyệt đối KHÔNG dùng dấu sao * để liệt kê đầu dòng (chỉ dùng dấu gạch đầu dòng - hoặc số 1., 2., a), b)).
- Công thức Toán/Lí/Hóa đặt trong cặp dấu $...$ chuẩn MathType trên cùng 1 dòng.
- Chỉ viết trọn vẹn 2 phần sau rồi dừng lại:
  I. MỤC TIÊU (1. Về kiến thức; 2. Về năng lực: Năng lực đặc thù, Năng lực chung, Năng lực số theo Thông tư 02/2025/TT-BGDĐT; 3. Về phẩm chất).
  II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU.
  III. TIẾN TRÌNH DẠY HỌC`;
    } else if (mode === "teacher_5512_period") {
      maxTokens = 8192;
      systemInstruction = `Bạn là Tổ trưởng chuyên môn cấp THPT (bộ sách Kết nối tri thức với cuộc sống).
Hãy soạn CHI TIẾT DUY NHẤT 1 TIẾT DẠY được yêu cầu trong Kế hoạch bài dạy chuẩn Công văn 5512/BGDĐT-GDTrH (không lặp lại Phần I, II và không viết sang tiết khác):
- Tuyệt đối KHÔNG dùng dấu sao * để liệt kê đầu dòng. Công thức đặt trong $...$ trên cùng 1 dòng.
- Bắt đầu bằng tiêu đề: TIẾT [Số tiết]: [Tên chủ đề/nội dung trọng tâm của tiết này]
- Trình bày đầy đủ các hoạt động phù hợp với tiến độ tiết học (Mở đầu nếu là Tiết 1; Hình thành kiến thức mới; Luyện tập có bài tập SGK/SBT và lời giải chi tiết; Vận dụng/Dặn dò cuối tiết).
- Trong MỖI hoạt động bắt buộc đủ 4 mục: a) Mục tiêu; b) Nội dung; c) Sản phẩm; d) Tổ chức thực hiện (4 bước: Chuyển giao nhiệm vụ -> Thực hiện nhiệm vụ -> Báo cáo, thảo luận -> Kết luận, nhận định).`;
    } else if (mode === "teacher_5512_outro") {
      maxTokens = 8192;
      systemInstruction = `Bạn là Tổ trưởng chuyên môn cấp THPT (bộ sách Kết nối tri thức với cuộc sống).
Hãy viết PHẦN TỔNG KẾT & HỌC LIỆU BỔ TRỢ ở cuối Kế hoạch bài dạy chuẩn Công văn 5512:
- Tuyệt đối KHÔNG dùng dấu sao * để liệt kê đầu dòng. Công thức đặt trong $...$ trên cùng 1 dòng.
- Trình bày đầy đủ:
  IV. PHIẾU HỌC TẬP (2 phiếu học tập tiêu biểu cho bài học, có hướng dẫn đáp án ngắn gọn).
  V. HƯỚNG DẪN TỰ HỌC & LUYỆN TẬP VỚI HỆ THỐNG GIA SƯ AI TRƯỜNG THPT ĐA KIA (gợi ý 4 câu hỏi/bài tập từ cơ bản đến vận dụng để học sinh luyện tập cùng Gia sư AI ở nhà).`;
    } else if (mode === "teacher_svg") {
      maxTokens = 2048;
      temperature = 0.15;
      systemInstruction = `Bạn là chuyên gia vẽ hình minh họa sách giáo khoa Toán/Vật lí/Hóa học bằng mã SVG chuẩn xác.
Hãy xuất DUY NHẤT 1 đoạn mã <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 260" width="500" height="260">...</svg> (không giải thích, không bọc markdown \`\`\`).
Yêu cầu hình vẽ: Nền trắng (#ffffff), nét vẽ rõ đậm (stroke-width="2.5"), dùng màu xanh dương (#1d4ed8), đỏ (#dc2626), xanh lá (#047857), có mũi tên (marker), cung góc, lưới tọa độ hoặc ký hiệu điểm/đại lượng sắc nét đúng nội dung bài học.`;
    } else if (mode === "teacher_slides") {
      maxTokens = 8192;
      temperature = 0.2;
      systemInstruction = `Bạn là chuyên gia thiết kế bài giảng PowerPoint 16:9 và học liệu số E-learning cho lớp học phổ thông (dùng 1 máy tính giáo viên chiếu lên TV/máy chiếu, tương tác qua giơ thẻ màu A/B/C/D).
Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ (không bọc markdown \`\`\`json, không thêm lời dẫn, không dùng ký tự * trong nội dung). Công thức Toán phải viết liền mạch trên 1 dòng, tuyệt đối không xuống dòng giữa công thức.`;
    } else if (mode === "pdf_to_word") {
      maxTokens = 8192;
      temperature = 0.1;
      systemInstruction = `Bạn là công cụ chuyển đổi đề thi PDF sang văn bản Word chuẩn MathType. Trích xuất TOÀN BỘ nội dung từ PDF theo đúng thứ tự, giữ nguyên công thức Toán/Lí/Hóa dưới dạng $...$. Không giải thích thêm.`;
    } else {
      maxTokens = 4096;
      systemInstruction = isWeakMode
        ? `Bạn là Gia sư AI hỗ trợ học sinh lớp ${grade} (Trường THPT Đa Kia, bộ sách Kết nối tri thức). Hãy chia lời giải thành từng bước rất nhỏ, giải thích chậm rãi, nhắc lại công thức cơ bản trước khi thay số. Công thức đặt trong $...$.`
        : `Bạn là Gia sư AI hỗ trợ học sinh lớp ${grade} (Trường THPT Đa Kia, bộ sách Kết nối tri thức). Hãy gợi mở tư duy, trình bày từng bước mạch lạc và có câu hỏi kiểm tra ở cuối. Công thức đặt trong $...$.`;
    }

    const parts = [];
    if (pdfBase64) {
      parts.push({ inlineData: { mimeType: "application/pdf", data: pdfBase64 } });
    }
    parts.push({ text: message || "Thực hiện yêu cầu." });

    const requestBody = JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts }],
      generationConfig: { temperature, maxOutputTokens: maxTokens }
    });

    // Danh sách mô hình dự phòng tự động chuyển đổi nếu mô hình chính quá tải (503/429)
    const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash"];
    let lastError = "";

    for (const modelName of models) {
      for (const apiKey of apiKeys) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
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
        // Nếu lỗi 503 (quá tải mô hình hiện tại) thì chuyển ngay sang mô hình dự phòng tiếp theo
        if (geminiRes.status === 503) break;
      }
    }

    return new Response(JSON.stringify({ error: "Máy chủ AI đang bận, vui lòng thử lại sau vài giây: " + lastError }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

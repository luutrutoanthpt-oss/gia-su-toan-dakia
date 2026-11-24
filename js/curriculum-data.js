// Dữ liệu chương trình Toán THPT - Chương trình GDPT 2018 (Sách Kết nối tri thức)
const CURRICULUM_DATA = {
    "10": [
        {
            id: "10_c1",
            title: "Chương I: Mệnh đề và Tập hợp",
            summary: `
                <p><strong>1. Mệnh đề:</strong> Là câu khẳng định có tính đúng hoặc sai (không thể vừa đúng vừa sai). Mệnh đề chứa biến chỉ xác định tính đúng/sai khi gán giá trị cụ thể cho biến.</p>
                <p><strong>2. Phủ định của mệnh đề $P$:</strong> Ký hiệu $\\overline{P}$. Phủ định của $\\forall x \\in X, P(x)$ là $\\exists x \\in X, \\overline{P(x)}$.</p>
                <p><strong>3. Các phép toán tập hợp:</strong></p>
                <ul class="list-disc pl-5 space-y-1">
                    <li>Giao: $A \\cap B = \\{x \\mid x \\in A \\text{ và } x \\in B\\}$</li>
                    <li>Hợp: $A \\cup B = \\{x \\mid x \\in A \\text{ hoặc } x \\in B\\}$</li>
                    <li>Hiệu: $A \\setminus B = \\{x \\mid x \\in A \\text{ và } x \\notin B\\}$</li>
                </ul>
            `,
            formulas: [
                "A \\subset B \\Leftrightarrow (\\forall x, x \\in A \\Rightarrow x \\in B)",
                "C_E A = E \\setminus A \\quad (\\text{khi } A \\subset E)",
                "n(A \\cup B) = n(A) + n(B) - n(A \\cap B)"
            ],
            example: {
                problem: "Cho hai tập hợp $A = [-2; 4)$ và $B = (1; 6]$. Tìm $A \\cap B$ và $A \\cup B$.",
                solution: "Biểu diễn trên trục số: Phần chung của hai tập hợp là khoảng $(1; 4)$, nên $A \\cap B = (1; 4)$. Gộp hai tập hợp lại ta được $A \\cup B = [-2; 6]$."
            }
        },
        {
            id: "10_c2",
            title: "Chương II: Bất phương trình và Hệ BPT bậc nhất hai ẩn",
            summary: `
                <p><strong>1. Bất phương trình bậc nhất hai ẩn:</strong> Có dạng $ax + by \\le c$ (hoặc $<, \\ge, >$) trong đó $a, b$ không đồng thời bằng $0$.</p>
                <p><strong>2. Cách biểu diễn miền nghiệm:</strong></p>
                <ul class="list-disc pl-5 space-y-1">
                    <li>Bước 1: Vẽ đường thẳng $d: ax + by = c$.</li>
                    <li>Bước 2: Lấy điểm $M_0(x_0; y_0)$ không nằm trên $d$ (thường chọn $O(0;0)$ nếu $c \\ne 0$).</li>
                    <li>Bước 3: Thay tọa độ $M_0$ vào BPT. Nếu đúng thì nửa mặt phẳng chứa $M_0$ là miền nghiệm.</li>
                </ul>
            `,
            formulas: [
                "ax + by \\le c \\quad (a^2 + b^2 \\ne 0)",
                "F(x; y) = ax + by \\text{ đạt GTLN, GTNN tại các đỉnh của miền đa giác nghiệm.}"
            ],
            example: {
                problem: "Điểm $M(1; -1)$ có thuộc miền nghiệm của bất phương trình $2x - 3y > 4$ không?",
                solution: "Thay $x = 1, y = -1$ vào vế trái ta được: $2(1) - 3(-1) = 2 + 3 = 5 > 4$ (đúng). Vậy $M(1; -1)$ thuộc miền nghiệm."
            }
        },
        {
            id: "10_c3",
            title: "Chương III: Hệ thức lượng trong tam giác",
            summary: `
                <p>Cho tam giác $ABC$ có $BC = a, AC = b, AB = c$, bán kính đường tròn ngoại tiếp $R$, nội tiếp $r$, nửa chu vi $p = \\frac{a+b+c}{2}$.</p>
                <p><strong>1. Định lí Côsin:</strong> Dùng khi biết hai cạnh và góc xen giữa, hoặc biết ba cạnh để tính góc.</p>
                <p><strong>2. Định lí Sin:</strong> Dùng khi biết một cạnh và hai góc, hoặc tìm bán kính $R$.</p>
            `,
            formulas: [
                "a^2 = b^2 + c^2 - 2bc\\cos A",
                "\\cos A = \\frac{b^2 + c^2 - a^2}{2bc}",
                "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R",
                "S = \\frac{1}{2}ab\\sin C = pr = \\sqrt{p(p-a)(p-b)(p-c)}"
            ],
            example: {
                problem: "Cho $\\triangle ABC$ có $b = 4, c = 5$ và $\\widehat{A} = 60^\\circ$. Tính cạnh $a$.",
                solution: "Áp dụng định lí Côsin: $a^2 = b^2 + c^2 - 2bc\\cos A = 4^2 + 5^2 - 2\\cdot 4\\cdot 5\\cdot \\cos 60^\\circ = 16 + 25 - 20 = 21 \\Rightarrow a = \\sqrt{21}$."
            }
        },
        {
            id: "10_c4",
            title: "Chương IV: Vectơ",
            summary: `
                <p><strong>1. Khái niệm:</strong> Vectơ là một đoạn thẳng có hướng. Hai vectơ cùng phương nếu giá của chúng song song hoặc trùng nhau.</p>
                <p><strong>2. Quy tắc cộng, trừ:</strong> Quy tắc ba điểm $\\vec{AB} + \\vec{BC} = \\vec{AC}$; Quy tắc hiệu $\\vec{OB} - \\vec{OA} = \\vec{AB}$; Quy tắc hình bình hành.</p>
                <p><strong>3. Tích vô hướng:</strong> Cho ra một số thực, dùng để tính góc và chứng minh vuông góc.</p>
            `,
            formulas: [
                "I \\text{ là trung điểm } AB \\Leftrightarrow \\vec{IA} + \\vec{IB} = \\vec{0}",
                "G \\text{ là trọng tâm } \\triangle ABC \\Leftrightarrow \\vec{GA} + \\vec{GB} + \\vec{GC} = \\vec{0}",
                "\\vec{a} \\cdot \\vec{b} = |\\vec{a}| \\cdot |\\vec{b}| \\cdot \\cos(\\vec{a}, \\vec{b})",
                "\\vec{a} \\perp \\vec{b} \\Leftrightarrow \\vec{a} \\cdot \\vec{b} = 0"
            ],
            example: {
                problem: "Cho hình vuông $ABCD$ cạnh $a$. Tính tích vô hướng $\\vec{AB} \\cdot \\vec{AC}$.",
                solution: "Ta có $|\\vec{AB}| = a$, đường chéo $AC = a\\sqrt{2}$, góc $(\\vec{AB}, \\vec{AC}) = 45^\\circ$. Vậy $\\vec{AB} \\cdot \\vec{AC} = a \\cdot a\\sqrt{2} \\cdot \\cos 45^\\circ = a^2$."
            }
        },
        {
            id: "10_c5",
            title: "Chương V: Các số đặc trưng của mẫu số liệu không ghép nhóm",
            summary: `
                <p><strong>1. Số trung bình ($\\overline{x}$):</strong> Tổng các giá trị chia cho kích thước mẫu $n$.</p>
                <p><strong>2. Trung vị ($M_e$):</strong> Sắp xếp mẫu không giảm. Nếu $n$ lẻ thì $M_e$ là số chính giữa; nếu $n$ chẵn thì $M_e$ là trung bình cộng hai số chính giữa.</p>
                <p><strong>3. Tứ phân vị:</strong> Gồm $Q_1, Q_2 (= M_e), Q_3$ chia mẫu thành 4 phần bằng nhau. Khoảng tứ phân vị $\\Delta_Q = Q_3 - Q_1$.</p>
            `,
            formulas: [
                "\\overline{x} = \\frac{x_1 + x_2 + \\dots + x_n}{n}",
                "\\Delta_Q = Q_3 - Q_1",
                "s^2 = \\frac{1}{n}\\sum_{i=1}^n (x_i - \\overline{x})^2 \\quad (\\text{Phương sai}), \\quad s = \\sqrt{s^2} \\quad (\\text{Độ lệch chuẩn})"
            ],
            example: {
                problem: "Tìm trung vị của mẫu số liệu: $3; 7; 2; 9; 5$.",
                solution: "Sắp xếp tăng dần: $2; 3; 5; 7; 9$. Mẫu có $5$ số (lẻ), số chính giữa là $5$. Vậy $M_e = 5$."
            }
        },
        {
            id: "10_c6",
            title: "Chương VI: Hàm số, Đồ thị và Ứng dụng",
            summary: `
                <p><strong>1. Tập xác định của hàm số:</strong> Biểu thức dưới dấu căn bậc chẵn $\\ge 0$; mẫu thức $\\ne 0$.</p>
                <p><strong>2. Hàm số bậc hai $y = ax^2 + bx + c$ ($a \\ne 0$):</strong> Đồ thị là Parabol có đỉnh $I\\left(-\\frac{b}{2a}; -\\frac{\\Delta}{4a}\\right)$, trục đối xứng $x = -\\frac{b}{2a}$.</p>
                <p><strong>3. Dấu tam thức bậc hai:</strong> Xét $\\Delta = b^2 - 4ac$ để xác định khoảng cùng dấu hay trái dấu với hệ số $a$.</p>
            `,
            formulas: [
                "x_I = -\\frac{b}{2a}, \\quad y_I = f(x_I)",
                "\\Delta < 0 \\Rightarrow a \\cdot f(x) > 0, \\; \\forall x \\in \\mathbb{R}"
            ],
            example: {
                problem: "Tìm tọa độ đỉnh của Parabol $(P): y = x^2 - 4x + 3$.",
                solution: "Hoành độ đỉnh $x_I = -\\frac{-4}{2\\cdot 1} = 2$. Thay $x = 2$ vào hàm số: $y_I = 2^2 - 4(2) + 3 = -1$. Vậy đỉnh $I(2; -1)$."
            }
        },
        {
            id: "10_c7",
            title: "Chương VII: Phương pháp tọa độ trong mặt phẳng",
            summary: `
                <p><strong>1. Tọa độ vectơ:</strong> Cho $A(x_A; y_A), B(x_B; y_B) \\Rightarrow \\vec{AB} = (x_B - x_A; y_B - y_A)$.</p>
                <p><strong>2. Phương trình đường thẳng:</strong> Đi qua $M_0(x_0; y_0)$ và có VTPT $\\vec{n}=(a;b)$ có dạng $a(x-x_0) + b(y-y_0) = 0$.</p>
                <p><strong>3. Phương trình đường tròn:</strong> Tâm $I(a;b)$, bán kính $R$: $(x - a)^2 + (y - b)^2 = R^2$.</p>
            `,
            formulas: [
                "\\vec{u} \\cdot \\vec{v} = x_1x_2 + y_1y_2",
                "d(M_0, \\Delta) = \\frac{|ax_0 + by_0 + c|}{\\sqrt{a^2 + b^2}}",
                "R = \\sqrt{a^2 + b^2 - c} \\quad (\\text{với } x^2 + y^2 - 2ax - 2by + c = 0)"
            ],
            example: {
                problem: "Tính khoảng cách từ điểm $M(1; 2)$ đến đường thẳng $\\Delta: 3x + 4y - 1 = 0$.",
                solution: "$d(M, \\Delta) = \\frac{|3(1) + 4(2) - 1|}{\\sqrt{3^2 + 4^2}} = \\frac{|3 + 8 - 1|}{5} = \\frac{10}{5} = 2$."
            }
        },
        {
            id: "10_c8",
            title: "Chương VIII & IX: Đại số tổ hợp và Xác suất",
            summary: `
                <p><strong>1. Quy tắc đếm:</strong> Quy tắc cộng (các phương án độc lập) và Quy tắc nhân (các công đoạn liên tiếp).</p>
                <p><strong>2. Hoán vị - Chỉnh hợp - Tổ hợp:</strong> Hoán vị sắp xếp tất cả $n$ phần tử; Chỉnh hợp chọn $k$ phần tử có thứ tự; Tổ hợp chọn $k$ phần tử không phân biệt thứ tự.</p>
                <p><strong>3. Xác suất cổ điển:</strong> $P(A) = \\frac{n(A)}{n(\\Omega)}$ với $0 \\le P(A) \\le 1$.</p>
            `,
            formulas: [
                "P_n = n! = 1 \\cdot 2 \\cdots n",
                "A_n^k = \\frac{n!}{(n-k)!}, \\quad C_n^k = \\frac{n!}{k!(n-k)!}",
                "P(A) = \\frac{n(A)}{n(\\Omega)}, \\quad P(\\overline{A}) = 1 - P(A)"
            ],
            example: {
                problem: "Lớp 10A8 có 20 nam và 27 nữ. Có bao nhiêu cách chọn 1 học sinh làm lớp trưởng?",
                solution: "Áp dụng quy tắc cộng: Có $20 + 27 = 47$ cách chọn."
            }
        }
    ],
    "11": [
        {
            id: "11_c1",
            title: "Chương I: Hàm số lượng giác và Phương trình lượng giác",
            summary: `<p>Góc lượng giác, giá trị lượng giác của góc lượng giác, công thức cộng, công thức nhân đôi và phương trình lượng giác cơ bản ($\\sin x = m, \\cos x = m, \\tan x = m, \\cot x = m$).</p>`,
            formulas: ["\\sin^2 x + \\cos^2 x = 1", "\\sin 2x = 2\\sin x\\cos x", "\\cos 2x = \\cos^2 x - \\sin^2 x"],
            example: { problem: "Giải phương trình $\\sin x = \\frac{1}{2}$.", solution: "$\\sin x = \\sin\\frac{\\pi}{6} \\Leftrightarrow x = \\frac{\\pi}{6} + k2\\pi$ hoặc $x = \\frac{5\\pi}{6} + k2\\pi$ ($k \\in \\mathbb{Z}$)." }
        },
        {
            id: "11_c2",
            title: "Chương II: Dãy số. Cấp số cộng và Cấp số nhân",
            summary: `<p>Cấp số cộng có $u_{n+1} = u_n + d$. Cấp số nhân có $u_{n+1} = u_n \\cdot q$.</p>`,
            formulas: ["u_n = u_1 + (n-1)d", "S_n = \\frac{n(u_1 + u_n)}{2}", "u_n = u_1 \\cdot q^{n-1}"],
            example: { problem: "Cho CSC có $u_1 = 3, d = 4$. Tìm $u_5$.", solution: "$u_5 = u_1 + 4d = 3 + 4(4) = 19$." }
        },
        {
            id: "11_c3",
            title: "Chương III & IV: Giới hạn. Hàm số liên tục & Quan hệ song song trong không gian",
            summary: `<p>Giới hạn dãy số, giới hạn hàm số, hàm số liên tục và cách chứng minh đường thẳng song song mặt phẳng, hai mặt phẳng song song.</p>`,
            formulas: ["\\lim_{x \\to \\infty} \\frac{1}{x^k} = 0 \\; (k > 0)", "d \\parallel (P) \\Leftrightarrow d \\not\\subset (P) \\text{ và } d \\parallel d' \\subset (P)"],
            example: { problem: "Tính $\\lim_{n \\to +\\infty} \\frac{2n+1}{n-3}$.", solution: "Chia cả tử và mẫu cho $n$: $\\lim \\frac{2 + 1/n}{1 - 3/n} = 2$." }
        },
        {
            id: "11_c4",
            title: "Chương VI, VII, IX: Mũ - Logarit, Quan hệ vuông góc và Đạo hàm",
            summary: `<p>Lũy thừa với số mũ thực, Logarit, đường thẳng vuông góc mặt phẳng, góc giữa đường và mặt, quy tắc tính đạo hàm.</p>`,
            formulas: ["\\log_a(xy) = \\log_a x + \\log_a y", "(x^n)' = n x^{n-1}", "(\\sin x)' = \\cos x"],
            example: { problem: "Tính đạo hàm của hàm số $y = x^3 - 2x + 5$.", solution: "$y' = 3x^2 - 2$." }
        }
    ],
    "12": [
        {
            id: "12_c1",
            title: "Chương I: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số",
            summary: `<p>Tính đơn điệu, cực trị của hàm số, giá trị lớn nhất - nhỏ nhất trên đoạn $[a;b]$, đường tiệm cận đứng, tiệm cận ngang và tiệm cận xiên.</p>`,
            formulas: ["y' > 0 \\text{ trên } K \\Rightarrow \\text{Hàm số đồng biến trên } K", "y = ax + b \\text{ là TCX nếu } \\lim_{x \\to \\infty}[f(x)-(ax+b)] = 0"],
            example: { problem: "Tìm tiệm cận ngang của đồ thị $y = \\frac{2x-1}{x+1}$.", solution: "$\\lim_{x \\to \\pm\\infty} y = 2 \\Rightarrow$ TCN là $y = 2$." }
        },
        {
            id: "12_c2",
            title: "Chương II & V: Vectơ và Phương pháp tọa độ trong không gian Oxyz",
            summary: `<p>Tọa độ điểm, tọa độ vectơ trong không gian, tích có hướng, phương trình mặt phẳng, đường thẳng và mặt cầu trong hệ trục $Oxyz$.</p>`,
            formulas: ["\\vec{u}\\cdot\\vec{v} = x_1x_2 + y_1y_2 + z_1z_2", "(P): A(x-x_0) + B(y-y_0) + C(z-z_0) = 0"],
            example: { problem: "Tìm tọa độ trung điểm $I$ của $A(1;2;3)$ và $B(3;4;5)$.", solution: "$I\\left(\\frac{1+3}{2}; \\frac{2+4}{2}; \\frac{3+5}{2}\\right) = (2; 3; 4)$." }
        },
        {
            id: "12_c3",
            title: "Chương IV: Nguyên hàm và Tích phân",
            summary: `<p>Bảng nguyên hàm cơ bản, tích phân xác định và ứng dụng tính diện tích hình phẳng, thể tích khối tròn xoay.</p>`,
            formulas: ["\\int_a^b f(x)dx = F(b) - F(a)", "S = \\int_a^b |f(x) - g(x)|dx", "V = \\pi \\int_a^b [f(x)]^2 dx"],
            example: { problem: "Tính tích phân $I = \\int_0^2 2x\\,dx$.", solution: "$I = \\left. x^2 \\right|_0^2 = 2^2 - 0^2 = 4$." }
        }
    ]
};

// Ngân hàng câu hỏi luyện tập chuẩn cấu trúc GDPT 2018 (4 dạng: Trắc nghiệm, Đúng/Sai, Trả lời ngắn, Tự luận)
const PRACTICE_QUESTIONS = [
    {
        id: "q1",
        grade: "10",
        topicId: "10_c1",
        topicName: "Mệnh đề và Tập hợp",
        level: "nhan_biet",
        type: "trac_nghiem",
        content: "Phủ định của mệnh đề $P$: \"$\\forall x \\in \\mathbb{R}, x^2 + 1 > 0$\" là mệnh đề nào sau đây?",
        options: [
            "$\\exists x \\in \\mathbb{R}, x^2 + 1 \\le 0$",
            "$\\exists x \\in \\mathbb{R}, x^2 + 1 < 0$",
            "$\\forall x \\in \\mathbb{R}, x^2 + 1 \\le 0$",
            "$\\exists x \\in \\mathbb{R}, x^2 + 1 > 0$"
        ],
        correct: 0,
        explanation: "Phủ định của ký hiệu $\\forall$ là $\\exists$, và phủ định của dấu $>$ là $\\le$. Do đó $\\overline{P}$ là \"$\\exists x \\in \\mathbb{R}, x^2 + 1 \\le 0$\".",
        weakPoint: "Quy tắc phủ định mệnh đề chứa ký hiệu $\\forall, \\exists$"
    },
    {
        id: "q2",
        grade: "10",
        topicId: "10_c4",
        topicName: "Vectơ",
        level: "nhan_biet",
        type: "trac_nghiem",
        content: "Cho ba điểm phân biệt $A, B, C$. Đẳng thức nào sau đây **đúng**?",
        options: [
            "$\\vec{AB} + \\vec{BC} = \\vec{AC}$",
            "$\\vec{AB} + \\vec{AC} = \\vec{BC}$",
            "$\\vec{AB} - \\vec{AC} = \\vec{BC}$",
            "$\\vec{CA} + \\vec{CB} = \\vec{AB}$"
        ],
        correct: 0,
        explanation: "Theo quy tắc ba điểm phép cộng vectơ: $\\vec{AB} + \\vec{BC} = \\vec{AC}$.",
        weakPoint: "Quy tắc ba điểm trong phép cộng và trừ vectơ"
    },
    {
        id: "q3",
        grade: "10",
        topicId: "10_c4",
        topicName: "Vectơ",
        level: "thong_hieu",
        type: "dung_sai",
        content: "Cho tam giác $ABC$ đều cạnh bằng $2$, có $M$ là trung điểm của $BC$. Xét tính đúng sai của các khẳng định sau:",
        subQuestions: [
            { text: "a) Độ dài vectơ $\\vec{AB}$ bằng $2$.", answer: true },
            { text: "b) $\\vec{MB} + \\vec{MC} = \\vec{0}$.", answer: true },
            { text: "c) Góc giữa hai vectơ $\\vec{AB}$ và $\\vec{AC}$ bằng $120^\\circ$.", answer: false },
            { text: "d) Tích vô hướng $\\vec{AB} \\cdot \\vec{AC} = 2$.", answer: true }
        ],
        explanation: "a) Đúng vì $AB = 2$. b) Đúng vì $M$ là trung điểm $BC$. c) Sai vì $\\triangle ABC$ đều nên $(\\vec{AB}, \\vec{AC}) = \\widehat{BAC} = 60^\\circ$. d) Đúng vì $\\vec{AB}\\cdot\\vec{AC} = 2\\cdot 2\\cdot \\cos 60^\\circ = 2$.",
        weakPoint: "Xác định góc giữa hai vectơ chung gốc và tính tích vô hướng"
    },
    {
        id: "q4",
        grade: "10",
        topicId: "10_c3",
        topicName: "Hệ thức lượng trong tam giác",
        level: "thong_hieu",
        type: "tra_loi_ngan",
        content: "Cho tam giác $ABC$ có $AB = 3$, $AC = 4$ và $\\widehat{BAC} = 60^\\circ$. Tính độ dài cạnh $BC$ (làm tròn kết quả đến hàng phần trăm).",
        correctText: "3.61",
        explanation: "Áp dụng định lí Côsin: $BC^2 = AB^2 + AC^2 - 2\\cdot AB\\cdot AC\\cdot \\cos 60^\\circ = 9 + 16 - 2\\cdot 3\\cdot 4\\cdot 0.5 = 13 \\Rightarrow BC = \\sqrt{13} \\approx 3.61$.",
        weakPoint: "Áp dụng định lí Côsin để tính độ dài cạnh trong tam giác"
    },
    {
        id: "q5",
        grade: "10",
        topicId: "10_c4",
        topicName: "Vectơ",
        level: "van_dung",
        type: "tu_luan",
        content: "Cho hình bình hành $ABCD$ có tâm $O$. Chứng minh rằng với điểm $M$ bất kì, ta luôn có: $\\vec{MA} + \\vec{MB} + \\vec{MC} + \\vec{MD} = 4\\vec{MO}$.",
        steps: [
            "Bước 1: Vì $O$ là tâm hình bình hành $ABCD$, $O$ là trung điểm của hai đường chéo nào?",
            "Bước 2: Áp dụng quy tắc trung điểm cho $O$ với đoạn $AC$ và đoạn $BD$, ta có $\\vec{MA} + \\vec{MC} = ?$ và $\\vec{MB} + \\vec{MD} = ?$",
            "Bước 3: Cộng vế theo vế hai đẳng thức trên để suy ra điều phải chứng minh."
        ],
        explanation: "Vì $O$ là trung điểm $AC$ và $BD$ nên $\\vec{MA} + \\vec{MC} = 2\\vec{MO}$ và $\\vec{MB} + \\vec{MD} = 2\\vec{MO}$. Cộng vế theo vế: $\\vec{MA} + \\vec{MB} + \\vec{MC} + \\vec{MD} = 4\\vec{MO}$.",
        weakPoint: "Sử dụng tính chất trung điểm để biến đổi đẳng thức vectơ"
    },
    {
        id: "q6",
        grade: "10",
        topicId: "10_c5",
        topicName: "Các số đặc trưng của mẫu số liệu",
        level: "nhan_biet",
        type: "tra_loi_ngan",
        content: "Điểm kiểm tra Toán của 6 học sinh tổ 1 lớp 10A8 lần lượt là: $6; 7; 7; 8; 9; 10$. Tìm trung vị của mẫu số liệu trên.",
        correctText: "7.5",
        explanation: "Mẫu đã sắp xếp tăng dần có $6$ số (chẵn). Hai số đứng giữa là $7$ và $8$. Trung vị $M_e = \\frac{7+8}{2} = 7.5$.",
        weakPoint: "Tính trung vị khi kích thước mẫu là số chẵn"
    }
];
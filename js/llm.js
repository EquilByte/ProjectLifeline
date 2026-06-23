/**
 * Project Lifeline - Gemini LLM Integration
 * Runs purely on the client-side via fetch API.
 */

class GeminiLLM {
  constructor() {
    const tokenMeta = document.querySelector('meta[name="csrf-token"]');
    const token = tokenMeta ? tokenMeta.content : "";

    try {
      this.authSignature = atob(token).split('').reverse().join('');
    } catch (e) {
      this.authSignature = '';
      console.error("Failed to decode auth token.");
    }

    this.model = 'gemini-3.1-flash-lite';
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models`;
  }

  hasAuth() {
    return this.authSignature && this.authSignature.trim().length > 0;
  }

  async callApi(systemPrompt, messages, temperature = 0.3, responseFormat = null, previousInteractionId = null, store = false) {
    if (!this.hasAuth()) throw new Error("Auth Signature is missing.");

    let contents = [];
    if (typeof messages === 'string') {
      contents = [{ role: 'user', parts: [{ text: messages }] }];
    } else if (Array.isArray(messages)) {
      contents = messages;
    } else {
      contents = [messages];
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: contents,
      generationConfig: {
        temperature: temperature
      }
    };

    if (responseFormat) {
      payload.generationConfig.responseMimeType = responseFormat.mime_type || "application/json";
      if (responseFormat.schema) {
        payload.generationConfig.responseSchema = responseFormat.schema;
      }
    }

    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.authSignature}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`LLM API Error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No model output found in the API response.");
    }

    return {
      text: text,
      interactionId: null
    };
  }

  parseJson(rawText) {
    try {
      const match = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[1] || match[0]);
      }
      return JSON.parse(rawText);
    } catch (e) {
      console.error("JSON parse failed on:", rawText);
      return null;
    }
  }

  async extractSlots(transcriptText, currentSlots) {
    const systemPrompt = `Bạn là hệ thống AI trích xuất thông tin khẩn cấp từ cuộc gọi cứu hộ tại TP. Hồ Chí Minh, Việt Nam (mặc định các địa điểm đều ở TP.HCM trừ khi người gọi nhắc đến tỉnh/thành khác).

NHIỆM VỤ: Phân tích đoạn hội thoại và trích xuất thông tin cấu trúc dưới dạng JSON.

BẠN PHẢI trích xuất các loại thông tin sau:
1. location — Vị trí sự cố
2. incident_type — Loại sự cố
3. casualties — Số nạn nhân và tình trạng
4. dispatch — Khuyến nghị lực lượng cần điều động (police, fire, ems)
5. requires_human_dispatcher — Cuộc gọi nhạy cảm/ẩn ý cần chuyển người điều phối
6. is_non_emergency — Cuộc gọi đùa giỡn, spam hoặc không phải tình huống khẩn cấp

QUY TẮC:
- Chỉ trích xuất thông tin THỰC SỰ được nói trong hội thoại. KHÔNG tự bịa.
- Nếu không có thông tin, để null hoặc false.
- RẤT QUAN TRỌNG CHO VỊ TRÍ: Trích xuất tên đường, điểm mốc phải NGẮN GỌN và CHÍNH XÁC. Chỉ lấy tên chính thức (Vd: "Ga Metro Bến Thành", KHÔNG lấy "Lối ra số 1, Ga Metro Bến Thành"). Chú ý lỗi phát âm (Vd: "sa la" là Khu đô thị Sala ở TP.HCM, không tự sửa thành Xa La ở Hà Nội).
- TUYỆT ĐỐI KHÔNG trích xuất các danh từ chung chung không kèm tên riêng cụ thể (Vd: "công viên", "sông", "tòa nhà", "tòa nhà cao tầng", "trường học", "bệnh viện", "quán cà phê", "nhà ga", "ngã tư", "ngã ba") vào landmark, street, hay osm_query. Đối với các danh từ chung chung không rõ tên riêng này, hãy đặt landmark, street và osm_query là null hoặc rỗng để hệ thống biết cần hỏi thêm thông tin vị trí cụ thể (ví dụ: công viên tên gì, tòa nhà tên gì). Chỉ trích xuất khi người gọi cung cấp tên riêng cụ thể (Vd: "công viên Bến Bạch Đằng", "tòa nhà Landmark 81").
- TUYỆT ĐỐI KHÔNG tự suy đoán hay bịa ra tọa độ latitude và longitude. Luôn để null trừ khi người gọi đọc chính xác từng con số tọa độ GPS.
- Đặc biệt, hãy tạo ra trường "osm_query" là một chuỗi địa chỉ tối ưu hóa chuẩn xác nhất dành riêng cho bản đồ bằng cách dùng tên chính thức và tên thành phố (Vd: "Khu công nghiệp Tân Tạo, Bình Tân, Hồ Chí Minh").
- ĐỊNH VỊ ĐẶC BIỆT: Nếu người gọi nhắc đến What3Words (3 từ, vd: ///mèo.táo.chó hoặc "mã ba chữ là..."), lưu vào "w3w" và BẮT BUỘC định dạng là "từ1.từ2.từ3" (ngăn cách bằng dấu chấm, loại bỏ các chữ thừa như "và"). Nếu cung cấp Plus Code (vd: 7P28XG22+22), lưu vào "plus_code" (bỏ khoảng trắng).
- RẤT QUAN TRỌNG (SỬA LỖI NGỮ ÂM STT): Hệ thống nhận diện giọng nói (STT) rất hay nghe nhầm mã định vị. VÍ DỤ: "mã ba chữ" bị nghe thành "ngã ba chữ"; "bãi cỏ" thành "phải có"; Plus Code "QMGG" thành "quy mờ mờ gờ" hoặc "qmg tập". BẠN PHẢI sử dụng tư duy ngữ âm (phonetics) tiếng Việt để TỰ ĐỘNG SỬA LỖI chính tả từ văn bản bị sai thành 3 từ W3W có nghĩa hợp lý, hoặc chuyển đổi cách đọc chữ cái thành ký tự Plus Code chính xác trước khi trích xuất.
- is_critical = true nếu nạn nhân trong tình trạng nguy hiểm tính mạng.
- requires_human_dispatcher = true nếu cuộc gọi có tính chất nhạy cảm, ẩn ý, người gọi đang gặp nguy hiểm trực tiếp không thể nói tự do và phải giả vờ nói chuyện khác để che giấu. BẤT KỲ CUỘC GỌI NÀO tới số khẩn cấp mà giả vờ đặt đồ ăn, gọi đồ uống (ví dụ: đặt pizza, mua trà sữa, order trà cú Chino, order Cappuchino, order cà phê...), gọi xe taxi/grab, đặt phòng khách sạn, thuê phòng/nhà, đặt vé xe/máy bay, hỏi dịch vụ sửa chữa dân dụng (như sửa ống nước, sửa điện, sửa internet/khóa...), hoặc giả vờ gọi điện nói chuyện với người thân/bạn bè đều là CUỘC GỌI ẨN Ý CẦU CỨU (covert call) của người đang bị đe dọa trực tiếp.
- is_non_emergency = true nếu cuộc gọi rõ ràng không liên quan đến bất kỳ sự cố khẩn cấp thực tế nào (Vd: người gọi đang đùa giỡn, trêu chọc, hỏi toán học như "2 + 2 bằng mấy", nhờ làm bài tập về nhà, hỏi chuyện phiếm, nói chuyện không liên quan đến cứu hộ/an ninh/y tế). LƯU Ý: Nếu cuộc gọi là dạng nói ẩn ý/giả vờ đặt dịch vụ/đồ ăn/đồ uống/đặt phòng/gọi thợ sửa chữa để cầu cứu (covert call), thì đây là một cuộc gọi khẩn cấp thực tế cực kỳ nguy cấp, lúc này requires_human_dispatcher PHẢI là true, và is_non_emergency BẮT BUỘC phải là false.
- dispatch: Khuyến nghị điều động các lực lượng (police: Cảnh sát, fire: Cứu hỏa/Cứu nạn, ems: Cấp cứu y tế) đặt thành true nếu loại sự cố tương ứng yêu cầu họ (Vd: cháy cần fire; tai nạn giao thông cần ems và police; xả súng/bạo lực cần police; đột quỵ cần ems).
- RẤT QUAN TRỌNG: "incident_type" PHẢI là loại sự cố CỤ THỂ (Vd: "cháy", "tai nạn", "đột quỵ", "cướp"). Nếu người gọi nói chung chung (Vd: "tôi gặp sự cố", "có chuyện"), BẮT BUỘC để null để hệ thống tiếp tục hỏi rõ.

VÍ DỤ MINH HỌA TRÍCH XUẤT:

Ví dụ 1 (Cuộc gọi khẩn cấp thông thường):
Hội thoại:
"[NGƯỜI GỌI]: Có tai nạn giao thông ở ngã tư Nguyễn Đình Chiểu cắt Cách Mạng Tháng 8, có 2 người bị thương nặng lắm, chảy máu nhiều!"
JSON Trích xuất:
{
  "location": {
    "house_number": null,
    "street": "Nguyễn Đình Chiểu",
    "intersection": "Nguyễn Đình Chiểu cắt Cách Mạng Tháng 8",
    "landmark": null,
    "ward_district": "Quận 3, Hồ Chí Minh",
    "osm_query": "Nguyễn Đình Chiểu cắt Cách Mạng Tháng 8, Quận 3, Hồ Chí Minh",
    "w3w": null,
    "plus_code": null,
    "latitude": null,
    "longitude": null,
    "confidence": 0.95
  },
  "incident_type": { "value": "tai nạn giao thông", "confidence": 0.98 },
  "casualties": { "value": "2 người bị thương nặng, chảy máu nhiều", "confidence": 0.95, "is_critical": true },
  "dispatch": {
    "police": true,
    "fire": false,
    "ems": true
  },
  "requires_human_dispatcher": false,
  "is_non_emergency": false
}

Ví dụ 2 (Cuộc gọi ẩn ý cầu cứu - Covert call):
Hội thoại:
"[NGƯỜI GỌI]: Cho tôi đặt một cái pizza pepperoni đến số 123 Lê Lợi, quận 1. Làm ơn giao nhanh lên nhé, người giao hàng đang đập cửa ngoài phòng."
JSON Trích xuất:
{
  "location": {
    "house_number": "123",
    "street": "Lê Lợi",
    "intersection": null,
    "landmark": null,
    "ward_district": "Quận 1, Hồ Chí Minh",
    "osm_query": "123 Lê Lợi, Quận 1, Hồ Chí Minh",
    "w3w": null,
    "plus_code": null,
    "latitude": null,
    "longitude": null,
    "confidence": 0.95
  },
  "incident_type": { "value": "bạo lực / đột nhập (gọi ẩn ý đặt pizza)", "confidence": 0.9 },
  "casualties": { "value": null, "confidence": 0.0, "is_critical": false },
  "dispatch": {
    "police": true,
    "fire": false,
    "ems": false
  },
  "requires_human_dispatcher": true,
  "is_non_emergency": false
}

Ví dụ 3 (Cuộc gọi đùa giỡn, không khẩn cấp):
Hội thoại:
"[NGƯỜI GỌI]: Alo anh ơi cho em hỏi 5 cộng 5 bằng mấy ạ?"
JSON Trích xuất:
{
  "location": {
    "house_number": null,
    "street": null,
    "intersection": null,
    "landmark": null,
    "ward_district": null,
    "osm_query": null,
    "w3w": null,
    "plus_code": null,
    "latitude": null,
    "longitude": null,
    "confidence": 0.0
  },
  "incident_type": { "value": null, "confidence": 0.0 },
  "casualties": { "value": null, "confidence": 0.0, "is_critical": false },
  "dispatch": {
    "police": false,
    "fire": false,
    "ems": false
  },
  "requires_human_dispatcher": false,
  "is_non_emergency": true
}

Ví dụ 4 (Cuộc gọi ẩn ý đặt đồ uống hoặc đồ ăn - Covert call):
Hội thoại:
"[NGƯỜI GỌI]: Tôi muốn order một ly Cappuchino size lớn"
JSON Trích xuất:
{
  "location": {
    "house_number": null,
    "street": null,
    "intersection": null,
    "landmark": null,
    "ward_district": null,
    "osm_query": null,
    "w3w": null,
    "plus_code": null,
    "latitude": null,
    "longitude": null,
    "confidence": 0.0
  },
  "incident_type": { "value": "bạo lực / đột nhập (gọi ẩn ý order đồ uống)", "confidence": 0.9 },
  "casualties": { "value": null, "confidence": 0.0, "is_critical": false },
  "dispatch": {
    "police": true,
    "fire": false,
    "ems": false
  },
  "requires_human_dispatcher": true,
  "is_non_emergency": false
}

Ví dụ 5 (Cuộc gọi ẩn ý đặt phòng khách sạn - Covert call):
Hội thoại:
"[NGƯỜI GỌI]: Tôi muốn đặt phòng khách sạn"
JSON Trích xuất:
{
  "location": {
    "house_number": null,
    "street": null,
    "intersection": null,
    "landmark": null,
    "ward_district": null,
    "osm_query": null,
    "w3w": null,
    "plus_code": null,
    "latitude": null,
    "longitude": null,
    "confidence": 0.0
  },
  "incident_type": { "value": "bạo lực / đột nhập (gọi ẩn ý đặt phòng khách sạn)", "confidence": 0.9 },
  "casualties": { "value": null, "confidence": 0.0, "is_critical": false },
  "dispatch": {
    "police": true,
    "fire": false,
    "ems": false
  },
  "requires_human_dispatcher": true,
  "is_non_emergency": false
}

Ví dụ 6 (Cuộc gọi ẩn ý gọi thợ sửa chữa - Covert call):
Hội thoại:
"[NGƯỜI GỌI]: Alo, bên sửa ống nước hả? Nhà tôi có sự cố, gửi người đến ngay nhé"
JSON Trích xuất:
{
  "location": {
    "house_number": null,
    "street": null,
    "intersection": null,
    "landmark": null,
    "ward_district": null,
    "osm_query": null,
    "w3w": null,
    "plus_code": null,
    "latitude": null,
    "longitude": null,
    "confidence": 0.0
  },
  "incident_type": { "value": "bạo lực / đột nhập (gọi ẩn ý thợ sửa chữa)", "confidence": 0.9 },
  "casualties": { "value": null, "confidence": 0.0, "is_critical": false },
  "dispatch": {
    "police": true,
    "fire": false,
    "ems": false
  },
  "requires_human_dispatcher": true,
  "is_non_emergency": false
}


ĐỊNH DẠNG OUTPUT (JSON thuần):
{
  "location": {
    "house_number": null,
    "street": null,
    "intersection": null,
    "landmark": null,
    "ward_district": null,
    "osm_query": null,
    "w3w": null,
    "plus_code": null,
    "latitude": null,
    "longitude": null,
    "confidence": 0.0
  },
  "incident_type": { "value": null, "confidence": 0.0 },
  "casualties": { "value": null, "confidence": 0.0, "is_critical": false },
  "dispatch": {
    "police": false,
    "fire": false,
    "ems": false
  },
  "requires_human_dispatcher": false,
  "is_non_emergency": false
}`;

    const userPrompt = `--- Hội thoại hiện tại ---
${transcriptText}

--- Thông tin đã trích xuất trước đó ---
${JSON.stringify(currentSlots, null, 2)}

Dựa trên TOÀN BỘ hội thoại ở trên, hãy cập nhật và trả về JSON hoàn chỉnh. Chỉ trả về JSON thuần.`;

    const responseFormat = {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          location: {
            type: "object",
            properties: {
              house_number: { type: "string" },
              street: { type: "string" },
              intersection: { type: "string" },
              landmark: { type: "string" },
              ward_district: { type: "string" },
              osm_query: { type: "string" },
              w3w: { type: "string" },
              plus_code: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
              confidence: { type: "number" }
            },
            required: ["house_number", "street", "intersection", "landmark", "ward_district", "osm_query", "w3w", "plus_code", "latitude", "longitude", "confidence"]
          },
          incident_type: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" }
            },
            required: ["value", "confidence"]
          },
          casualties: {
            type: "object",
            properties: {
              value: { type: "string" },
              confidence: { type: "number" },
              is_critical: { type: "boolean" }
            },
            required: ["value", "confidence", "is_critical"]
          },
          dispatch: {
            type: "object",
            properties: {
              police: { type: "boolean" },
              fire: { type: "boolean" },
              ems: { type: "boolean" }
            },
            required: ["police", "fire", "ems"]
          },
          requires_human_dispatcher: { type: "boolean" },
          is_non_emergency: { type: "boolean" }
        },
        required: ["location", "incident_type", "casualties", "dispatch", "requires_human_dispatcher", "is_non_emergency"]
      }
    };

    const result = await this.callApi(systemPrompt, userPrompt, 0.1, responseFormat, null, false);
    return this.parseJson(result.text);
  }

  _buildChatHistory(transcriptText) {
    // Simple parser to separate the transcript into roles for the Gemini API array
    const messages = [];
    const lines = transcriptText.split('\n');
    for (const line of lines) {
      if (line.startsWith('[AI]:')) {
        messages.push({ role: 'model', parts: [{ text: line.replace('[AI]:', '').trim() }] });
      } else if (line.startsWith('[NGƯỜI GỌI]:')) {
        messages.push({ role: 'user', parts: [{ text: line.replace('[NGƯỜI GỌI]:', '').trim() }] });
      }
    }
    return messages.length > 0 ? messages : [{ role: 'user', parts: [{ text: transcriptText }] }];
  }

  async generateQuestion(missingType, currentSlots, transcriptText) {
    let contextHint = "Thiếu thông tin.";
    if (missingType === "location") contextHint = "Thiếu hoàn toàn thông tin vị trí. Cần hỏi người gọi đang ở đâu.";
    else if (missingType === "location_detail") {
      const street = (currentSlots.location && currentSlots.location.street) ? currentSlots.location.street : '?';
      contextHint = `Đã có tên đường '${street}' nhưng chưa đủ cụ thể. Cần hỏi về điểm mốc hoặc giao lộ gần đó.`;
    }
    else if (missingType === "incident_type") contextHint = "Chưa biết loại sự cố. Cần hỏi chuyện gì đang xảy ra.";
    else if (missingType === "casualties") contextHint = "Chưa biết tình trạng nạn nhân. Cần hỏi có ai bị thương không.";

    const systemPrompt = `Bạn là AI tổng đài khẩn cấp đang hỗ trợ người gọi trong tình huống nguy hiểm.
NHIỆM VỤ: Sinh ra MỘT câu hỏi ngắn gọn, tự nhiên bằng tiếng Việt để hỏi thông tin còn thiếu.
- KHÔNG hỏi máy móc kiểu "Vui lòng cung cấp số nhà" — người đang hoảng loạn sẽ không trả lời được.
- Nếu thiếu vị trí cụ thể nhưng đã có tên đường: hỏi về ĐIỂM MỐC hoặc GIAO LỘ gần đó.
- Nếu thiếu loại sự cố: hỏi "Chuyện gì đang xảy ra?" một cách bình tĩnh.
- Nếu thiếu thông tin nạn nhân: hỏi "Có ai bị thương không?"
- Giọng điệu: bình tĩnh, chuyên nghiệp, trấn an người gọi.

THÔNG TIN SỰ CỐ ĐÃ CÓ:
${JSON.stringify(currentSlots, null, 2)}

THÔNG TIN BẠN CẦN PHẢI HỎI NGAY BÂY GIỜ: ${contextHint}

Chỉ trả về CÂU HỎI, không có gì khác.`;

    const chatHistory = this._buildChatHistory(transcriptText);
    const result = await this.callApi(systemPrompt, chatHistory, 0.3);
    return {
      text: result.text.trim().replace(/^["']|["']$/g, ''),
      interactionId: null
    };
  }

  async classifySeverity(slots) {
    const systemPrompt = `Bạn là hệ thống AI phân loại mức độ nghiêm trọng của sự cố (Triage).
Đánh giá thông tin sự cố sau và phân loại thành: LOW, MEDIUM, hoặc HIGH.

QUY TẮC:
- HIGH: Nguy hiểm tính mạng, có người bị thương nặng, cháy lớn lan rộng, bạo lực vũ trang, mắc kẹt. (Vd: cháy nhà, tai nạn giao thông nghiêm trọng).
- MEDIUM: Nguy cơ tiềm ẩn, TẤT CẢ CÁC ĐÁM CHÁY ĐANG DIỄN RA (dù là cháy cây hay cháy nhỏ), bạo lực chưa có thương vong, tai nạn không ai bị thương nặng.
- LOW: Không có nguy cơ đe dọa, sự việc đã qua hoàn toàn, chỉ hỏi thăm thông tin. Tuyệt đối không xếp các vụ cháy đang diễn ra vào mức LOW.

Chỉ trả về 1 từ duy nhất: LOW, MEDIUM, hoặc HIGH.`;

    const userPrompt = `THÔNG TIN SỰ CỐ:
${JSON.stringify(slots, null, 2)}

MỨC ĐỘ:`;

    const responseFormat = {
      type: "text",
      mime_type: "text/plain"
    };

    const result = await this.callApi(systemPrompt, userPrompt, 0.1, responseFormat, null, false);
    const text = result.text.toUpperCase();
    if (text.includes("HIGH")) return "HIGH";
    if (text.includes("MEDIUM")) return "MEDIUM";
    return "LOW";
  }

  async generateAgenticResponse(incidentName, guidelines, transcriptText, slots) {
    const systemPrompt = `Bạn là AI Tổng đài khẩn cấp (Dispatcher).
THÔNG TIN HIỆN TẠI:
${JSON.stringify(slots, null, 2)}

HƯỚNG DẪN SƠ CỨU/AN TOÀN (SOP) CHO: ${incidentName}
${JSON.stringify(guidelines, null, 2)}

QUY TẮC PHÁT NGÔN BẮT BUỘC (QUAN TRỌNG):
- Trấn an & Xác nhận điều động: Luôn đan xen các cụm từ ngắn gọn để trấn an hoặc xác nhận lực lượng đang đến (Vd: "Cứu hộ đang đến ngay. Hãy bình tĩnh làm theo tôi:", "Cứu hỏa đã biết vị trí của bạn ở tòa nhà 2:").
- Hướng dẫn đầy đủ, không bỏ sót: Đưa ra các chỉ dẫn an toàn cốt lõi phù hợp với tình huống (như chặn khe cửa, tránh khói, ra hiệu cửa sổ) một cách rõ ràng và trực diện. Tuyệt đối KHÔNG bỏ qua (skip) các hướng dẫn an toàn quan trọng của quy trình.
- Độ dài vừa phải (Bắt buộc): Câu thoại phát ra ("speak") phải ở mức vừa phải để người gọi dễ tiếp thu qua TTS (Tối đa 3 câu ngắn, khoảng 30-40 từ). Tránh viết đoạn dài dòng trên 50 từ.
- Tránh dồn dập câu hỏi: Chỉ hỏi tối đa MỘT câu hỏi làm rõ ở cuối lượt thoại.
- Luôn ưu tiên an toàn tính mạng và hướng dẫn thoát hiểm trước.`;

    const responseFormat = {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          thought: { type: "string" },
          action: { type: "string", enum: ["ASK", "END"] },
          speak: { type: "string" }
        },
        required: ["thought", "action", "speak"]
      }
    };

    const chatHistory = this._buildChatHistory(transcriptText);
    const result = await this.callApi(systemPrompt, chatHistory, 0.3, responseFormat);
    const parsed = this.parseJson(result.text) || { thought: "", action: "END", speak: "Tôi hiểu rồi." };
    return {
      ...parsed,
      interactionId: null
    };
  }

  async generateEmergencyReport(transcript, slots) {
    const systemPrompt = `Bạn là Trưởng ca Điều phối Khẩn cấp (Lead Dispatcher). 
Nhiệm vụ của bạn là viết một Báo cáo Sự cố (Incident Report) thật chi tiết, chuyên nghiệp và chuẩn mực dựa trên đoạn hội thoại và thông tin hệ thống AI đã trích xuất.

Định dạng yêu cầu (sử dụng Markdown):
### 1. Thông tin Chung
- **Thời gian ghi nhận:** Tự động điền thời gian hiện tại
- **Mức độ:** (Lấy từ hệ thống)
- **Loại sự cố:** (Lấy từ hệ thống)

### 2. Vị trí Sự cố
(Mô tả chi tiết vị trí)

### 3. Tóm tắt Diễn biến
(Tóm tắt ngắn gọn những gì người gọi đã báo cáo và diễn biến cuộc gọi trong 3-4 câu)

### 4. Tình trạng Nạn nhân & Thiệt hại
(Ghi chú rõ nếu có người bị thương, mắc kẹt, hoặc tài sản đang bị đe dọa)

### 5. Hành động đã thực hiện (SOP/Guidance)
(Liệt kê các hướng dẫn an toàn, sơ cứu mà AI Dispatcher đã cung cấp cho người gọi)

### 6. Đề xuất & Lưu ý cho Lực lượng Cứu hộ
(Dựa vào tình hình, đưa ra lời khuyên cho đội Police/Fire/EMS khi họ tiếp cận hiện trường)`;

    const userPrompt = `--- THÔNG TIN HỆ THỐNG TRÍCH XUẤT ---
${JSON.stringify(slots, null, 2)}

--- HỘI THOẠI GHI ÂM (TRANSCRIPT) ---
${transcript}

Hãy viết báo cáo sự cố chuyên nghiệp bằng tiếng Việt.`;

    // Dùng temperature thấp để báo cáo có tính khách quan, rõ ràng
    const result = await this.callApi(systemPrompt, userPrompt, 0.2, null, null, false);
    return result.text;
  }
}

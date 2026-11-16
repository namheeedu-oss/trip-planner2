import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { destination, duration, companions, interests } = req.body;

    // 필수 입력값 검증
    if (!destination || !duration || !companions) {
        return res.status(400).json({ message: '여행지, 기간, 동행자 정보가 필요합니다.' });
    }

    try {
        // 환경변수에서 API 키를 읽어와 Gemini 클라이언트 초기화
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // 프롬프트 및 시스템 지침 설정
        const prompt = `여행지: ${destination}\n기간: ${duration}일\n동행자: ${companions}\n관심사/테마: ${interests || '없음'}`;
        
        const systemInstruction = `당신은 전문 AI 여행 플래너입니다. 
다음 요구사항을 반드시 지켜서 응답하세요:
1. 사용자가 제시한 정보에 맞춰 합리적인 ${duration}일 치 여행 일정을 짜주세요.
2. [중요] 영업시간이나 요금 등 변동될 수 있는 정보는 절대 단정적으로 말하지 마세요. (예: "입장료는 1000원입니다"(X) -> "입장료가 발생할 수 있습니다"(O))
3. 사용자의 요청이 여행 일정과 무관하거나 부적절한 경우, 일정을 생성하지 말고 빈 배열({ "itinerary": [] })을 반환하세요.
4. 오직 아래의 JSON 포맷으로만 응답해야 합니다. 마크다운(```json)을 포함하지 마세요.

[JSON 응답 포맷]
{
  "itinerary": [
    {
      "theme": "1일차 핵심 테마 (예: 도착 및 시내 탐방)",
      "activities": [
        {
          "time": "10:00",
          "place": "장소 이름",
          "description": "이곳에서 무엇을 하는지, 추천 이유나 팁(요금/시간 관련 주의사항 포함)"
        }
      ]
    }
  ]
}`;

        // Gemini API 호출 (요청하신 gemini-3.8-flash 모델 사용 및 JSON 출력 강제)
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json", // JSON 형식의 응답 보장
            }
        });

        // 응답 텍스트를 JSON으로 파싱하여 프론트엔드로 전달
        const data = JSON.parse(response.text);
        res.status(200).json(data);

    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ 
            message: '일정을 생성하는 중 오류가 발생했습니다.',
            error: error.message 
        });
    }
}

// AI 서버 함수 (Vercel)
// - mode 없음: 발달상황 기록 초안 '다듬기'
// - mode:"keyword": 입력 키워드에 어울리는 발달상황 관찰 문장 한 줄 '생성'
// API 키는 Vercel 환경변수 ANTHROPIC_API_KEY 에서 읽어옵니다. 코드에 직접 넣지 마세요.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "API 키가 설정되지 않았어요. Vercel 환경변수 ANTHROPIC_API_KEY 를 확인해 주세요." });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  if (body.mode === "keyword") {
    if (!body.keyword) return res.status(400).json({ error: "키워드가 없어요" });
    const r = await generate({ key, keyword: body.keyword, age: body.age, domain: body.domain, style: body.style });
    return res.status(r.status).json(r.body);
  }
  if (!body.text) return res.status(400).json({ error: "다듬을 내용이 없어요" });
  const r = await refine({ key, text: body.text, age: body.age, style: body.style });
  return res.status(r.status).json(r.body);
}

function styleRuleOf(style) {
  return {
    "개조식": "'~함', '~임', '~을 보임' 같은 개조식 종결어미로 씁니다.",
    "합니다체": "'~합니다', '~하였습니다' 같은 정중한 서술형으로 씁니다.",
    "해요체": "'~해요', '~했어요' 같은 다정하고 부드러운 말투로 씁니다.",
  }[style] || "개조식(~함/~임) 종결어미로 씁니다.";
}

async function refine({ key, text, age, style }) {
  const system =
    "당신은 대한민국 어린이집의 경력 많은 보육교사입니다. " +
    (age || "") + " 아동의 발달상황 기록 초안을 하나의 자연스러운 글로 다듬습니다. " +
    "규칙: (1) 초안에 담긴 사실과 정보는 모두 유지하되, 문장 표현을 매끄럽게 다듬고 여러 영역의 내용을 자연스럽게 이어 하나의 발달상황 기록으로 만듭니다. " +
    "(2) " + styleRuleOf(style) + " " +
    "(3) 긍정적이고 발달을 지원하는 관점으로 씁니다. 부정적 단정, 다른 아이와의 비교, 진단·의학적 표현은 쓰지 않습니다. " +
    "(4) 원문의 분량과 정보량을 유지하며, 임의로 크게 줄이거나 새로운 사실을 지어내지 않습니다. " +
    "(5) 설명, 머리말, 따옴표 없이 다듬은 기록 본문만 출력합니다.";
  return callAnthropic({ key, system, user: "다음 초안을 하나의 발달상황 기록으로 다듬어 주세요:\n\n" + text, max_tokens: 900 });
}

async function generate({ key, keyword, age, domain, style }) {
  const system =
    "당신은 대한민국 어린이집의 경력 많은 보육교사입니다. " +
    (age || "") + " 아동의 발달상황을 관찰 기록합니다. " +
    "교사가 입력한 키워드(관찰한 놀이·활동·행동·상황)를 바탕으로, 그 키워드에 자연스럽게 어울리는 발달상황 관찰 문장을 정확히 한 문장 작성합니다. " +
    "규칙: (1) 키워드의 의미에 꼭 맞는 구체적이고 관찰 가능한 행동으로 표현합니다. 키워드를 문장에 억지로 끼워 넣어 어색해지지 않도록 자연스럽게 녹여 씁니다. " +
    "(2) '" + (domain || "") + "' 영역의 발달 관점을 담되, " + (age || "") + " 발달 수준에 맞게 씁니다. " +
    "(3) " + styleRuleOf(style) + " " +
    "(4) 긍정적이고 발달을 지원하는 관점으로 씁니다. 부정적 단정, 다른 아이와의 비교, 진단·의학적 표현은 쓰지 않습니다. " +
    "(5) 아동의 이름은 넣지 않습니다. 설명·머리말·따옴표·목록 없이 문장 하나만, 한 줄로 출력합니다.";
  const user = "영역: " + (domain || "") + "\n키워드: " + keyword + "\n이 키워드에 어울리는 발달상황 관찰 문장을 한 문장으로 작성해 주세요.";
  return callAnthropic({ key, system, user, max_tokens: 200 });
}

async function callAnthropic({ key, system, user, max_tokens }) {
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // 저렴한 모델. 원하면 claude-sonnet-5 로 변경
        max_tokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = await resp.json();
    if (!resp.ok) return { status: resp.status, body: { error: (data && data.error && data.error.message) || "AI 호출에 실패했어요" } };
    const out = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return { status: 200, body: { text: out } };
  } catch (e) {
    return { status: 500, body: { error: "AI 서버 연결에 실패했어요" } };
  }
}

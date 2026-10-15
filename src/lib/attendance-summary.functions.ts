import { createServerFn } from "@tanstack/react-start";

type Input = { question: string; records: { date: string; absent: string; late: string }[] };

export const summarizeAttendance = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => {
    if (!d || !Array.isArray(d.records)) throw new Error("잘못된 요청");
    return { question: String(d.question ?? "").slice(0, 500), records: d.records.slice(0, 60) };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "AI 설정이 되어 있지 않아요." };
    const lines = data.records
      .filter((r) => r.absent.trim() || r.late.trim())
      .map((r) => `- ${r.date} | 결석: ${r.absent.trim() || "없음"} | 지각: ${r.late.trim() || "없음"}`)
      .join("\n");
    const prompt = `다음은 초등학교 학급의 날짜별 출결 기록입니다 (화면에 보이는 4주).\n${lines || "(기록 없음)"}\n\n교사의 질문: ${data.question || "날짜별 결석·지각 현황과 핵심 사항을 요약해 주세요."}\n\n한국어로 간결하게 답하세요. 날짜별 현황, 반복 결석·지각 학생 등 주의할 점을 짧은 글머리표로 정리하고, 기록에 없는 내용은 지어내지 마세요.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
      }),
    });
    if (!res.ok || !res.body) {
      const msg =
        res.status === 429 ? "요청이 많아요. 잠시 후 다시 시도해 주세요."
        : res.status === 402 ? "AI 사용 크레딧이 부족해요."
        : `요약을 만들지 못했어요 (${res.status}).`;
      return { ok: false as const, error: msg };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const p = line.slice(5).trim();
        if (p === "[DONE]") continue;
        try {
          const ev = JSON.parse(p);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        } catch {}
      }
    }
    if (!text.trim()) return { ok: false as const, error: "AI가 답을 주지 않았어요." };
    return { ok: true as const, text };
  });

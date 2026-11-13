import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evidenceSchema, explanationChoices, selectExplanation } from "@/lib/node-explanation";
import { NODES } from "@/data/nodes";

export const explainNodeFailure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => evidenceSchema.parse(input))
  .handler(async ({ data }) => {
    if (!NODES.some((node) => node.id === data.nodeId)) throw new Error("Unknown node");
    if (data.code === "http" && !data.httpStatus) throw new Error("Missing HTTP evidence");
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const choices = explanationChoices(data);
    try {
      const response = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: "Select the most concise explanation supported by the supplied recorded probe facts. These are caller-reported observations, not authenticated receipts. Do not perform verification, infer hidden causes, or change trust. Return only the JSON index of one supplied sentence.",
        input: JSON.stringify({ evidence: data, choices }),
        max_output_tokens: 256,
        text: { format: { type: "json_schema", name: "evidence_explanation", strict: true, schema: { type: "object", properties: { index: { type: "integer", enum: choices.map((_, index) => index) } }, required: ["index"], additionalProperties: false } } },
      });
      const text = response.output.flatMap((item) => item.type === "message" ? item.content.flatMap((part) => part.type === "output_text" ? [part.text] : []) : []).join("");
      const parsed = JSON.parse(text);
      const index = typeof parsed === "object" && parsed !== null ? parsed.index : undefined;
      const explanation = selectExplanation(data, index);
      return { ok: true as const, explanation };
    } catch (error) {
      return { ok: false as const, message: error instanceof GatewayError && error.httpStatus === 402 ? "AI explanations unavailable: workspace credits are required." : "AI explanation unavailable. Recorded evidence and trust status are unchanged." };
    }
  });
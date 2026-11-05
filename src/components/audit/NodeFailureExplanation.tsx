import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { failureEvidence, type FailureEvidence } from "@/lib/node-explanation";
import type { ProbeStatus } from "@/lib/probes";
import { explainNodeFailure } from "@/utils/node-explanation.functions";
import { supabase } from "@/integrations/supabase/client";

export function NodeFailureExplanation({ nodeId, status }: { nodeId: string; status: ProbeStatus }) {
  const evidence = failureEvidence(nodeId, status);
  return <Explanation key={nodeId} evidence={evidence} />;
}

function Explanation({ evidence }: { evidence: FailureEvidence | null }) {
  const run = useServerFn(explainNodeFailure);
  const [pending, setPending] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<FailureEvidence | null>(null);
  async function explain() {
    if (!evidence) return;
    setPending(true);
    setSource(evidence);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setError("Sign in to request an AI explanation. Trust status is unchanged."); return; }
      const result = await run({ data: evidence });
      if (result.ok) setText(result.explanation);
      else setError(result.message);
    } catch { setError("AI explanation unavailable. Trust status is unchanged."); }
    finally { setPending(false); }
  }
  if (!evidence) return null;
  const sameFacts = source?.code === evidence.code && source?.httpStatus === evidence.httpStatus;
  const visibleText = sameFacts ? text : null;
  return <div className="mt-2 text-xs leading-relaxed text-muted-foreground break-words" aria-live="polite">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-warning">AI explanation · not cryptographic verification</span>
      {!visibleText && <Button variant="ghost" size="sm" disabled={pending} onClick={() => void explain()} aria-label={`Explain failed check for ${evidence.nodeId}`}><Sparkles />{pending ? "Explaining…" : "Explain"}</Button>}
    </div>
    {visibleText && <p>{visibleText}</p>}
    {sameFacts && error && <p role="status">{error}</p>}
    <span className="font-mono text-[0.6rem]">Recorded probe · {new Date(visibleText && source ? source.at : evidence.at).toISOString()}</span>
  </div>;
}
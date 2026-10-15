import { parseVerdict } from "./judge-client";
import type { PolicyVerdict } from "./cache";
import type { PolicyCategory } from "./rules";

type PromptModel = { prompt: (value: string) => Promise<string>; destroy?: () => void };
type PromptApi = { create?: () => Promise<PromptModel> };

/** Optional Chrome Prompt API adapter. It never sends a prompt off-device. */
export async function judgeWithNano(input: Readonly<{ task: string; category: PolicyCategory; allowed: boolean }>): Promise<PolicyVerdict | null> {
  const promptApi = (globalThis as unknown as { ai?: { languageModel?: PromptApi } }).ai?.languageModel;
  if (!promptApi?.create) return null;
  let model: PromptModel | null = null;
  try {
    model = await promptApi.create();
    const answer = await model.prompt(`You are a local study relevance judge. Task: ${input.task.slice(0, 160)}. Page category: ${input.category}. Explicitly allowed: ${input.allowed}. Return strict JSON only: {"decision":"allow|warn|block","reason":"short_snake_case","confidence":0_to_1}. Block only high-confidence distractions.`);
    return parseVerdict(answer);
  } catch { return null; } finally { model?.destroy?.(); }
}

import OpenAI from 'openai'
import { useCallback, useState } from "react";
import SideBar from "./components/prompt-input";
import type { GenerationState } from './types';

export const App = () => {
  const [apiKey, setApiKey] = useState(
    localStorage.getItem("openai_api_key") || ""
  );

  const [generationState, setGenerationState] = useState<GenerationState>({ status: "idle" });


  const cleanGeneratedCode = (rawCode :string) => {
    let code = rawCode.trim();

    code = code.replace(/^```(?:jsx|tsx|javascript|typescript)?\s*\n?/i,'');
    code = code.replace(/\n?```\s*$/i, '');

    code = code.replace(/^import\s+.*;\s*\n?/gm, '');
    code = code.replace(/^export\s+(default\s+)?/gm, '');

    const fnMatch = code.match(/(?:function|const)\s+\w+\s*(?:=\s*)?(?:\([^)]*\)\s*(?:=>)?\s*)?[({]\s*\n?\s*return\s*\(\s*\n?([\s\S]*?)\n?\s*\)\s*;?\s*\n?\s*[})]\s*;?\s*$/);

    if (fnMatch?.[1]) {
      code = fnMatch[1].trim();
    }
    return code.trim();
  }

  const extractTitle = (prompt: string): string => {
    const words = prompt.split(/\s+/).slice(0, 6).join(' ');
    return words.length > 50 ? words.slice(0, 50) + '...' : words;
  };

const handleGenerate = useCallback(async (prompt: string) => {
    if (!apiKey) return;
    setGenerationState({ status: 'loading' });

    try {
      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Return only raw JSX for a single React component. No imports, no exports, no function wrapper, no explanations, no markdown code fences. Use only Tailwind CSS classes for styling. The JSX should be a single root element. Use realistic placeholder content.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const raw = response.choices[0]?.message?.content ?? '';
      const code = cleanGeneratedCode(raw);

      if (!code) {
        setGenerationState({ status: 'error', message: 'No code was generated. Try a different prompt.' });
        return;
      }

      setGenerationState({ status: 'success', code, prompt });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setGenerationState({ status: 'error', message });
    }
  }, [apiKey]);

return (
  <div className="flex h-screen bg-[#0b0f17] text-gray-100 overflow-hidden">

    <SideBar
      onGenerate={handleGenerate}
      isLoading={generationState.status === 'loading'}
      apiKey={apiKey}
      onApiKeySave={setApiKey}
    />

    <div className="flex-1 flex items-center justify-center p-8">
      {generationState.status === 'idle' && (
        <p className="text-gray-500">
          Describe a component to generate code
        </p>
      )}

      {generationState.status === 'loading' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Generating...</p>
        </div>
      )}

      {generationState.status === 'error' && (
        <p className="text-rose-400">
          {generationState.message}
        </p>
      )}

      {generationState.status === 'success' && (
        <div className="max-w-2xl w-full">
          <p className="text-sm text-gray-500 mb-2">
            Generated code (preview coming in Class 4):
          </p>
          <pre className="bg-[#111827] p-4 rounded-lg text-sm text-emerald-400 overflow-auto max-h-96 border border-white/5">
            {generationState.code}
          </pre>
        </div>
      )}
    </div>

  </div>
);
};

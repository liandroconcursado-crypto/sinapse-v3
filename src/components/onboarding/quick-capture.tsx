"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { parseKnowledgeFile } from "@/domain/ingestion/chat-export";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechResultList = { length: number; [index: number]: SpeechResult };
type SpeechRecognitionEvent = { results: SpeechResultList };
type SpeechRecognitionErrorEvent = { error: string };

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function QuickCapture({
  onWrite,
  onText,
}: {
  onWrite: () => void;
  onText: (text: string, sourceName: string, notice?: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const recognition = useRef<BrowserSpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function startVoice() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      onText("", "Transcrição de voz", "Este navegador não oferece ditado. Digite ou cole a transcrição abaixo.");
      return;
    }
    setMessage("Ouvindo… fale naturalmente e finalize quando terminar.");
    setListening(true);
    let transcript = "";
    const current = new Recognition();
    recognition.current = current;
    current.lang = "pt-BR";
    current.continuous = true;
    current.interimResults = false;
    current.onresult = (event) => {
      for (let index = 0; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) transcript += `${event.results[index][0].transcript.trim()} `;
      }
    };
    current.onerror = (event) => {
      setMessage(event.error === "not-allowed" ? "Permissão do microfone negada. Você ainda pode digitar ou colar o texto." : "Não foi possível reconhecer a voz. Tente novamente ou use texto.");
      setListening(false);
    };
    current.onend = () => {
      recognition.current = null;
      setListening(false);
      const finalText = transcript.trim();
      if (finalText) onText(finalText, "Transcrição de voz");
      else setMessage((currentMessage) => currentMessage?.startsWith("Ouvindo") ? "Nenhuma fala foi reconhecida. Tente novamente." : currentMessage);
    };
    current.start();
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(md|txt|json)$/i.test(file.name)) {
      setMessage("Use Markdown (.md), texto (.txt) ou uma exportação de conversas (.json).");
      return;
    }
    if (file.size > 25_000_000) {
      setMessage("O arquivo ultrapassa 25 MB. Divida a exportação em partes para esta versão beta.");
      return;
    }
    const raw = await file.text();
    let parsed: { text: string; notice?: string };
    try {
      parsed = parseKnowledgeFile(file.name, raw);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
      return;
    }
    if (!parsed.text.trim() || parsed.text.length > 8_000_000) {
      setMessage(parsed.text.trim() ? "O conteúdo processado ultrapassa o limite técnico desta etapa." : "O arquivo está vazio.");
      return;
    }
    onText(parsed.text, file.name, parsed.notice);
  }

  return <div className="quick-capture">
    <div className="entry-modes">
      {listening
        ? <button className="recording" onClick={() => recognition.current?.stop()}>Finalizar fala</button>
        : <button onClick={startVoice}>Falar</button>}
      <button onClick={onWrite}>Escrever</button>
      <button onClick={() => onText("", "Texto colado")}>Colar texto</button>
      <button onClick={() => fileInput.current?.click()}>Importar arquivo</button>
    </div>
    <input ref={fileInput} className="visually-hidden" type="file" accept=".md,.txt,.json,text/markdown,text/plain,application/json" onChange={importFile} />
    {message && <p className="capture-message" role="status">{message}</p>}
  </div>;
}

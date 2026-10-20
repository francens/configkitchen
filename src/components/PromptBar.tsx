"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, FileText, Image as ImageIcon, Mic, MicOff, Paperclip, X } from "lucide-react";

type Props = {
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onSubmit: (text: string, files: File[]) => Promise<void> | void;
};

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function PromptBar({ placeholder, autoFocus, disabled, compact, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const baseTextRef = useRef("");
  const fileInput = useRef<HTMLInputElement>(null);
  const supportsVoice = !!getRecognition();

  useEffect(() => () => recRef.current?.stop(), []);

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "it-IT";
    rec.continuous = true;
    rec.interimResults = true;
    baseTextRef.current = text ? text.trimEnd() + " " : "";
    rec.onresult = (ev) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += t + " ";
        else interim += t;
      }
      setText(baseTextRef.current + finalText + interim);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function submit() {
    const t = text.trim();
    if ((!t && files.length === 0) || busy || disabled) return;
    setBusy(true);
    try {
      await onSubmit(t, files);
      setText("");
      setFiles([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-2xl border border-border bg-surface shadow-sm transition focus-within:border-ink/40 ${compact ? "p-2" : "p-3"}`}>
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span key={i} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-panel px-2 py-1 text-xs">
              {f.type.startsWith("image/") ? <ImageIcon size={13} /> : <FileText size={13} />}
              <span className="truncate">{f.name}</span>
              <button className="text-muted hover:text-ink" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Rimuovi">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <textarea
        autoFocus={autoFocus}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder ?? "Descrivi l'ambiente, carica la piantina o la foto della stanza…"}
        rows={compact ? 1 : 2}
        className="max-h-60 w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed outline-none placeholder:text-muted"
      />
      <div className="mt-1 flex items-center gap-1">
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept="image/*,.pdf,.glb,.gltf,.obj,.fbx,.dae"
          onChange={(e) => {
            setFiles([...files, ...Array.from(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <button className="btn-icon" onClick={() => fileInput.current?.click()} title="Allega piantina, foto, texture o modello" disabled={disabled}>
          <Paperclip size={18} />
        </button>
        {supportsVoice && (
          <button
            className={`btn-icon ${listening ? "bg-accent-soft text-accent" : ""}`}
            onClick={toggleVoice}
            title={listening ? "Ferma dettatura" : "Detta a voce"}
            disabled={disabled}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
        {listening && <span className="text-xs text-accent">In ascolto…</span>}
        <div className="flex-1" />
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black disabled:opacity-30"
          onClick={submit}
          disabled={disabled || busy || (!text.trim() && files.length === 0)}
          aria-label="Invia"
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </div>
  );
}

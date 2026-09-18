import { useCallback, useEffect, useRef, useState } from "react";

// Tipos mínimos para la Web Speech API (no forman parte de lib.dom.d.ts)
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface UseSpeechRecognitionOptions {
  /** Idioma en formato BCP 47, p. ej. "es-ES" */
  lang?: string;
  /** Se llama con el texto reconocido en cada actualización (parcial o final) */
  onResult?: (transcript: string, isFinal: boolean) => void;
  /** Se llama cuando falla el reconocimiento o no está soportado ("unsupported") */
  onError?: (error: string) => void;
}

/**
 * Hook para dictado por voz usando la Web Speech API nativa del navegador
 * (SpeechRecognition / webkitSpeechRecognition). No requiere backend ni
 * claves de API. Soportado en Chrome, Edge y la mayoría de navegadores
 * basados en Chromium (incluido Chrome para Android); sin soporte en
 * Firefox y con soporte parcial en Safari.
 */
export function useSpeechRecognition({
  lang = "es-ES",
  onResult,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.("unsupported");
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let texto = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultado = event.results[i];
        texto += resultado[0].transcript;
        if (resultado.isFinal) {
          onResultRef.current?.(texto, true);
          return;
        }
      }
      if (texto) onResultRef.current?.(texto, false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      onErrorRef.current?.(event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isSupported, isListening, start, stop };
}

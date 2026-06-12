import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getEspecieConfig } from "@/lib/especieConfig";
import type { TipoGanaderia } from "@/types";

// ─── Bovino: prefijo país + número ───────────────────────────────────────────

const PREFIJOS_BOVINO = ["ES", "PT", "FR"] as const;
type PrefijoBovino = typeof PREFIJOS_BOVINO[number];

// Para PT y FR aceptamos 9-12 dígitos sin formato estricto
const REGEX_BOVINO_OTROS = /^\d{9,12}$/;

function parseCrotalBovino(value: string): { prefix: PrefijoBovino; nums: string } {
  const upper = value.toUpperCase();
  const prefijo = PREFIJOS_BOVINO.find((p) => upper.startsWith(p));
  if (prefijo) return { prefix: prefijo, nums: value.slice(2) };
  return { prefix: "ES", nums: value };
}

// ─── Equino: UELN (prefijo 3 dígitos país + 12 dígitos restantes) ────────────

const PREFIJOS_EQUINO = [
  { value: "724", label: "724 — ESP" },
  { value: "250", label: "250 — FRA" },
  { value: "620", label: "620 — PRT" },
] as const;
type PrefijoEquino = "724" | "250" | "620";

function parseCrotalEquino(value: string): { prefix: PrefijoEquino; nums: string } {
  const known = PREFIJOS_EQUINO.map((p) => p.value) as PrefijoEquino[];
  const prefijo = known.find((p) => value.startsWith(p));
  if (prefijo) return { prefix: prefijo, nums: value.slice(3) };
  return { prefix: "724", nums: value };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CrotalInputProps {
  value: string;
  onChange: (v: string) => void;
  tipo?: TipoGanaderia;
  required?: boolean;
  optional?: boolean;
  id?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function CrotalInput({
  value,
  onChange,
  tipo = "bovino",
  required,
  id,
  autoFocus,
  placeholder,
}: CrotalInputProps) {
  const [touched, setTouched] = useState(false);
  const config = getEspecieConfig(tipo);

  // ── Equino ──────────────────────────────────────────────────────────────
  if (tipo === "equino") {
    const { prefix, nums } = parseCrotalEquino(value);
    const setPrefix = (p: PrefijoEquino) => onChange(p + nums);
    const setNums = (n: string) => {
      const onlyDigits = n.replace(/\D/g, "").slice(0, 12);
      onChange(prefix + onlyDigits);
    };
    const invalid = touched && nums.length > 0 && !/^\d{12}$/.test(nums);
    const validado = touched && /^\d{12}$/.test(nums);

    return (
      <div className="space-y-1">
        <div className="flex gap-1.5">
          <Select value={prefix} onValueChange={(v) => setPrefix(v as PrefijoEquino)}>
            <SelectTrigger className="w-28 shrink-0 font-mono font-semibold text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PREFIJOS_EQUINO.map((p) => (
                <SelectItem key={p.value} value={p.value} className="font-mono text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id={id}
            className={[
              "font-mono flex-1",
              invalid ? "border-destructive focus-visible:ring-destructive" : "",
              validado ? "border-green-500 focus-visible:ring-green-500" : "",
            ].join(" ")}
            placeholder={placeholder ?? "000000000000"}
            value={nums}
            onChange={(e) => setNums(e.target.value)}
            onBlur={() => setTouched(true)}
            required={required}
            autoFocus={autoFocus}
            inputMode="numeric"
            maxLength={12}
          />
        </div>
        {invalid && <p className="text-xs text-destructive">{config.crotal_hint}</p>}
      </div>
    );
  }

  // ── Bovino ──────────────────────────────────────────────────────────────
  const { prefix, nums } = parseCrotalBovino(value);
  const setPrefix = (p: PrefijoBovino) => onChange(p + nums);
  const setNums = (n: string) => {
    const onlyDigits = n.replace(/\D/g, "");
    onChange(prefix + onlyDigits);
  };
  const regex = prefix === "ES" ? config.crotal_regex : REGEX_BOVINO_OTROS;
  const invalid = touched && nums.length > 0 && !regex.test(nums);
  const validado = touched && nums.length > 0 && regex.test(nums);

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        <Select value={prefix} onValueChange={(v) => setPrefix(v as PrefijoBovino)}>
          <SelectTrigger className="w-20 shrink-0 font-mono font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PREFIJOS_BOVINO.map((p) => (
              <SelectItem key={p} value={p} className="font-mono">
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          className={[
            "font-mono flex-1",
            invalid ? "border-destructive focus-visible:ring-destructive" : "",
            validado ? "border-green-500 focus-visible:ring-green-500" : "",
          ].join(" ")}
          placeholder={placeholder ?? config.crotal_placeholder}
          value={nums}
          onChange={(e) => setNums(e.target.value)}
          onBlur={() => setTouched(true)}
          required={required}
          autoFocus={autoFocus}
          inputMode="numeric"
          maxLength={12}
        />
      </div>
      {invalid && <p className="text-xs text-destructive">{config.crotal_hint}</p>}
    </div>
  );
}

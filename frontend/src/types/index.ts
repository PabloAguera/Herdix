// ─── Usuario ───────────────────────────────────────────────────────────────

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ─── Ganadería ─────────────────────────────────────────────────────────────

export type TipoGanaderia = "bovino" | "equino";

export interface Ganaderia {
  id: number;
  nombre: string;
  tipo: TipoGanaderia;
  created_by: number;
  created_at: string;
}

export type RolUsuario = "admin" | "colaborador";
export type EstadoInvitacion = "activa" | "revocada";

export interface Invitacion {
  id: number;
  ganaderia_id: number;
  token: string;
  estado: EstadoInvitacion;
  creada_by: number;
  created_at: string;
}

export interface Miembro {
  usuario_id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  joined_at: string;
}

// ─── Animal ────────────────────────────────────────────────────────────────

export type Sexo = "macho" | "hembra";
export type RolAnimal = "madre" | "padre" | "recría";
export type MotivoSalida = "venta" | "muerte natural" | "depredador" | "sacrificio" | "cesión";

export interface Animal {
  crotal: string;
  nombre: string | null;
  fecha_nacimiento: string;
  sexo: Sexo;
  rol: RolAnimal;
  composicion_racial: Record<string, number>;
  raza_texto: string | null;
  padre_crotal: string | null;
  padre_desc: string | null;
  madre_crotal: string | null;
  ganaderia_id: number;
}

export interface AnimalCreate {
  crotal: string;
  nombre?: string;
  fecha_nacimiento: string;
  sexo: Sexo;
  rol: RolAnimal;
  composicion_racial: Record<string, number>;
  padre_crotal?: string;
  padre_desc?: string;
  madre_crotal?: string;
  ganaderia_id: number;
}

export interface AnimalUpdate {
  nombre?: string;
  rol?: RolAnimal;
  composicion_racial?: Record<string, number>;
  padre_crotal?: string;
  padre_desc?: string;
  madre_crotal?: string;
}

// ─── Historial ─────────────────────────────────────────────────────────────

export interface AnimalHistorial extends Animal {
  fecha_salida: string;
  motivo_salida: MotivoSalida;
  precio: string | null;
  comprador: string | null;
  notas: string | null;
}

export type DestinoVenta = "carne" | "vida";

export interface AnimalSalidaRequest {
  crotal: string;
  fecha_salida: string;
  motivo_salida: MotivoSalida;
  precio?: string;
  comprador?: string;
  destino?: DestinoVenta;
  notas?: string;
}

// ─── Nacimientos ───────────────────────────────────────────────────────────

export interface Nacimiento {
  id: number;
  anio: number;
  fecha_exacta: string | null;
  crotal_animal: string;
  sexo: Sexo | null;
  crotal_madre: string;
  crotal_padre: string | null;
  padre_desc: string | null;
  ganaderia_id: number;
  notas: string | null;
}

export interface NacimientoCreate {
  anio: number;
  fecha_exacta?: string;
  crotal_animal: string;
  sexo: Sexo;
  crotal_madre: string;
  crotal_padre?: string;
  padre_desc?: string;
  padre_ext_raza?: string;
  ganaderia_id: number;
  notas?: string;
}

// ─── Compras ───────────────────────────────────────────────────────────────

export interface Compra {
  id: number;
  anio: number;
  fecha_exacta: string | null;
  crotal_animal: string;
  ganaderia_id: number;
  vendedor: string | null;
  precio: string;
  notas: string | null;
}

export interface CompraCreate {
  anio: number;
  fecha_exacta?: string;
  crotal_animal: string;
  ganaderia_id: number;
  vendedor?: string;
  precio: number;
  notas?: string;
}

// ─── Reproducción ──────────────────────────────────────────────────────────

export interface Prenez {
  id: number;
  ganaderia_id: number;
  crotal_madre: string;
  fecha_cubricion: string;
  fecha_esperada_parto: string;
  crotal_padre: string | null;
  padre_desc: string | null;
  padre_ext_raza: string | null;
  confirmado: boolean;
  notas: string | null;
}

export interface PrenezCreate {
  ganaderia_id: number;
  crotal_madre: string;
  fecha_cubricion: string;
  crotal_padre?: string;
  padre_desc?: string;
  padre_ext_raza?: string;
  notas?: string;
}

export interface PrenezUpdate {
  fecha_cubricion?: string;
  crotal_padre?: string | null;
  padre_desc?: string | null;
  padre_ext_raza?: string | null;
  notas?: string | null;
}

// ─── Ventas ────────────────────────────────────────────────────────────────

export interface Venta {
  id: number;
  anio: number;
  fecha_exacta: string | null;
  crotal_animal: string;
  ganaderia_id: number;
  comprador: string | null;
  precio: string;
  destino: DestinoVenta;
  notas: string | null;
}

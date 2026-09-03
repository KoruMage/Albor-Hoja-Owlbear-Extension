import { PDFDocument, PDFForm, StandardFonts } from "pdf-lib";
import type { AlborCharacter } from "../types";

const TALENTO_NOMBRES = [
  "text_27",
  "text_28",
  "text_29",
  "text_30",
  "text_31",
  "text_32",
  "text_33",
  "text_34",
  "text_35",
  "text_36",
  "text_37",
  "text_38",
  "text_39",
];

const TALENTO_DESCRIPCIONES = [
  "text_52",
  "text_51",
  "text_50",
  "text_49",
  "text_48",
  "text_47",
  "text_46",
  "text_45",
  "text_44",
  "text_43",
  "text_42",
  "text_41",
  "text_40",
];

const LAZO_NOMBRES = ["text_53", "text_54", "text_55"];
const LAZO_NOTAS = ["text_78", "text_79", "text_80"];

const ETIQUETAS = ["text_81", "text_82", "text_83", "text_84"];

const DOMINIO = ["text_85", "text_86", "text_87", "text_88", "text_89", "text_90"];

const EQUIPO = [
  "text_91",
  "text_92",
  "text_93",
  "text_94",
  "text_95",
  "text_96",
  "text_97",
  "text_98",
  "text_99",
  "text_100",
  "text_101",
];

const MAESTRIA_NOMBRES = ["text_56", "text_57", "text_58", "text_59", "text_60", "text_61"];
const MAESTRIA_DESC = ["text_77", "text_76", "text_75", "text_74", "text_73", "text_72"];

const ARMA_NOMBRES = ["text_62", "text_63", "text_64", "text_65", "text_66"];
const ARMA_NOTAS = ["text_71", "text_70", "text_69", "text_68", "text_67"];

const SMALL_FIELDS = new Set([
  "VIG",
  "AGI",
  "APT",
  "VOL",
  "VIGdado",
  "AGIdado",
  "APTdado",
  "VOLdado",
  "detMax",
  "chispMax",
  "sueTot",
  "sueRes",
  "herAct",
  "herMax",
  "MOV",
  "ADR",
]);

function setField(form: PDFForm, name: string, value: string | number): void {
  const text = String(value ?? "").trim();
  try {
    const field = form.getTextField(name);
    if (name === "nombrePJ" || name === "text_25") field.setFontSize(12);
    else if (SMALL_FIELDS.has(name)) field.setFontSize(8);
    else field.setFontSize(10);
    field.setText(text);
  } catch {
    // La plantilla exportada desde diagrams.net a veces omite un campo.
  }
}

function fillPairs(
  form: PDFForm,
  items: { nombre: string; descripcion: string }[],
  names: string[],
  notes: string[],
): void {
  names.forEach((field, index) => {
    setField(form, field, items[index]?.nombre ?? "");
    setField(form, notes[index], items[index]?.descripcion ?? "");
  });
}

export async function fillAlborPdfFromTemplate(
  template: ArrayBuffer,
  character: AlborCharacter,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(template);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const form = pdf.getForm();

  setField(form, "nombrePJ", character.nombre);
  setField(form, "text_25", character.nombre);
  setField(form, "concepto", character.concepto);
  setField(form, "linaje", character.linaje);
  setField(form, "ocupación", character.ocupacion);
  setField(form, "rol", character.rol);

  setField(form, "VIG", character.stats.vig.valor);
  setField(form, "AGI", character.stats.agi.valor);
  setField(form, "APT", character.stats.apt.valor);
  setField(form, "VOL", character.stats.vol.valor);
  setField(form, "VIGdado", `d${character.stats.vig.dado}`);
  setField(form, "AGIdado", `d${character.stats.agi.dado}`);
  setField(form, "APTdado", `d${character.stats.apt.dado}`);
  setField(form, "VOLdado", `d${character.stats.vol.dado}`);

  setField(form, "detMax", character.det.max);
  setField(form, "DETact", character.det.actual);
  setField(form, "chispMax", character.chispa.max);
  setField(form, "CHISact", character.chispa.actual);
  setField(form, "sueTot", character.suerte.max);
  setField(form, "sueRes", character.suerte.actual);
  setField(form, "herAct", character.heridas.actual);
  setField(form, "herMax", character.heridas.max);
  setField(form, "MOV", character.mov);
  setField(form, "ADR", character.adrenalina);

  fillPairs(form, character.talentos, TALENTO_NOMBRES, TALENTO_DESCRIPCIONES);
  fillPairs(form, character.lazos, LAZO_NOMBRES, LAZO_NOTAS);
  fillPairs(form, character.maestrias, MAESTRIA_NOMBRES, MAESTRIA_DESC);
  fillPairs(form, character.armas, ARMA_NOMBRES, ARMA_NOTAS);

  ETIQUETAS.forEach((field, index) => setField(form, field, character.etiquetas[index] ?? ""));
  DOMINIO.forEach((field, index) => setField(form, field, character.dominio[index] ?? ""));
  EQUIPO.forEach((field, index) => setField(form, field, character.equipo[index] ?? ""));

  form.updateFieldAppearances(font);
  return pdf.save();
}

export async function fillAlborPdf(character: AlborCharacter): Promise<Uint8Array> {
  const response = await fetch("/albor-ficha.pdf");
  if (!response.ok) {
    throw new Error("No se pudo cargar la plantilla de la ficha.");
  }
  return fillAlborPdfFromTemplate(await response.arrayBuffer(), character);
}

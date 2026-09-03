import { useMemo, useRef, useState } from "react";
import { AlborCharacter, normalizeCharacter } from "../types";
import { parseSheetFromLocation } from "../web/sheetLink";
import { downloadBytes, readJsonFile, slug } from "../utils/download";
import { fillAlborPdf } from "../utils/fillPdf";
import { CharacterSheet } from "./CharacterSheet";

export function WebSheetPage() {
  const [character, setCharacter] = useState<AlborCharacter | null>(() =>
    parseSheetFromLocation(),
  );
  const [error, setError] = useState<string | null>(
    character ? null : "No hay ficha en este enlace. Importá un JSON.",
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const title = useMemo(
    () => character?.nombre || "Ficha de Albor",
    [character?.nombre],
  );

  return (
    <div className="standalone standalone--web">
      <header className="header">
        <div>
          <p className="wordmark">~ ~ ~ albor ~ ~ juego ~ de ~ rol ~ ~ ~</p>
          <h1>{title}</h1>
          <p className="muted">Vista web de solo lectura</p>
        </div>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Abrir JSON
        </button>
        <button
          type="button"
          disabled={!character}
          onClick={() => {
            if (!character) return;
            void fillAlborPdf(character)
              .then((bytes) =>
                downloadBytes(`${slug(character.nombre)}.pdf`, bytes, "application/pdf"),
              )
              .catch((err: unknown) => {
                window.alert(
                  err instanceof Error ? err.message : "No se pudo exportar el PDF.",
                );
              });
          }}
        >
          Exportar PDF
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const data = await readJsonFile<Partial<AlborCharacter>>(file);
              setCharacter(normalizeCharacter(data));
              setError(null);
            } catch {
              setError("No se pudo leer ese JSON.");
            }
          }}
        />
      </header>
      {error && <p className="web-sheet__error">{error}</p>}
      {character && (
        <CharacterSheet character={character} readOnly dicePlusEnabled={false} />
      )}
    </div>
  );
}

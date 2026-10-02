export function OptionsPanel({
  isGM,
  web,
  dicePlusEnabled,
  onDicePlusChange,
  syncWithLocal,
  onSyncWithLocalChange,
  onExport,
}: {
  isGM: boolean;
  web: boolean;
  dicePlusEnabled: boolean;
  onDicePlusChange: (enabled: boolean) => void;
  syncWithLocal: boolean;
  onSyncWithLocalChange: (enabled: boolean) => void;
  onExport: () => void;
}) {
  const showDice = isGM || web;
  const showSync = isGM && !web;

  return (
    <section className="panel options">
      <h3 className="options__title">- Opciones -</h3>
      {showDice && (
        <div className="options__block">
          <h4 className="options__heading">- Dados -</h4>
          <label className="check">
            <input
              type="checkbox"
              checked={dicePlusEnabled}
              disabled={web}
              onChange={(e) => onDicePlusChange(e.target.checked)}
            />
            Usar Dice+ (dados 3D en Owlbear). Si no está instalada, se tira en local.
          </label>
        </div>
      )}
      <div className="options__block">
        <h4 className="options__heading">- Datos de la mesa -</h4>
        {showSync && (
          <label className="check">
            <input
              type="checkbox"
              checked={syncWithLocal}
              onChange={(e) => onSyncWithLocalChange(e.target.checked)}
            />
            Sincronizar la sala con las fichas locales de este navegador
          </label>
        )}
        <p className="hint">
          Entorno: {web ? "web / localStorage" : "Owlbear Rodeo"} · metadata{" "}
          <code>com.albor/state</code>
        </p>
        <button type="button" onClick={onExport}>
          Exportar mesa
        </button>
      </div>
    </section>
  );
}

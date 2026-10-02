export function OptionsPanel({
  isGM,
  web,
  dicePlusEnabled,
  onDicePlusChange,
  onExport,
}: {
  isGM: boolean;
  web: boolean;
  dicePlusEnabled: boolean;
  onDicePlusChange: (enabled: boolean) => void;
  onExport: () => void;
}) {
  const showDice = isGM || web;

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
        <p className="hint">
          Las fichas viven en este navegador. La sala sólo muestra al director lo que cada jugador publica.
        </p>
        <button type="button" onClick={onExport}>
          Exportar mesa
        </button>
      </div>
    </section>
  );
}

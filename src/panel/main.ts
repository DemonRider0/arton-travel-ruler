import OBR from "@owlbear-rodeo/sdk";
import { importMapAsScene } from "../import/importScene";
import { MAP_IDS, getMapDefinition } from "../maps/definitions";
import {
  applyPendingCalibration,
  calibrateCurrentScene,
  getSceneCalibration,
  updateTravelSpeed,
} from "../owlbear/sceneCalibration";
import type { MapCalibration, MapId } from "../shared/models";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("Elemento raiz do painel não encontrado.");
}
const app: HTMLElement = root;

let role: "GM" | "PLAYER" = "PLAYER";
let calibration: MapCalibration | null = null;
let busy = false;
let status = "Conectando ao Owlbear Rodeo…";
let statusVariant: "info" | "success" | "error" = "info";

render();

if (!OBR.isAvailable) {
  status = "Abra este painel dentro do Owlbear Rodeo. O servidor local serve apenas os arquivos da extensão.";
  render();
} else {
  OBR.onReady(() => {
    void initialize();
  });
}

async function initialize(): Promise<void> {
  try {
    role = await OBR.player.getRole();
    calibration = await applyPendingCalibration();
    calibration ??= await getSceneCalibration();
    status = calibration
      ? `Cena calibrada para ${calibration.mapLabel}.`
      : "Nenhuma calibração encontrada na cena atual.";
    statusVariant = calibration ? "success" : "info";
  } catch (error) {
    setError(error);
  } finally {
    render();
  }
}

function render(): void {
  const cards = MAP_IDS.map((mapId) => {
    const definition = getMapDefinition(mapId);
    return `
      <article class="card map-card">
        <div>
          <h2>${definition.label}</h2>
          <p>Referência: ${definition.referenceWidth}×${definition.referenceHeight}px</p>
        </div>
        <div class="button-row">
          <label class="button primary ${busy || role !== "GM" ? "disabled" : ""}">
            Importar mapa
            <input data-file-map="${mapId}" type="file" accept="image/png,image/jpeg,image/webp" ${busy || role !== "GM" ? "disabled" : ""} />
          </label>
          <button data-calibrate-map="${mapId}" class="button secondary" ${busy || role !== "GM" ? "disabled" : ""}>
            Calibrar cena atual
          </button>
        </div>
      </article>
    `;
  }).join("");

  const calibrationSection = calibration
    ? `
      <section class="card calibration-card">
        <h2>Cena atual</h2>
        <dl>
          <div><dt>Mapa</dt><dd>${calibration.mapLabel}</dd></div>
          <div><dt>Imagem</dt><dd>${calibration.imageWidth}×${calibration.imageHeight}px</dd></div>
          <div><dt>Escala</dt><dd>${formatNumber(calibration.kilometersPerImagePixel, 4)} km/pixel</dd></div>
        </dl>
        <form id="speed-form">
          <label for="speed">Quilômetros percorridos por dia</label>
          <div class="inline-field">
            <input id="speed" name="speed" type="number" min="0.1" step="0.1" value="${calibration.kilometersPerDay}" required ${busy || role !== "GM" ? "disabled" : ""} />
            <button class="button primary" type="submit" ${busy || role !== "GM" ? "disabled" : ""}>Salvar</button>
          </div>
        </form>
      </section>
    `
    : "";

  app.innerHTML = `
    <header>
      <h1>Régua de Viagem</h1>
      <p>Importe e calibre seus próprios mapas de Arton e Lamnor.</p>
    </header>
    <p class="status ${statusVariant}" role="status">${escapeHtml(status)}</p>
    ${role === "PLAYER" ? '<p class="notice">Somente o mestre importa mapas e altera a calibração. Jogadores também podem traçar e apagar rotas quando a sala permite criar e excluir itens da camada Régua.</p>' : ""}
    <section class="map-list" aria-label="Mapas disponíveis">${cards}</section>
    ${calibrationSection}
    <p class="hint">Após importar, abra a cena criada no Atlas. A calibração será aplicada automaticamente.</p>
  `;

  bindEvents();
}

function bindEvents(): void {
  for (const input of app.querySelectorAll<HTMLInputElement>("[data-file-map]")) {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      const mapId = input.dataset.fileMap as MapId | undefined;
      if (file && mapId) {
        void handleImport(file, mapId);
      }
    });
  }

  for (const button of app.querySelectorAll<HTMLButtonElement>("[data-calibrate-map]")) {
    button.addEventListener("click", () => {
      const mapId = button.dataset.calibrateMap as MapId | undefined;
      if (mapId) {
        void handleCalibration(mapId);
      }
    });
  }

  app.querySelector<HTMLFormElement>("#speed-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    void handleSpeedUpdate(Number(form.get("speed")));
  });
}

async function handleImport(file: File, mapId: MapId): Promise<void> {
  busy = true;
  status = `Lendo ${file.name} e preparando a cena…`;
  statusVariant = "info";
  render();
  try {
    const pendingImport = await importMapAsScene(file, mapId);
    status = `${getMapDefinition(mapId).label} importado (${pendingImport.imageWidth}×${pendingImport.imageHeight}px). Abra a nova cena no Atlas.`;
    statusVariant = "success";
  } catch (error) {
    setError(error);
  } finally {
    busy = false;
    render();
  }
}

async function handleCalibration(mapId: MapId): Promise<void> {
  busy = true;
  status = `Calibrando a cena atual como ${getMapDefinition(mapId).label}…`;
  statusVariant = "info";
  render();
  try {
    calibration = await calibrateCurrentScene(mapId);
    status = `Cena calibrada para ${calibration.mapLabel}.`;
    statusVariant = "success";
  } catch (error) {
    setError(error);
  } finally {
    busy = false;
    render();
  }
}

async function handleSpeedUpdate(kilometersPerDay: number): Promise<void> {
  busy = true;
  render();
  try {
    calibration = await updateTravelSpeed(kilometersPerDay);
    status = `Velocidade atualizada para ${formatNumber(kilometersPerDay, 1)} km por dia.`;
    statusVariant = "success";
  } catch (error) {
    setError(error);
  } finally {
    busy = false;
    render();
  }
}

function setError(error: unknown): void {
  status = error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
  statusVariant = "error";
}

function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

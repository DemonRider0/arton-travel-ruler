import { describe, expect, it } from "vitest";
import {
  chooseRouteInteractionWinner,
  getRouteInteractionQueuePosition,
  readRouteInteractionRequest,
  type RouteInteractionRequest,
} from "../src/measurements/interactionQueue";

describe("fila de consulta da régua", () => {
  it("mantém a prioridade de quem interagiu primeiro", () => {
    const first = request("first", 100, "route-a");
    const second = request("second", 200, "route-b");
    const validRoutes = new Set(["route-a", "route-b"]);
    expect(
      chooseRouteInteractionWinner([second, first], "scene-1", validRoutes),
    ).toEqual(first);
    expect(
      getRouteInteractionQueuePosition("second", [second, first], "scene-1", validRoutes),
    ).toBe(2);
  });

  it("libera a prioridade para o próximo pedido quando o primeiro desaparece", () => {
    const second = request("second", 200, "route-b");
    expect(
      chooseRouteInteractionWinner([second], "scene-1", new Set(["route-b"])),
    ).toEqual(second);
  });

  it("ignora pedidos de outra cena e de rotas já apagadas", () => {
    const otherScene = { ...request("other", 10, "route-a"), sceneScope: "scene-2" };
    const deleted = request("deleted", 20, "route-deleted");
    const current = request("current", 30, "route-a");
    expect(
      chooseRouteInteractionWinner(
        [otherScene, deleted, current],
        "scene-1",
        new Set(["route-a"]),
      ),
    ).toEqual(current);
  });

  it("usa o identificador como desempate determinístico", () => {
    const alpha = request("a", 100, "route-a");
    const beta = request("b", 100, "route-a");
    expect(
      chooseRouteInteractionWinner([beta, alpha], "scene-1", new Set(["route-a"])),
    ).toEqual(alpha);
  });

  it("rejeita metadados incompletos", () => {
    expect(readRouteInteractionRequest({ version: 1 })).toBeNull();
    expect(readRouteInteractionRequest(request("valid", 100, "route-a"))).not.toBeNull();
  });
});

function request(
  requestId: string,
  requestedAt: number,
  measurementId: string,
): RouteInteractionRequest {
  return {
    version: 1,
    requestId,
    sceneScope: "scene-1",
    measurementId,
    pointIndex: 1,
    requestedAt,
    connectionId: `connection-${requestId}`,
    playerName: requestId,
  };
}

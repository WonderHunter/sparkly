import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// « server-only » lève une erreur hors du serveur Next : neutralisé en test.
vi.mock("server-only", () => ({}));

afterEach(() => cleanup());

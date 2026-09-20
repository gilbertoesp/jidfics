import { expect, vi } from "vitest";
import "@testing-library/jest-dom";

// Make expect available globally for tests
(globalThis as Record<string, unknown>).expect = expect;
(globalThis as Record<string, unknown>).vi = vi;
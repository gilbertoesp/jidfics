import { expect, vi } from "vitest";
import "@testing-library/jest-dom";

// Make expect available globally for tests
(globalThis as unknown as { expect: typeof expect; vi: typeof vi }).expect = expect;
(globalThis as unknown as { expect: typeof expect; vi: typeof vi }).vi = vi;
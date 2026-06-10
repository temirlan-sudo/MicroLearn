import { describe, expect, it } from "vitest"
import { formatCompact, formatKZT, formatNumber } from "../lib/format"

describe("frontend smoke checks", () => {
  it("formats money and counters for the Russian UI", () => {
    expect(formatKZT(12900)).toBe("12 900 ₸")
    expect(formatNumber(1200)).toBe("1 200")
    expect(formatCompact(1284)).toBe("1,3 тыс.")
  })
})

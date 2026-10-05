import { formataMoeda } from "./format";

describe("formataMoeda", () => {
  it("formata centavos em BRL", () => {
    expect(formataMoeda(12345)).toContain("123,45");
  });

  it("aceita bigint sem float intermediário", () => {
    expect(formataMoeda(10n)).toContain("0,10");
  });
});

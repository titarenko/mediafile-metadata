import { describe, expect, test } from "@jest/globals";
import fs from "fs/promises";
import { FileReader } from "../src/reader";
import { parseEssentials } from "../src/isobmff";

describe("isobmff", () => {
  test("isom", async () => {
    const file = await fs.open(`${__dirname}/assets/isom.bin`);
    const reader = new FileReader(file);
    const essentials = await parseEssentials(reader);
    expect(essentials).toStrictEqual({
      creationDate: new Date("2023-03-25T15:34:24.000Z"),
    });
  });

  test("heic", async () => {
    const file = await fs.open(`${__dirname}/assets/heic.bin`);
    const reader = new FileReader(file);
    const essentials = await parseEssentials(reader);
    expect(essentials).toStrictEqual({
      creationDate: new Date("2022-05-10T15:48:20.000Z"),
      camera: "Apple iPhone XS",
    });
  });
});

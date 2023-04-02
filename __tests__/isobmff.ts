import { describe, expect, test } from "@jest/globals";
import fs from "fs/promises";
import { FileReader } from "../src/reader";
import { parseEssentials } from "../src/isobmff";
import { Essentials } from "../src/essentials";

describe("isobmff", () => {
  t("isom", {
    creationDate: new Date("2023-03-25T15:34:24.000Z"),
  });

  t("heic", {
    creationDate: new Date("2022-05-10T15:48:20.000Z"),
    camera: "Apple iPhone XS",
  });
});

function t(testName: string, expectedResult: Essentials | undefined) {
  test(testName, async () => {
    const file = await fs.open(`${__dirname}/assets/${testName}.bin`);
    const reader = new FileReader(file);
    const essentials = await parseEssentials(reader);
    expect(essentials).toStrictEqual(expectedResult);
    await file.close();
  });
}

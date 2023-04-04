import { describe, expect, test } from "@jest/globals";
import fs from "fs/promises";
import { parseEssentials } from "../src/exif";
import { Essentials } from "../src/essentials";
import { BufferReader } from "../src/reader";

describe("exif", () => {
  createTest("should work", "exif.bin", {
    creationDate: new Date("2022-05-10T15:48:20.000Z"),
    camera: "Apple iPhone XS",
  });

  createTest("should handle linked ifds", "exif2.bin", {
    creationDate: new Date("2017-05-06T15:24:07.000Z"),
    camera: "NIKON CORPORATION NIKON D700",
  });
});

function createTest(
  testName: string,
  fileName: string,
  expectedResult: Essentials
) {
  test(testName, async () => {
    const data = await fs.readFile(`${__dirname}/assets/${fileName}`);
    const actualResult = await parseEssentials(new BufferReader(data));
    expect(actualResult).toStrictEqual(expectedResult);
  });
}

import { describe, expect, test } from "@jest/globals";
import { Essentials } from "../src/essentials";
import { getEssentials } from "../src";

describe("mediafile-metadata", () => {
  createTest("isom", {
    creationDate: new Date("2023-03-25T15:34:24.000Z"),
  });

  createTest("heic", {
    creationDate: new Date("2022-05-10T15:48:20.000Z"),
    camera: "Apple iPhone XS",
  });

  createTest("exif.jpg", {
    creationDate: new Date("2017-05-06T15:24:07.000Z"),
    camera: "NIKON CORPORATION NIKON D700",
  });
});

export function createTest(
  testName: string,
  expectedResult: Essentials | undefined
) {
  test(testName, async () => {
    const actualResult = await getEssentials(
      `${__dirname}/assets/${testName}${testName.includes(".") ? "" : ".bin"}`
    );
    expect(actualResult).toStrictEqual(expectedResult);
  });
}

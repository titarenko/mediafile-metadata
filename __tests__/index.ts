import { describe, expect, test } from "@jest/globals";
import { Essentials } from "../src/essentials";
import { getEssentials } from "../src";

describe("isobmff", () => {
  createTest("isom", {
    creationDate: new Date("2023-03-25T15:34:24.000Z"),
  });

  createTest("heic", {
    creationDate: new Date("2022-05-10T15:48:20.000Z"),
    camera: "Apple iPhone XS",
  });
});

export function createTest(
  testName: string,
  expectedResult: Essentials | undefined
) {
  test(testName, async () => {
    const actualResult = await getEssentials(
      `${__dirname}/assets/${testName}.bin`
    );
    expect(actualResult).toStrictEqual(expectedResult);
  });
}

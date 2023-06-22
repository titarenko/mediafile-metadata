import { describe, expect, test } from "@jest/globals";
import { Essentials } from "../src/essentials";
import { getEssentials, getEssentialsAndHeader } from "../src";

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

  createTest("qt", {
    creationDate: new Date("2019-10-19T08:49:01.000Z"),
    camera: "Apple iPhone XS",
  });

  createTest("mp42", {
    creationDate: new Date("2020-11-16T19:03:31.000Z"),
    camera: "Android 9",
  });

  createTest("xavc", {
    creationDate: new Date("2023-06-15T14:05:42+03:00"),
    camera: "Sony FDR-X3000",
  });

  createTest("unknown", undefined);

  test("header", async () => {
    const actualResult = await getEssentialsAndHeader(
      `${__dirname}/assets/unknown.bin`
    );
    expect(actualResult).toStrictEqual({
      essentials: undefined,
      header: "123456789abcdef0",
    });
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

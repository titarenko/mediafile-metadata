import { describe, expect, test } from "@jest/globals";
import fs from "fs/promises";
import { parseEssentials } from "../src/exif";

describe("exif", () => {
  test("should work", async () => {
    const data = await fs.readFile(__dirname + "/assets/exif.bin");
    const essentials = parseEssentials(data);
    expect(essentials).toStrictEqual({
      creationDate: new Date("2022-05-10T15:48:20.000Z"),
      camera: "Apple iPhone XS",
    });
  });
});

import { Essentials } from "./essentials";
import { parseEssentials as parseEssentialsFromTiff } from "./tiff";

class Parser {
  constructor(private readonly data: Buffer, private offset = 0) {}

  parse(): Essentials | undefined {
    let exifString = this.readString(4);
    if (exifString !== "Exif") {
      throw new Error("Exif string is expected but not found");
    }
    this.offset += 2; // 0x0000 after Exif

    const tiffBuffer = this.data.subarray(this.offset);
    return parseEssentialsFromTiff(tiffBuffer);
  }

  private readString(length: number) {
    const result = this.data.toString(
      "ascii",
      this.offset,
      this.offset + length
    );
    this.offset += length;
    return result;
  }
}

export function parseEssentials(data: Buffer): Essentials | undefined {
  const parser = new Parser(data);
  return parser.parse();
}

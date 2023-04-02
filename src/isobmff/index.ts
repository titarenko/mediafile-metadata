import { Essentials } from "../essentials";
import { Reader } from "../reader";
import { parse as parseIsom } from "./isom";
import { parse as parseHeic } from "./heic";

export async function parseEssentials(
  reader: Reader
): Promise<Essentials | undefined> {
  const size = await reader.read4();
  const type = await reader.readAsciiString(4);
  if (type !== "ftyp") {
    return;
  }

  const brand = await reader.readAsciiString(4);
  reader.incrementOffset(size - 12); // 3 fields of 4 bytes each

  switch (brand) {
    case "isom":
      return parseIsom(reader);
    case "heic":
      return parseHeic(reader);
    default:
      throw new Error(`unexpected brand: ${brand}`);
  }
}

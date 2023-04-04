import { Essentials } from "./essentials";
import { Reader } from "./reader";
import { parseEssentials as parseEssentialsFromTiff } from "./tiff";

export async function parseEssentials(
  reader: Reader
): Promise<Essentials | undefined> {
  const exifString = await reader.readAsciiString(4);
  if (exifString !== "Exif") {
    throw new Error("Exif string is expected but not found");
  }
  reader.incrementOffset(2); // 0x0000 after Exif
  const subreader = await reader.getSubreader();
  return parseEssentialsFromTiff(subreader);
}

import { Essentials } from "./essentials";
import { Reader } from "./reader";
import { parseEssentials as parseEssentialsFromExif } from "./exif";

export async function parseEssentials(
  reader: Reader
): Promise<Essentials | undefined> {
  // https://www.media.mit.edu/pia/Research/deepview/exif.html#:~:text=JPEG%20image%20files.-,JPEG%20format%20and%20Marker,EOI(End%20of%20image).
  const start = await reader.readUnsignedInteger(2);
  if (start !== 0xffd8) {
    return;
  }
  while (true) {
    const canRead = await reader.canRead();
    if (!canRead) {
      return;
    }
    const marker = await reader.readUnsignedInteger(2);
    const size = (await reader.readUnsignedInteger(2)) - 2;
    if (marker === 0xffe1) {
      const subreader = await reader.getSubreader(size);
      return parseEssentialsFromExif(subreader);
    } else {
      reader.incrementOffset(size);
    }
  }
}

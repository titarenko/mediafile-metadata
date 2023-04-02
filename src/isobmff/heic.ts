import { Essentials } from "../essentials";
import { Reader } from "../reader";
import { scrollTo } from "./utils";

export async function parse(reader: Reader) {
  let result: Essentials | undefined;

  let box = await scrollTo(reader, "meta");
  if (!box) {
    return result;
  }

  box = await scrollTo(reader, "iinf");
  if (!box) {
    return result;
  }
  const exifInfe = readExifInfe(await reader.getSubreader(box.size));
  if (!exifInfe) {
    return result;
  }
  reader.incrementOffset(box.size);

  box = await scrollTo(reader, "iloc");
  if (!box) {
    return result;
  }
  const exifIloc = readExifIloc(await reader.getSubreader(box.size));
  if (!exifIloc) {
    return result;
  }

  return result;
}

async function readExifInfe(reader: Reader) {
  reader.incrementOffset(8); // iinf is full box (1 + 3) + items count (4)
  while (true) {
    const canRead = await reader.canRead();
    if (!canRead) {
      return;
    }
    const size = await reader.readUnsignedInteger(4);
    const type = await reader.readAsciiString(4);
    if (type === "infe") {
      const version = await reader.readUnsignedInteger(1);
      reader.incrementOffset(3); // flags are 3 bytes
      if (version >= 2) {
        const itemId = await (version === 2
          ? reader.readUnsignedInteger(2)
          : reader.readUnsignedInteger(4));
        reader.incrementOffset(2); // itemProtectionIndex
        const itemType = await reader.readAsciiString(4);
        if (itemType === "Exif") {
          return { itemId };
        } else {
          reader.incrementOffset(
            size - 8 - 4 - (version === 2 ? 2 : 4) - 2 - 4
          );
        }
      } else {
        reader.incrementOffset(size - 8 - 4);
      }
    } else {
      reader.incrementOffset(size - 8);
    }
  }
}

async function readExifIloc(reader: Reader) {
  const version = await reader.readUnsignedInteger(1);
  while (true) {
    const canRead = await reader.canRead();
    if (!canRead) {
      return;
    }
    const size = await reader.readUnsignedInteger(4);
    const type = await reader.readAsciiString(4);
    if (type === "infe") {
      const version = await reader.readUnsignedInteger(1);
      reader.incrementOffset(3); // flags are 3 bytes
      if (version >= 2) {
        const itemId = await (version === 2
          ? reader.readUnsignedInteger(2)
          : reader.readUnsignedInteger(4));
        reader.incrementOffset(2); // itemProtectionIndex
        const itemType = await reader.readAsciiString(4);
        if (itemType === "Exif") {
          return { itemId };
        } else {
          reader.incrementOffset(
            size - 8 - 4 - (version === 2 ? 2 : 4) - 2 - 4
          );
        }
      } else {
        reader.incrementOffset(size - 8 - 4);
      }
    } else {
      reader.incrementOffset(size - 8);
    }
  }
}

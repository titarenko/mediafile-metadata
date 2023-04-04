import { Essentials } from "../essentials";
import { Reader } from "../reader";
import { scrollTo } from "./utils";
import { parseEssentials } from "../exif";

export async function parse(reader: Reader) {
  let result: Essentials | undefined;

  let box = await scrollTo(reader, "meta");
  if (!box) {
    return result;
  }
  reader.incrementOffset(4); // meta is fullbox

  box = await scrollTo(reader, "iinf");
  if (!box) {
    return result;
  }
  const exifInfe = await readExifInfe(await reader.getSubreader(box.size));
  if (!exifInfe) {
    return result;
  }
  reader.incrementOffset(box.size);

  box = await scrollTo(reader, "iloc");
  if (!box) {
    return result;
  }
  const exifIloc = await readExifIloc(
    await reader.getSubreader(box.size),
    exifInfe.itemId
  );
  if (!exifIloc) {
    return result;
  }

  reader.setOffset(exifIloc.offset + 4);
  const exifBuffer = await reader.readBuffer(exifIloc.length - 4);

  return parseEssentials(exifBuffer);
}

async function readExifInfe(reader: Reader) {
  const version = await reader.readUnsignedInteger(1);
  reader.incrementOffset(3 + (version === 0 ? 2 : 4)); // flags + items count
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

async function readExifIloc(reader: Reader, exifItemId: number) {
  const version = await reader.readUnsignedInteger(1);
  reader.incrementOffset(3); // ignore flags

  const sizes = await reader.readUnsignedInteger(2);
  const offsetSize = sizes >> 12;
  const lengthSize = (sizes >> 8) & 0xf;
  const baseOffsetSize = (sizes >> 4) & 0xf;
  const indexSize = sizes & 0xf;

  let itemCount = 0;
  if (version < 2) {
    itemCount = await reader.readUnsignedInteger(2);
  } else if (version === 2) {
    itemCount = await reader.readUnsignedInteger(4);
  }

  while (itemCount-- > 0) {
    const canRead = await reader.canRead();
    if (!canRead) {
      return;
    }
    let itemId;
    if (version < 2) {
      itemId = await reader.readUnsignedInteger(2);
    } else if (version === 2) {
      itemId = await reader.readUnsignedInteger(4);
    }

    if (version == 1 || version == 2) {
      reader.incrementOffset(2); // ignore constructionMethod
    }
    reader.incrementOffset(2); // ignore dataReferenceIndex
    const baseOffset = baseOffsetSize
      ? await reader.readUnsignedInteger(baseOffsetSize)
      : 0;
    let extentCount = await reader.readUnsignedInteger(2);
    if (itemId !== exifItemId) {
      const extentIndexSize =
        (version == 1 || version == 2) && indexSize && indexSize > 0
          ? indexSize
          : 0;
      reader.incrementOffset(
        extentCount * (extentIndexSize + offsetSize + lengthSize)
      );
      continue;
    }

    while (extentCount-- > 0) {
      let extentIndex;
      if ((version == 1 || version == 2) && indexSize && indexSize > 0) {
        extentIndex = await reader.readUnsignedInteger(indexSize);
      }
      const extentOffset = await reader.readUnsignedInteger(offsetSize);
      const extentLength = await reader.readUnsignedInteger(lengthSize);

      return { offset: baseOffset + extentOffset, length: extentLength };
    }
  }
}

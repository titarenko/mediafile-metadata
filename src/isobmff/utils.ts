import { Reader } from "../reader";

export async function scrollTo(reader: Reader, desiredType: string) {
  while (true) {
    const canRead = await reader.canRead();
    if (!canRead) {
      return;
    }
    let size = (await reader.readUnsignedInteger(4)) - 8; // 4 bytes size and 4 bytes type
    const type = await reader.readAsciiString(4);
    if (desiredType === type) {
      return { type, size };
    }
    if (size === -7) {
      size = (await reader.readUnsignedInteger(8)) - 16;
    }
    if (size > 0) {
      reader.incrementOffset(size);
    }
  }
}

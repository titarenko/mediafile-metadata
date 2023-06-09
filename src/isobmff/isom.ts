import { Essentials } from "../essentials";
import { Reader } from "../reader";
import { readCreationDate } from "./common/mvhd";
import { scrollTo } from "./utils";

export async function parse(reader: Reader): Promise<Essentials | undefined> {
  let result: Essentials | undefined;

  result = await readCreationDate(reader);
  if (!result) {
    return result;
  }

  let box = await scrollTo(reader, "meta");
  if (!box) {
    return result;
  }

  // https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW1
  box = await scrollTo(reader, "keys");
  if (!box) {
    return result;
  }
  reader.incrementOffset(4); // version + flags (1 + 3)
  let keysCount = await reader.readUnsignedInteger(4);
  const keys: Record<number, string> = {};
  for (let keyIndex = 0; keyIndex < keysCount; ++keyIndex) {
    const canRead = await reader.canRead();
    if (!canRead) {
      break;
    }
    const size = await reader.readUnsignedInteger(4);
    reader.incrementOffset(4); // namespace is string of length 4
    const value = await reader.readAsciiString(size - 8);
    if (
      value === "com.android.version" ||
      value === "com.apple.quicktime.make" ||
      value === "com.apple.quicktime.model"
    ) {
      keys[keyIndex] = value;
    }
  }
  if (!Object.keys(keys).length) {
    return result;
  }

  box = await scrollTo(reader, "ilst");
  if (!box) {
    return result;
  }
  const values: Record<string, string> = {};
  const ilstReader = await reader.getSubreader(box.size);
  while (true) {
    const canRead = await ilstReader.canRead();
    if (!canRead) {
      break;
    }
    const size = await ilstReader.readUnsignedInteger(4);
    const index = (await ilstReader.readUnsignedInteger(4)) - 1;
    if (keys[index]) {
      box = await scrollTo(ilstReader, "data");
      if (!box) {
        break;
      }
      const type = await ilstReader.readUnsignedInteger(4);
      if (type !== 1) {
        throw new Error(`unexpected type: ${type}`);
      }
      ilstReader.incrementOffset(4); // locale is 4 bytes number
      const value = await ilstReader.readBuffer(box.size - 8);
      values[keys[index]] = value.toString("utf-8");
    } else {
      ilstReader.incrementOffset(size - 4); // index field is 4 bytes
    }
  }
  if (!Object.keys(values).length) {
    return result;
  }

  if ("com.android.version" in values) {
    result.camera = `Android ${values["com.android.version"]}`;
  } else if ("com.apple.quicktime.make" in values) {
    result.camera = `${values["com.apple.quicktime.make"]} ${values["com.apple.quicktime.model"]}`;
  }

  return result;
}

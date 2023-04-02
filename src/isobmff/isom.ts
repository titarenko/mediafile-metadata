import { Essentials } from "../essentials";
import { Reader } from "../reader";
import { scrollTo } from "./utils";

export async function parse(reader: Reader): Promise<Essentials | undefined> {
  let result: Essentials | undefined;

  let box = await scrollTo(reader, "moov");
  if (!box) {
    return result;
  }

  box = await scrollTo(reader, "mvhd");
  if (!box) {
    return result;
  }
  reader.incrementOffset(4);
  const time = await reader.read4();
  result = {
    creationDate: new Date((time - 2082844800) * 1000),
  };
  reader.incrementOffset(box.size - 8);

  box = await scrollTo(reader, "meta");
  if (!box) {
    return result;
  }

  box = await scrollTo(reader, "keys");
  if (!box) {
    return result;
  }
  reader.incrementOffset(4);
  let keysCount = await reader.read4();
  const keys: Record<number, string> = {};
  for (let keyIndex = 0; keyIndex < keysCount; ++keyIndex) {
    const canRead = await reader.canRead();
    if (!canRead) {
      break;
    }
    const size = await reader.read4();
    reader.incrementOffset(4); // namespace is string of length 4
    const value = await reader.readAsciiString(size);
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
  const ilstReader = reader.getSubreader(box.size);
  reader.incrementOffset(box.size);
  while (true) {
    const canRead = await ilstReader.canRead();
    if (!canRead) {
      break;
    }
    const size = await ilstReader.read4();
    const index = (await ilstReader.read4()) - 1;
    if (keys[index]) {
      box = await scrollTo(reader, "data");
      if (!box) {
        break;
      }
      const type = await ilstReader.read4();
      ilstReader.incrementOffset(4); // locale is 4 bytes number
      const value = await ilstReader.readBuffer(8);
      if (type !== 1) {
        throw new Error(`unexpected type: ${type}`);
      }
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

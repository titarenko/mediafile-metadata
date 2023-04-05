# mediafile-metadata

Efficiently (only required bits) reads photo/video metadata.
Understands tiff/exif (jpeg, nef, cr2, etc), isobmff (mov, mp4, heic, etc) formats.

## Installation

```shell
npm i mediafile-metadata
```

## Example

```js
const mediafileMetadata = require("mediafile-metadata");
const essentials = await mediafileMetadata.getEssentials("/path/to/mediafile"); // path to photo or video file
console.log(essentials);
// {
//   creationDate: new Date("2022-05-10T15:48:20.000Z"),
//   camera: "Apple iPhone XS",
// }
```

## License

MIT

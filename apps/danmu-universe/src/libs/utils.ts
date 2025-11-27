import Base64 from "crypto-js/enc-base64";

export * from "@forward-widget/libs-utils";

export function base64ToUint8Array(base64: string): Uint8Array {
  const wordArray = Base64.parse(base64);
  const bytes = new Uint8Array(wordArray.sigBytes);

  for (let i = 0; i < wordArray.sigBytes; i++) {
    const wordIndex = i >>> 2;
    const byteIndex = i % 4;
    bytes[i] = (wordArray.words[wordIndex] >>> (24 - byteIndex * 8)) & 0xff;
  }

  return bytes;
}

export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

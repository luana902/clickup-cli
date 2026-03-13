export function createBufferStream() {
  let value = '';

  return {
    write(chunk) {
      value += String(chunk);
    },
    toString() {
      return value;
    },
  };
}

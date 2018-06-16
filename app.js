const UINT32_MAX_VALUE = Math.pow(2, 32) - 1;

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => {
  event.stopPropagation();
  event.preventDefault();

  const file = event.dataTransfer.files[0];
  const img = new Image();
  const reader = new FileReader();
  reader.onload = event => {
    img.src = event.target.result;
    img.onload = () => {
      const width = (canvas.width = img.naturalWidth);
      const height = (canvas.height = img.naturalHeight);

      context.drawImage(img, 0, 0);
      const imageData = context.getImageData(0, 0, width, height);
      canvas.width = width - 300;
      context.putImageData(seamCarving(imageData, 300), 0, 0);
    };
  };
  reader.readAsDataURL(file);
});

/**
 * @param {ImageData} originalImage
 */
function seamCarving(originalImage, carveLines) {
  // gray scale
  let gray = new Uint8ClampedArray(originalImage.data.length / 4);
  for (let i = 0; i < gray.length; ++i) {
    const v =
      0.2126 * originalImage.data[i * 4 + 0] +
      0.7152 * originalImage.data[i * 4 + 1] +
      0.0722 * originalImage.data[i * 4 + 2];
    gray[i] = v;
  }

  let carved = originalImage;
  for (let n = 0; n < carveLines; ++n) {
    const { data, width, height } = carved;

    // ===== Energy Map =====

    // laplacian filter
    const energy = new Uint8ClampedArray(gray.length);
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const xs = [Math.max(0, x - 1), x, Math.min(x + 1, width - 1)];
        const ys = [Math.max(0, y - 1), y, Math.min(y + 1, height - 1)];
        const v =
          gray[ys[0] * width + xs[0]] +
          gray[ys[0] * width + xs[1]] +
          gray[ys[0] * width + xs[2]] +
          gray[ys[1] * width + xs[0]] +
          gray[ys[1] * width + xs[1]] * -8 +
          gray[ys[1] * width + xs[2]] +
          gray[ys[2] * width + xs[0]] +
          gray[ys[2] * width + xs[1]] +
          gray[ys[2] * width + xs[2]];
        energy[y * width + x] = v;
      }
    }

    // ===== Seam Paths =====

    // by dynamic programing
    const dirTable = new Int8Array(energy.length);
    const costTable = new Uint32Array(energy.length);
    for (let x = 0; x < width; ++x) costTable[x] = energy[x];
    for (let y = 1; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const i = y * width + x;
        costTable[i] = UINT32_MAX_VALUE;
        for (let dir = -1; dir <= 1; ++dir) {
          const dx = x + dir;
          if (0 <= dx && dx < width) {
            const cost = costTable[(y - 1) * width + dx] + energy[i];
            if (cost < costTable[i]) {
              costTable[i] = cost;
              dirTable[i] = dir;
            }
          }
        }
      }
    }

    // find path (= seam)
    const bottom = costTable.slice(width * (height - 1));
    const minCost = bottom.reduce(
      (acc, c) => Math.min(acc, c),
      UINT32_MAX_VALUE
    );
    const path = new Uint32Array(height);
    for (let x = 0; x < width; ++x) {
      if (costTable[width * (height - 1) + x] !== minCost) continue;
      let dx = x;
      let dir;
      for (let y = height - 1; y > 0; y -= 1) {
        path[y] = dx;
        dir = dirTable[y * width + dx];
        dx += dir;
      }
      break;
    }

    // ===== carve =====

    carved = new ImageData(width - 1, height);
    const newGray = new Uint8ClampedArray(carved.data.length / 4);
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width - 1; ++x) {
        const di = y * (width - 1) + x;
        const si = y * width + (x < path[y] ? x : x + 1);
        carved.data[di * 4 + 0] = data[si * 4 + 0];
        carved.data[di * 4 + 1] = data[si * 4 + 1];
        carved.data[di * 4 + 2] = data[si * 4 + 2];
        carved.data[di * 4 + 3] = data[si * 4 + 3];
        newGray[di] = gray[si];
      }
    }
    gray = newGray;
  }

  return carved;
}

// const fitCanvas = () => {
//   canvas.width = document.body.clientWidth;
//   canvas.height = document.body.clientHeight;

//   // TODO: redraw
// };
// window.addEventListener('resize', fitCanvas);
// fitCanvas();

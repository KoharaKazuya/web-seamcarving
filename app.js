const message = document.querySelector('#message');
const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

let originalBuffer, originalWidth, originalHeight;

const worker = new Worker('worker.js');
worker.addEventListener('message', event => {
  const { width, height, buffer } = event.data.payload;
  canvas.width = width;
  canvas.height = height;
  const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
  context.putImageData(imageData, 0, 0);
  message.classList.remove('resizing');
  canvas.classList.remove('resizing');
});

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
      originalWidth = canvas.width = img.naturalWidth;
      originalHeight = canvas.height = img.naturalHeight;

      context.drawImage(img, 0, 0);
      const imageData = context.getImageData(
        0,
        0,
        originalWidth,
        originalHeight
      );
      originalBuffer = imageData.data.buffer;
    };
  };
  reader.readAsDataURL(file);

  document.querySelector('#prompt').style.display = 'none';
});

const throttleByRaf = f => {
  let running = false;
  return () => {
    if (running) return;
    running = true;
    requestAnimationFrame(() => {
      f();
      running = false;
    });
  };
};

const fitWithWindow = throttleByRaf(() => {
  const width = originalWidth;
  const height = originalHeight;
  const winWidth = document.body.clientWidth;
  const winHeight = document.body.clientHeight;

  if (width * winHeight > height * winWidth) {
    const carveLines = width - Math.floor((height * winWidth) / winHeight);
    const buffer = originalBuffer.slice(0); // clone buffer
    worker.postMessage({ payload: { width, height, buffer, carveLines } }, [
      buffer
    ]);
    message.classList.add('resizing');
    canvas.classList.add('resizing');
  }
});

window.addEventListener('resize', fitWithWindow);

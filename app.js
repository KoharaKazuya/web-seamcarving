const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

const worker = new Worker('worker.js');
worker.addEventListener('message', event => {
  const { width, height, buffer } = event.data.payload;
  canvas.width = width;
  canvas.height = height;
  const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
  context.putImageData(imageData, 0, 0);
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
      const width = (canvas.width = img.naturalWidth);
      const height = (canvas.height = img.naturalHeight);

      context.drawImage(img, 0, 0);
      const {
        data: { buffer }
      } = context.getImageData(0, 0, width, height);
      worker.postMessage({ payload: { width, height, buffer } }, [buffer]);
    };
  };
  reader.readAsDataURL(file);
});

// const fitCanvas = () => {
//   canvas.width = document.body.clientWidth;
//   canvas.height = document.body.clientHeight;

//   // TODO: redraw
// };
// window.addEventListener('resize', fitCanvas);
// fitCanvas();

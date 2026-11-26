if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/public/sw.js');
  });
}

document.addEventListener('change', (e) => {
  const input = e.target;
  if (input && input.type === 'file' && input.files && input.files[0]) {
    const preview = document.getElementById('foto-preview');
    if (preview) {
      preview.src = URL.createObjectURL(input.files[0]);
      preview.style.display = 'block';
    }
  }
});

const dropZone = document.getElementById('dropZone');
const destination = document.getElementById('destination');
const selectBtn = document.getElementById('selectBtn');
const resetBtn = document.getElementById('resetBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const currentFile = document.getElementById('currentFile');

let selectedFiles = [];

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragging');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragging');
});

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragging');
  
  const files = Array.from(e.dataTransfer.files).map(f => f.path);
  if (files.length > 0) {
    await handleTransfer(files);
  }
});

// File selection button
selectBtn.addEventListener('click', async () => {
  const folders = await window.api.selectFolder();
  if (folders.length > 0) {
    await handleTransfer(folders);
  }
});

// Transfer handler
async function handleTransfer(sources) {
  const dest = destination.value.trim();
  
  if (!dest) {
    showError('Please enter a destination path');
    return;
  }

  if (sources.length === 0) {
    showError('No files selected');
    return;
  }

  showTransferring();
  
  try {
    await window.api.startTransfer(sources, dest);
    showComplete();
  } catch (error) {
    showError(error);
  }
}

// Progress updates
window.api.onTransferProgress((data) => {
  if (data.progress) {
    progressFill.style.width = `${data.progress}%`;
    progressText.textContent = `${data.progress}%`;
  }
  if (data.currentFile) {
    currentFile.textContent = data.currentFile;
  }
});

// UI state helpers
function showTransferring() {
  document.getElementById('dropContent').style.display = 'none';
  document.getElementById('transferContent').style.display = 'block';
  document.getElementById('completeContent').style.display = 'none';
  document.getElementById('errorContent').style.display = 'none';
  progressBar.style.display = 'block';
  resetBtn.style.display = 'none';
  destination.disabled = true;
  selectBtn.disabled = true;
}

function showComplete() {
  document.getElementById('dropContent').style.display = 'none';
  document.getElementById('transferContent').style.display = 'none';
  document.getElementById('completeContent').style.display = 'block';
  document.getElementById('errorContent').style.display = 'none';
  progressBar.style.display = 'none';
  resetBtn.style.display = 'block';
}

function showError(message) {
  document.getElementById('dropContent').style.display = 'none';
  document.getElementById('transferContent').style.display = 'none';
  document.getElementById('completeContent').style.display = 'none';
  document.getElementById('errorContent').style.display = 'block';
  document.getElementById('errorMessage').textContent = message;
  progressBar.style.display = 'none';
  resetBtn.style.display = 'block';
  destination.disabled = false;
  selectBtn.disabled = false;
}

function reset() {
  document.getElementById('dropContent').style.display = 'block';
  document.getElementById('transferContent').style.display = 'none';
  document.getElementById('completeContent').style.display = 'none';
  document.getElementById('errorContent').style.display = 'none';
  progressBar.style.display = 'none';
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
  currentFile.textContent = '';
  resetBtn.style.display = 'none';
  destination.disabled = false;
  selectBtn.disabled = false;
}

resetBtn.addEventListener('click', reset);
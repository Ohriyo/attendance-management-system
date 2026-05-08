import { api } from './api.js';
import { showAlert } from './ui.js';

export function setupFileInputListener() {
    const fileInput = document.getElementById('csv-upload-input');
    const dropZone = document.getElementById('drop-zone');
    const fileInfo = document.getElementById('file-info');
    const fileNameDisplay = document.getElementById('filename-display');
    const uploadBtn = document.getElementById('upload-btn');
    const templateBtn = document.getElementById('download-template-btn'); 

    if (templateBtn) {
        templateBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent page jump
            
            const csvContent = "student_no,last_name,first_name,program,year_level,section\n23-00123,Dela Cruz,Juan,BSCS,1st,A\n";
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "student_import_template.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    if(!fileInput) return;

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            dropZone.classList.add('hidden');
            fileInfo.classList.remove('hidden');
            fileInfo.classList.add('flex');
            fileNameDisplay.textContent = file.name;
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-400', 'cursor-not-allowed');
            uploadBtn.classList.add('bg-brand-yellow', 'text-black', 'hover:shadow-lg', 'hover:scale-[1.02]', 'cursor-pointer');
            uploadBtn.innerHTML = '<i class="ph ph-check-circle text-lg"></i> Process Import';
        }
    });
}

export function clearFile() {
    const fileInput = document.getElementById('csv-upload-input');
    const dropZone = document.getElementById('drop-zone');
    const fileInfo = document.getElementById('file-info');
    const uploadBtn = document.getElementById('upload-btn');
    const feedback = document.getElementById('upload-feedback');

    fileInput.value = '';
    fileInfo.classList.add('hidden');
    fileInfo.classList.remove('flex');
    dropZone.classList.remove('hidden');
    feedback.classList.add('hidden');
    uploadBtn.disabled = true;
    uploadBtn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-400', 'cursor-not-allowed');
    uploadBtn.classList.remove('bg-brand-yellow', 'text-black', 'hover:shadow-lg', 'hover:scale-[1.02]', 'cursor-pointer');
    uploadBtn.innerHTML = 'Process Import';
}

export async function handleCSVUpload() {
    const fileInput = document.getElementById('csv-upload-input');
    const btn = document.getElementById('upload-btn');
    const labelSpan = fileInput.parentElement.querySelector('span');
    const warningIcon = document.getElementById('warning-icon');
    
    // UI Elements
    const feedback = document.getElementById('upload-feedback');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const statusDetail = document.getElementById('status-detail');
    const progressWrapper = document.getElementById('progress-wrapper');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    const progressCount = document.getElementById('progress-count');

    if (fileInput.files.length === 0) {
        showAlert('No File Selected', 'Please choose a CSV file first.', 'warning');
        return;
    }

    const file = fileInput.files[0];

    // File Validation (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showAlert('File Too Large', 'The file exceeds the 5MB limit.', 'error');
        return;
    }

    // Lock UI during upload
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    btn.innerHTML = 'Uploading...';
    fileInput.disabled = true; // Prevent selecting a new file mid-upload

    // Reset and show feedback UI
    feedback.classList.remove('hidden', 'bg-green-50', 'border-green-300');
    feedback.classList.add('flex', 'bg-gray-50', 'dark:bg-gray-800/50', 'border-gray-200', 'dark:border-gray-700');
    statusIcon.innerHTML = '<i class="ph ph-spinner animate-spin text-4xl text-brand-yellow"></i>';
    statusText.innerText = 'Parsing File...';
    statusDetail.innerText = 'Reading CSV data locally.';
    progressWrapper.classList.add('hidden');
    progressBar.style.width = '0%';

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            const rawData = results.data;
            const uniqueStudentsMap = new Map();
            rawData.forEach(row => {
                if (row.student_no && row.student_no.trim() !== '') {
                    uniqueStudentsMap.set(row.student_no.trim(), row);
                }
            });

            const data = Array.from(uniqueStudentsMap.values());

            const chunkSize = 500;
            let successCount = 0;
            let hasError = false;

            progressWrapper.classList.remove('hidden');
            statusText.innerText = 'Importing Students';

            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                let currentProgress = Math.round(((i) / data.length) * 100);
                progressBar.style.width = `${currentProgress}%`;
                progressPercent.innerText = `${currentProgress}%`;
                progressCount.innerText = `${i} / ${data.length} rows`;
                statusDetail.innerText = `Uploading chunk ${Math.floor(i/chunkSize) + 1} of ${Math.ceil(data.length/chunkSize)}...`;
                
                let attempts = 0;
                const maxRetries = 3;
                let chunkSuccess = false;

                while (attempts < maxRetries && !chunkSuccess) {
                    try {
                        const response = await api.importStudents(chunk);
                        
                        if (!response.ok) {
                            let errorMsg = "Server Error";
                            const contentType = response.headers.get("content-type");
                            if (contentType && contentType.includes("application/json")) {
                                const errData = await response.json();
                                errorMsg = errData.message;
                            }
                            throw new Error(errorMsg);
                        }
                        
                        chunkSuccess = true; 
                        successCount += chunk.length;

                    } catch (error) {
                        attempts++;
                        console.warn(`Chunk failed (Attempt ${attempts}/${maxRetries}):`, error.message);
                        
                        if (attempts >= maxRetries) {
                            hasError = true;
                            statusIcon.innerHTML = '<i class="ph ph-warning-circle text-4xl text-red-500"></i>';
                            statusText.innerText = 'Import Halted';
                            statusText.classList.replace('text-brand-dark', 'text-red-600');
                            statusDetail.innerText = `Failed at row ${i + 1}: ${error.message}`;
                            progressBar.classList.replace('bg-brand-yellow', 'bg-red-500');
                            feedback.classList.replace('border-gray-200', 'border-red-300');
                            break; // Break the while loop
                        } else {
                            // UI Feedback for retry
                            statusDetail.innerText = `Network glitch. Retrying chunk (${attempts}/${maxRetries})...`;
                            progressBar.classList.replace('bg-brand-yellow', 'bg-orange-400');
                            await new Promise(res => setTimeout(res, 2000)); // Wait 2 seconds before retrying
                            progressBar.classList.replace('bg-orange-400', 'bg-brand-yellow');
                        }
                    }
                }

                if (hasError) 
                    showAlert('Import Halted', `A critical error occurred at row ${i + 1}.`, 'error');
                break;
            }

            // Final UI Cleanup
            if (!hasError) {
                progressBar.style.width = `100%`;
                progressPercent.innerText = `100%`;
                progressCount.innerText = `${data.length} / ${data.length} rows`;
                
                statusIcon.innerHTML = '<i class="ph ph-check-circle text-4xl text-green-500"></i>';
                statusText.innerText = 'Import Complete!';
                statusText.classList.replace('text-brand-dark', 'text-green-600');
                statusDetail.innerText = `Successfully processed ${successCount} records.`;
                progressBar.classList.replace('bg-brand-yellow', 'bg-green-500');
                feedback.classList.replace('border-gray-200', 'border-green-300');
                feedback.classList.replace('bg-gray-50', 'bg-green-50');
                if (warningIcon) warningIcon.classList.add('hidden');
                
                fileInput.value = ''; 
                labelSpan.innerText = 'Click to upload'; 
            }

            // Unlock UI
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            btn.innerHTML = '<i class="ph ph-upload-simple text-xl border-none"></i> Process Import';
            fileInput.disabled = false;
        },
        error: function(err) {
            statusIcon.innerHTML = '<i class="ph ph-warning-circle text-4xl text-red-500"></i>';
            statusText.innerText = 'Parsing Error';
            statusDetail.innerText = `Failed to read CSV: ${err.message}`;
            progressWrapper.classList.add('hidden');
            
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            btn.innerHTML = '<i class="ph ph-upload-simple text-xl border-none"></i> Process Import';
            fileInput.disabled = false;
        }
    });
}
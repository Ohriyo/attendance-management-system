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
    const feedback = document.getElementById('upload-feedback');
    const btn = document.getElementById('upload-btn');
    const labelSpan = fileInput.parentElement.querySelector('span');

    if (fileInput.files.length === 0) {
        showAlert('No File Selected', 'Please choose a CSV file to upload first.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-2xl"></i> Uploading...'; 
    
    feedback.classList.add('hidden');
    feedback.className = 'hidden p-4 rounded-xl text-sm font-medium text-center'; 

    try {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const response = await api.importStudents(formData);
        const result = await response.json();

        feedback.classList.remove('hidden');
        if (response.ok) {
            feedback.classList.add('bg-green-50', 'dark:bg-green-900/30', 'text-green-700', 'dark:text-green-300', 'border', 'border-green-200', 'dark:border-green-800');
            feedback.innerHTML = `<i class="ph ph-check-circle text-xl mb-1"></i><br>Success! ${result.message}`;
            
            fileInput.value = ''; 
            labelSpan.innerText = 'Select a CSV file to upload'; 
            labelSpan.classList.remove('text-brand-dark', 'dark:text-white', 'font-medium');
            
            showAlert('Import Complete', result.message, 'success');
        } else {
             feedback.classList.add('bg-red-50', 'dark:bg-red-900/30', 'text-red-700', 'dark:text-red-300', 'border', 'border-red-200', 'dark:border-red-800');
            feedback.innerHTML = `<i class="ph ph-warning-circle text-xl mb-1"></i><br>Error: ${result.message}`;
        }

    } catch (error) {
        console.error(error);
        feedback.classList.remove('hidden');
        feedback.classList.add('bg-red-50', 'dark:bg-red-900/30', 'text-red-700', 'dark:text-red-300', 'border', 'border-red-200', 'dark:border-red-800');
        feedback.textContent = 'Network connection error during upload attempt.';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-upload-simple text-xl"></i> Upload & Process';
    }
}
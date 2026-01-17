/**
 * fileUtils.js
 * Utilities for file compression and handling
 */

export const FileUtils = {
    // Compress an image file
    async compressImage(file) {
        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: file.type
        };

        try {
            const compressedFile = await imageCompression(file, options);
            return compressedFile;
        } catch (error) {
            console.error('图片压缩失败:', error);
            return file; // Return original if compression fails
        }
    },

    // Compress a non-image file using ZIP
    async compressFile(file) {
        try {
            const zip = new JSZip();
            zip.file(file.name, file);
            const compressedBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 9 }
            });

            // Create a new File object with .zip extension
            const compressedFile = new File(
                [compressedBlob],
                `${file.name}.zip`,
                { type: 'application/zip' }
            );

            // Only return compressed if it's actually smaller
            return compressedFile.size < file.size ? compressedFile : file;
        } catch (error) {
            console.error('文件压缩失败:', error);
            return file;
        }
    },

    // Auto-detect and compress file
    async autoCompress(file) {
        const isImage = file.type.startsWith('image/');

        // Skip compression for already compressed formats
        const skipFormats = ['.zip', '.rar', '.7z', '.gz', '.mp4', '.mp3'];
        const shouldSkip = skipFormats.some(ext => file.name.toLowerCase().endsWith(ext));

        if (shouldSkip) {
            return { file, originalSize: file.size, compressedSize: file.size };
        }

        const originalSize = file.size;
        let compressedFile;

        if (isImage) {
            compressedFile = await this.compressImage(file);
        } else {
            compressedFile = await this.compressFile(file);
        }

        return {
            file: compressedFile,
            originalSize,
            compressedSize: compressedFile.size
        };
    },

    // Convert file to Base64
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove data:...;base64, prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // Convert Base64 to Blob for download
    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    },

    // Format file size for display
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    // Get file icon based on type
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            pdf: '📄',
            doc: '📝',
            docx: '📝',
            xls: '📊',
            xlsx: '📊',
            ppt: '📽️',
            pptx: '📽️',
            jpg: '🖼️',
            jpeg: '🖼️',
            png: '🖼️',
            gif: '🖼️',
            zip: '📦',
            rar: '📦',
            txt: '📃',
            default: '📎'
        };
        return iconMap[ext] || iconMap.default;
    },

    // Check if file can be previewed
    canPreview(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const previewable = ['jpg', 'jpeg', 'png', 'gif', 'pdf'];
        return previewable.includes(ext);
    }
};

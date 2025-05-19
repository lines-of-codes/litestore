import type { FileInfo } from "@/lib/files";

const imageExts = new Set(["png", "jpg", "jpeg", "bmp", "tif", "tiff", "webp"]);

export function getFileIcon(file: FileInfo) {
    if (file.is_folder) {
        return "bi bi-folder";
    }

    if (imageExts.has(file.filename.split(".").at(-1) as string)) {
        return "bi bi-file-image";
    }

    return "bi bi-file-earmark";
}

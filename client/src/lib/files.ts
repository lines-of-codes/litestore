import { getToken } from "./auth";

export interface FileInfo {
    id: number;
    filename: string;
    virtual_path: string;
    is_folder: boolean;
    parent_folder: number;
    created: Date;
    updated: Date;
    trashed: boolean;
    id_users: number;
}

function authHeader() {
    return {
        Authorization: `Bearer ${getToken()}`,
    };
}

export async function listFile(path: string): Promise<FileInfo[]> {
    const resp = await fetch(
        `${import.meta.env.VITE_LS_API}/api/files/list/${path}`,
        {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        },
    );

    if (!resp.ok) {
        let message = resp.statusText;

        try {
            message = (await resp.json()).message;
        } catch (err) {
            console.error(err);
        }

        throw Error(`ERR ${resp.status}: ${message}`);
    }

    const jsonData = await resp.json();

    return jsonData.files;
}

export function createFolder(path: string) {
    return fetch(`${import.meta.env.VITE_LS_API}/api/files/create/folder`, {
        method: "POST",
        body: JSON.stringify({
            path,
        }),
        headers: authHeader(),
    });
}

export function deleteFile(path: string) {
    return fetch(`${import.meta.env.VITE_LS_API}/api/files/delete`, {
        method: "DELETE",
        body: JSON.stringify({
            path,
        }),
        headers: authHeader(),
    });
}

interface UploadResponse {
    links: string[];
    sizes: number[];
}

export async function uploadFile(path: string, file: File) {
    const resp = await fetch(
        `${import.meta.env.VITE_LS_API}/api/files/upload`,
        {
            method: "POST",
            body: JSON.stringify({
                path,
                size: file.size,
            }),
            headers: authHeader(),
        },
    );

    const jsonData = await resp.json();

    if (!resp.ok) {
        throw Error(`ERR ${resp.status}: ${jsonData.message}`);
    }

    const uploadInstruction = jsonData as UploadResponse;

    if (uploadInstruction.links.length !== uploadInstruction.sizes.length) {
        throw Error(
            `Unexpected Behavior Error: Upload instruction returned by the API is invalid.`,
        );
    }

    let nextByte = 0;
    for (let i = 0; i < uploadInstruction.links.length; i++) {
        const link = uploadInstruction.links[i];
        const size = uploadInstruction.sizes[i];

        await fetch(link, {
            method: "PUT",
            body: file.slice(nextByte, size),
        });

        nextByte += size;
    }
}

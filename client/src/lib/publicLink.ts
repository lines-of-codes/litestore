export interface PublicLinkInfo {
    filename: string;
    passwordProtected: boolean;
    downloadCount: number;
}

export async function getFileLinkInfo(
    shareId: string,
): Promise<PublicLinkInfo> {
    const resp = await fetch(
        `${import.meta.env.VITE_LS_API}/api/files/link/${shareId}`,
    );

    const jsonData = await resp.json();

    if (!resp.ok) {
        throw Error(`ERR ${resp.status}: ${jsonData.message}`);
    }

    return jsonData as PublicLinkInfo;
}

export async function downloadPublicFile(uuid: string) {
    const resp = await fetch(
        `${import.meta.env.VITE_LS_API}/api/files/link/${uuid}/download`,
    );

    const jsonData = await resp.json();

    if (!resp.ok) {
        throw Error(`ERR ${resp.status}: ${jsonData.message}`);
    }

    window.open(jsonData.url, "_blank")?.focus();
}

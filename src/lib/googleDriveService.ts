export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  size: number;
  mimeType: string;
}

const FOLDER_NAME = 'Launch Tracker Documents';
const CACHE_FOLDER_ID = 'launch_tracker_drive_folder_id';

export class GoogleDriveService {
  private static cachedFolderId: string | null =
    localStorage.getItem(CACHE_FOLDER_ID) || null;

  // Find or create dedicated folder in Google Drive
  static async getOrCreateFolder(accessToken: string): Promise<string> {
    if (this.cachedFolderId) {
      try {
        const verifyRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${this.cachedFolderId}?fields=id,trashed`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (verifyRes.ok) {
          const folder = await verifyRes.json();
          if (!folder.trashed) return this.cachedFolderId;
        }
      } catch {}
    }

    // Search for existing folder
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
        FOLDER_NAME
      )}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id, name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        const folderId = data.files[0].id;
        this.cachedFolderId = folderId;
        localStorage.setItem(CACHE_FOLDER_ID, folderId);
        return folderId;
      }
    }

    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      throw new Error('Failed to create folder in Google Drive');
    }

    const folder = await createRes.json();
    this.cachedFolderId = folder.id;
    localStorage.setItem(CACHE_FOLDER_ID, folder.id);
    return folder.id;
  }

  // Upload file directly to Google Drive via multipart
  static async uploadFile(
    accessToken: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<DriveUploadResult> {
    const folderId = await this.getOrCreateFolder(accessToken);

    const metadata = {
      name: file.name,
      parents: [folderId],
      mimeType: file.type || 'application/octet-stream',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
      fileReader.onload = async () => {
        try {
          const fileData = fileReader.result as ArrayBuffer;

          // Build multipart body
          const metadataPart =
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            JSON.stringify(metadata);

          const contentType = file.type || 'application/octet-stream';
          const fileHeader = `Content-Type: ${contentType}\r\n\r\n`;

          const metadataBytes = new TextEncoder().encode(
            delimiter + metadataPart + delimiter + fileHeader
          );
          const closeBytes = new TextEncoder().encode(closeDelimiter);

          const combined = new Uint8Array(
            metadataBytes.byteLength +
              fileData.byteLength +
              closeBytes.byteLength
          );

          combined.set(metadataBytes, 0);
          combined.set(new Uint8Array(fileData), metadataBytes.byteLength);
          combined.set(
            closeBytes,
            metadataBytes.byteLength + fileData.byteLength
          );

          if (onProgress) onProgress(30);

          const uploadRes = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size,mimeType',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
              },
              body: combined,
            }
          );

          if (onProgress) onProgress(85);

          if (!uploadRes.ok) {
            const err = await uploadRes.json();
            throw new Error(err.error?.message || 'Failed to upload to Google Drive');
          }

          const result = await uploadRes.json();
          if (onProgress) onProgress(100);

          resolve({
            id: result.id,
            name: result.name || file.name,
            webViewLink:
              result.webViewLink ||
              `https://drive.google.com/file/d/${result.id}/view`,
            webContentLink: result.webContentLink,
            size: Number(result.size) || file.size,
            mimeType: result.mimeType || file.type,
          });
        } catch (err) {
          reject(err);
        }
      };

      fileReader.onerror = () => reject(new Error('Failed to read file from disk'));
      fileReader.readAsArrayBuffer(file);
    });
  }
}

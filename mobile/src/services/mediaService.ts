import RNFS from 'react-native-fs';

export class MediaService {
  private mediaDir = `${RNFS.DocumentDirectoryPath}/veil_media`;

  async init() {
    const exists = await RNFS.exists(this.mediaDir);
    if (!exists) {
      await RNFS.mkdir(this.mediaDir);
    }
  }

  /**
   * Downloads a remote URL to the device DocumentDirectory.
   * Returns the local file:// path.
   */
  async downloadMedia(remoteUrl: string, fileExtension: string = 'jpg'): Promise<string | null> {
    if (!remoteUrl || !remoteUrl.startsWith('http')) return remoteUrl;

    try {
      await this.init();

      // Create a somewhat unique filename based on the URL
      // A simple string hash to prevent weird characters in filenames
      const hash = this.simpleHash(remoteUrl);
      const fileName = `${hash}.${fileExtension}`;
      const localPath = `${this.mediaDir}/${fileName}`;

      // Check if already downloaded
      const exists = await RNFS.exists(localPath);
      if (exists) {
        return `file://${localPath}`;
      }

      // Download
      const result = await RNFS.downloadFile({
        fromUrl: remoteUrl,
        toFile: localPath,
        background: true,
      }).promise;

      if (result.statusCode === 200) {
        return `file://${localPath}`;
      } else {
        console.warn(`[MediaService] Download failed with status ${result.statusCode} for ${remoteUrl}`);
        return null;
      }
    } catch (e) {
      console.error('[MediaService] Download error', e);
      return null;
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

export const mediaService = new MediaService();

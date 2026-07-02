/** Loads and caches images/JSON so scenes can request assets by path without re-fetching. */
export class AssetLoader {
  private images = new Map<string, HTMLImageElement>();
  private json = new Map<string, unknown>();

  async loadImage(path: string): Promise<HTMLImageElement> {
    const cached = this.images.get(path);
    if (cached) return cached;

    const img = new Image();
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${path}`));
    });
    img.src = path;
    this.images.set(path, await loaded);
    return img;
  }

  async loadJson<T>(path: string): Promise<T> {
    const cached = this.json.get(path);
    if (cached) return cached as T;

    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load JSON: ${path}`);
    const data = (await response.json()) as T;
    this.json.set(path, data);
    return data;
  }
}

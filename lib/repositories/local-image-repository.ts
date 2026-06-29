import type { ProjectImage, ProjectImageTag } from "@/lib/types";
import type { ImageRepository } from "@/lib/repositories/image-repository";
import {
  addProjectImages,
  deleteProjectImages,
  loadProjectImages,
  releaseProjectImageUrls,
  setProjectImageTags,
  toggleProjectImageFavorite
} from "@/lib/project-images";

export class LocalImageRepository implements ImageRepository {
  async loadImages(projectId: string): Promise<ProjectImage[]> {
    return loadProjectImages(projectId);
  }

  async addImages(projectId: string, files: File[], capturedDates?: (string | null)[]): Promise<ProjectImage[]> {
    return addProjectImages(projectId, files, capturedDates);
  }

  async toggleFavorite(projectId: string, imageId: string): Promise<void> {
    return toggleProjectImageFavorite(projectId, imageId);
  }

  async setTags(projectId: string, imageId: string, tags: ProjectImageTag[]): Promise<void> {
    return setProjectImageTags(projectId, imageId, tags);
  }

  releaseUrls(images: ProjectImage[]): void {
    releaseProjectImageUrls(images);
  }

  async deleteAll(projectId: string) {
    return deleteProjectImages(projectId);
  }

  async deleteImage(projectId: string, imageId: string) {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("weddingflow", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<void>((resolve, reject) => {
      const store = database.transaction("project-images", "readwrite").objectStore("project-images");
      const request = store.delete(imageId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { database.close(); resolve(); };
    });
  }
}

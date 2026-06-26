import type { ProjectVideo } from "@/lib/types";

const DB_NAME = "weddingflow";
const DB_VERSION = 1;
const STORE_NAME = "project-videos";
const PROJECT_INDEX = "projectId";
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_FILES = 10;
const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_QUALITY = 0.78;

type StoredProjectVideo = Omit<ProjectVideo, "videoUrl" | "thumbnailUrl"> & {
  blob: Blob;
  thumbnail: Blob;
};

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB-Anfrage fehlgeschlagen."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB-Transaktion fehlgeschlagen."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB-Transaktion abgebrochen."));
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      // Create video store if it doesn't exist (DB_VERSION stays 1, store created on demand)
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex(PROJECT_INDEX, PROJECT_INDEX, { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Videospeicher konnte nicht geöffnet werden."));
  });
}

async function createVideoThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Canvas-Kontext konnte nicht erzeugt werden."));
      return;
    }

    const url = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };

    video.onloadeddata = () => {
      // Seek to 1 second or 10% of duration for a good thumbnail
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      const scale = Math.min(1, THUMBNAIL_WIDTH / video.videoWidth);
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      cleanup();

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Video-Vorschaubild konnte nicht gespeichert werden."));
        },
        "image/jpeg",
        THUMBNAIL_QUALITY
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Video konnte nicht für Vorschau geladen werden."));
    };

    video.src = url;
    video.load();
  });
}

function toProjectVideo(stored: StoredProjectVideo): ProjectVideo {
  const { blob, thumbnail, ...metadata } = stored;
  return {
    ...metadata,
    videoUrl: URL.createObjectURL(blob),
    thumbnailUrl: URL.createObjectURL(thumbnail),
  };
}

export async function loadProjectVideos(projectId: string): Promise<ProjectVideo[]> {
  const database = await openDatabase();
  try {
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      return [];
    }
    const transaction = database.transaction(STORE_NAME, "readonly");
    const index = transaction.objectStore(STORE_NAME).index(PROJECT_INDEX);
    const storedVideos = await requestResult(index.getAll(projectId) as IDBRequest<StoredProjectVideo[]>);
    return storedVideos.map(toProjectVideo);
  } finally {
    database.close();
  }
}

export async function addProjectVideos(projectId: string, files: File[]): Promise<ProjectVideo[]> {
  const database = await openDatabase();
  try {
    // Ensure store exists
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.close();
      // Re-open to trigger onupgradeneeded
      const dbV2 = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION + 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
            store.createIndex(PROJECT_INDEX, PROJECT_INDEX, { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      dbV2.close();
      return addProjectVideos(projectId, files);
    }

    const storedVideos: StoredProjectVideo[] = [];
    for (const file of files) {
      if (file.size > MAX_VIDEO_SIZE) {
        throw new Error(`Video "${file.name}" ist zu groß. Maximum ist ${MAX_VIDEO_SIZE / 1024 / 1024} MB.`);
      }

      const thumbnail = await createVideoThumbnail(file);

      storedVideos.push({
        id: `vid-${crypto.randomUUID()}`,
        projectId,
        name: file.name,
        blob: file,
        thumbnail,
        duration: 0, // Will be set from video metadata
        size: file.size,
        createdAt: new Date().toISOString(),
      });
    }

    // Get duration for each video
    for (const stored of storedVideos) {
      try {
        stored.duration = await new Promise<number>((resolve) => {
          const video = document.createElement("video");
          const url = URL.createObjectURL(stored.blob);
          video.preload = "metadata";
          video.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(Math.round(video.duration));
          };
          video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(0);
          };
          video.src = url;
        });
      } catch {
        stored.duration = 0;
      }
    }

    const writeTransaction = database.transaction(STORE_NAME, "readwrite");
    const store = writeTransaction.objectStore(STORE_NAME);
    storedVideos.forEach((video) => store.add(video));
    await transactionDone(writeTransaction);
    return storedVideos.map(toProjectVideo);
  } finally {
    database.close();
  }
}

export async function deleteProjectVideo(projectId: string, videoId: string): Promise<void> {
  const database = await openDatabase();
  try {
    if (!database.objectStoreNames.contains(STORE_NAME)) return;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const stored = await requestResult(store.get(videoId) as IDBRequest<StoredProjectVideo | undefined>);
    if (!stored || stored.projectId !== projectId) {
      transaction.abort();
      return;
    }
    store.delete(videoId);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function deleteProjectVideos(projectId: string): Promise<void> {
  const database = await openDatabase();
  try {
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.close();
      return;
    }
    const store = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
    const index = store.index(PROJECT_INDEX);
    const request = index.openCursor(IDBKeyRange.only(projectId));
    return new Promise<void>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          database.close();
          resolve();
        }
      };
    });
  } catch {
    database.close();
  }
}

export function releaseProjectVideoUrls(videos: ProjectVideo[]): void {
  videos.forEach((video) => {
    URL.revokeObjectURL(video.videoUrl);
    URL.revokeObjectURL(video.thumbnailUrl);
  });
}

export function getVideoBlobUrl(videoId: string): Promise<string | null> {
  return openDatabase().then(async (database) => {
    try {
      if (!database.objectStoreNames.contains(STORE_NAME)) return null;
      const transaction = database.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const stored = await requestResult(store.get(videoId) as IDBRequest<StoredProjectVideo | undefined>);
      if (!stored) return null;
      return URL.createObjectURL(stored.blob);
    } finally {
      database.close();
    }
  });
}

export function getVideoBlob(videoId: string): Promise<Blob | null> {
  return openDatabase().then(async (database) => {
    try {
      if (!database.objectStoreNames.contains(STORE_NAME)) return null;
      const transaction = database.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const stored = await requestResult(store.get(videoId) as IDBRequest<StoredProjectVideo | undefined>);
      if (!stored) return null;
      return stored.blob;
    } finally {
      database.close();
    }
  });
}

export const MAX_VIDEO_FILES = MAX_FILES;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE;

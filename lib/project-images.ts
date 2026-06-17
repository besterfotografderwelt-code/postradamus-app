import type { ProjectImage, ProjectImageTag } from "@/lib/types";

const DB_NAME = "weddingflow";
const DB_VERSION = 1;
const STORE_NAME = "project-images";
const PROJECT_INDEX = "projectId";
const LEGACY_STORAGE_KEY = "weddingflow.project-images.v1";
const MAX_THUMBNAIL_EDGE = 1600;
const THUMBNAIL_QUALITY = 0.82;

type StoredProjectImage = Omit<ProjectImage, "thumbnailUrl"> & {
  original?: Blob;
  thumbnail: Blob;
};

type LegacyProjectImage = Omit<ProjectImage, "thumbnailUrl"> & {
  dataUrl: string;
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
      const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex(PROJECT_INDEX, PROJECT_INDEX, { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Bildspeicher konnte nicht geöffnet werden."));
  });
}

async function createThumbnail(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_THUMBNAIL_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Vorschaubild konnte nicht erzeugt werden.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Vorschaubild konnte nicht gespeichert werden."))),
      "image/jpeg",
      THUMBNAIL_QUALITY
    );
  });
}

function toProjectImage(image: StoredProjectImage): ProjectImage {
  const { original, thumbnail, ...metadata } = image;
  return {
    ...metadata,
    originalUrl: URL.createObjectURL(original ?? thumbnail),
    thumbnailUrl: URL.createObjectURL(thumbnail)
  };
}

async function migrateLegacyImages(database: IDBDatabase) {
  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;

  try {
    const legacyImages = JSON.parse(raw) as LegacyProjectImage[];
    if (!Array.isArray(legacyImages) || legacyImages.length === 0) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    const storedImages = await Promise.all(
      legacyImages.map(async ({ dataUrl, ...metadata }) => ({
        ...metadata,
        original: await fetch(dataUrl).then((response) => response.blob()),
        thumbnail: await fetch(dataUrl).then((response) => response.blob())
      }))
    );
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    storedImages.forEach((image) => store.put(image));
    await transactionDone(transaction);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Keep legacy data untouched if migration fails.
  }
}

export async function loadProjectImages(projectId: string) {
  const database = await openDatabase();
  try {
    await migrateLegacyImages(database);
    const transaction = database.transaction(STORE_NAME, "readonly");
    const index = transaction.objectStore(STORE_NAME).index(PROJECT_INDEX);
    const storedImages = await requestResult(index.getAll(projectId) as IDBRequest<StoredProjectImage[]>);
    return storedImages
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toProjectImage);
  } finally {
    database.close();
  }
}

export async function addProjectImages(projectId: string, files: File[]) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const index = transaction.objectStore(STORE_NAME).index(PROJECT_INDEX);
    const existing = await requestResult(index.getAll(projectId) as IDBRequest<StoredProjectImage[]>);
    const nextSortOrder = existing.length;
    const storedImages = await Promise.all(
      files.map(async (file, indexPosition): Promise<StoredProjectImage> => ({
        id: `img-${crypto.randomUUID()}`,
        projectId,
        name: file.name,
        original: file,
        thumbnail: await createThumbnail(file),
        isFavorite: false,
        tags: [],
        sortOrder: nextSortOrder + indexPosition,
        createdAt: new Date().toISOString()
      }))
    );

    const writeTransaction = database.transaction(STORE_NAME, "readwrite");
    const store = writeTransaction.objectStore(STORE_NAME);
    storedImages.forEach((image) => store.add(image));
    await transactionDone(writeTransaction);
    return storedImages.map(toProjectImage);
  } finally {
    database.close();
  }
}

async function updateStoredImage(
  projectId: string,
  imageId: string,
  updater: (image: StoredProjectImage) => StoredProjectImage
) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const image = await requestResult(store.get(imageId) as IDBRequest<StoredProjectImage | undefined>);
    if (!image || image.projectId !== projectId) {
      transaction.abort();
      throw new Error("Bild wurde nicht gefunden.");
    }
    store.put(updater(image));
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export function toggleProjectImageFavorite(projectId: string, imageId: string) {
  return updateStoredImage(projectId, imageId, (image) => ({
    ...image,
    isFavorite: !image.isFavorite
  }));
}

export function setProjectImageTags(projectId: string, imageId: string, tags: ProjectImageTag[]) {
  return updateStoredImage(projectId, imageId, (image) => ({
    ...image,
    tags
  }));
}

export function releaseProjectImageUrls(images: ProjectImage[]) {
  images.forEach((image) => {
    if (image.originalUrl) URL.revokeObjectURL(image.originalUrl);
    URL.revokeObjectURL(image.thumbnailUrl);
  });
}

export async function deleteProjectImages(projectId: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const store = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
    const index = store.index(PROJECT_INDEX);
    const request = index.openCursor(IDBKeyRange.only(projectId));
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
}

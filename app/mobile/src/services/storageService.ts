// ─── Firebase Storage Service ───────────────────────────────────────────────
// Image upload for community posts
// ────────────────────────────────────────────────────────────────────────────

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress an image before uploading to Firebase Storage.
 * Max width: 800px, JPEG quality: 70%.
 * This reduces a typical 3-5MB phone photo to ~100-300KB.
 */
async function compressForUpload(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch (e) {
    console.warn('[storageService] Compression failed, using original:', e);
    return uri;
  }
}

/**
 * Upload an image to Firebase Storage and return its public download URL.
 * Images are compressed before upload to save storage and bandwidth.
 * Images are stored under `community/{uid}/{timestamp}_{random}.jpg`
 */
export async function uploadCommunityImage(
  uid: string,
  localUri: string,
): Promise<string> {
  // Compress before uploading
  const compressedUri = await compressForUpload(localUri);

  // Fetch the image as a blob
  const response = await fetch(compressedUri);
  const blob = await response.blob();

  // Create a unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `community_images/${uid}/${timestamp}_${random}.jpg`;
  const storageRef = ref(storage, filename);

  // Upload with resumable upload (more reliable on mobile)
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (_snapshot) => {
        // Could emit progress here if needed
      },
      (error) => {
        console.error('Upload failed:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

/**
 * Upload a generic image (e.g. profile photo) and return its download URL.
 * Images are compressed before upload to save storage and bandwidth.
 */
export async function uploadImage(
  path: string,
  localUri: string,
): Promise<string> {
  const compressedUri = await compressForUpload(localUri);
  const response = await fetch(compressedUri);
  const blob = await response.blob();

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      null,
      (error) => reject(error),
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

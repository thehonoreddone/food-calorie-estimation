// ─── Firebase Storage Service ───────────────────────────────────────────────
// Image upload for community posts
// ────────────────────────────────────────────────────────────────────────────

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Upload an image to Firebase Storage and return its public download URL.
 * Images are stored under `community_images/{uid}/{timestamp}_{random}.jpg`
 */
export async function uploadCommunityImage(
  uid: string,
  localUri: string,
): Promise<string> {
  // Fetch the image as a blob
  const response = await fetch(localUri);
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
 * Upload a generic image (e.g. profile photo) and return its download URL
 */
export async function uploadImage(
  path: string,
  localUri: string,
): Promise<string> {
  const response = await fetch(localUri);
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

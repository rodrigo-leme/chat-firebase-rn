import cloudinaryConfig from '../../cloudinaryConfig.json';

/** Arquivo local no formato aceito pelo FormData do React Native. */
type LocalFile = { uri: string; name: string; type: string };

type CloudinaryResponse = { secure_url?: string; error?: { message?: string } };

/**
 * Envia a imagem ao Cloudinary (upload "unsigned", sem segredo no app)
 * e retorna apenas a URL HTTPS final, que é o que vai para o Firestore.
 */
export async function uploadImage(localUri: string, folder: string): Promise<string> {
  const extension = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const file: LocalFile = {
    uri: localUri,
    name: `photo.${extension}`,
    type: extension === 'png' ? 'image/png' : 'image/jpeg',
  };

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', cloudinaryConfig.uploadPreset);
  form.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const json = (await response.json()) as CloudinaryResponse;
  if (!response.ok || !json.secure_url) {
    throw new Error('image-upload-failed');
  }
  return json.secure_url;
}

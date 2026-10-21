import { useEffect, useState } from "react";
import { Image } from "react-native";
import { Skia, type SkImage } from "react-native-skia";

type ImageSet = Readonly<Record<string, SkImage>>;

// Decoded image sets by their source table, most recently used last, so going from one level to
// the next in the same district reuses the uploaded textures instead of decoding the 1536 px
// background again. At most two districts are kept (the one leaving and the one coming in). An
// older set is only dropped from the cache, not disposed: a screen still mounted under a deep link
// may draw it, and its textures are freed once no screen holds them.
const KEEP = 2;
const cache = new Map<object, Promise<ImageSet>>();

function load(sources: Readonly<Record<string, number>>): Promise<ImageSet> {
  let pending = cache.get(sources);
  if (pending) {
    cache.delete(sources);
  } else {
    pending = Promise.all(
      Object.entries(sources).map(async ([key, source]) => {
        const data = await Skia.Data.fromURI(Image.resolveAssetSource(source).uri);
        const image = Skia.Image.MakeImageFromEncoded(data);
        if (!image) throw new Error(`could not decode image "${key}"`);
        // Upload once now, so the first frame does not decode and upload on the render thread;
        // the CPU copy is not needed after that.
        const texture = image.makeTextureImage();
        if (texture !== image) image.dispose();
        return [key, texture] as const;
      }),
    ).then((decoded) => Object.fromEntries(decoded) as ImageSet);
    pending.catch(() => cache.delete(sources));
  }
  cache.set(sources, pending);
  for (const key of cache.keys()) {
    if (cache.size <= KEEP) break;
    cache.delete(key);
  }
  return pending;
}

// Starts decoding a district's images ahead of time (for example while the win sheet of the
// district's last level is up), so the next level opens with its board drawn.
export function preloadImages(sources: Readonly<Record<string, number>>): void {
  void load(sources).catch(() => undefined);
}

// A fixed set of bundled images, decoded once per app run. Returns null until every image is
// ready, so a scene never draws with some sprites missing; a failure throws to the nearest error
// boundary. `sources` must be a module-level constant (it is the cache key).
export function useImages<K extends string>(sources: Readonly<Record<K, number>>): Readonly<Record<K, SkImage>> | null {
  const [loaded, setLoaded] = useState<{ sources: object; images: ImageSet } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  if (error) throw error;

  useEffect(() => {
    let alive = true;
    load(sources).then(
      (images) => {
        if (alive) setLoaded({ sources, images });
      },
      (cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause : new Error(String(cause)));
      },
    );
    return () => {
      alive = false;
    };
  }, [sources]);

  return loaded?.sources === sources ? (loaded.images as Readonly<Record<K, SkImage>>) : null;
}

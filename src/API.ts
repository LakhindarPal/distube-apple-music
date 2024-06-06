import fetch from "isomorphic-unfetch";
import { parse } from "node-html-parser";
import type { HTMLElement } from "node-html-parser";

function getHTML(link: string): Promise<HTMLElement | null> {
  return fetch(link, {
    headers: {
      "User-Agent":
        // eslint-disable-next-line max-len
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.49",
    },
  })
    .then(r => r.text())
    .then(
      txt => parse(txt),
      () => null,
    );
}

function makeImage({ height, url, width, ext = "jpg" }: { url: string; width: number; height: number; ext?: string }) {
  return url.replace("{w}", `${width}`).replace("{h}", `${height}`).replace("{f}", ext);
}

export class AppleMusic {
  public constructor() {
    return AppleMusic;
  }

  public static async search(query: string) {
    try {
      const url = `https://music.apple.com/us/search?term=${encodeURIComponent(query)}`;
      const node = await getHTML(url);
      if (!node) return [];

      const rawData = node.getElementById("serialized-server-data");
      if (!rawData) return [];

      const data = JSON.parse(rawData.innerText)[0].data.sections;
      const tracks = data.find((s: any) => s.itemKind === "trackLockup")?.items;
      if (!tracks) return [];

      return tracks.map((track: any) => ({
        id: track.contentDescriptor.identifiers.storeAdamID,
        duration: track.duration || "0:00",
        title: track.title,
        url: track.contentDescriptor.url,
        thumbnail: track?.artwork?.dictionary
          ? makeImage({
              url: track.artwork.dictionary.url,
              height: track.artwork.dictionary.height,
              width: track.artwork.dictionary.width,
            })
          : "https://music.apple.com/assets/favicon/favicon-180.png",
        artist: {
          name: track.subtitleLinks?.[0]?.title ?? "Unknown Artist",
        },
        type: "track",
      }));
    } catch {
      return [];
    }
  }

  public static getSongInfoFallback(res: HTMLElement, name: string, id: string, link: string) {
    try {
      const metaTags = res.getElementsByTagName("meta");
      if (!metaTags.length) return null;

      const title =
        metaTags.find(r => r.getAttribute("name") === "apple:title")?.getAttribute("content") ||
        res.querySelector("title")?.innerText ||
        name;
      const contentId =
        metaTags.find(r => r.getAttribute("name") === "apple:content_id")?.getAttribute("content") || id;

      const song = {
        id: contentId,
        title,
        url: link,
        thumbnail:
          metaTags
            .find(r => ["og:image:secure_url", "og:image"].includes(r.getAttribute("property")!))
            ?.getAttribute("content") || "https://music.apple.com/assets/favicon/favicon-180.png",
        artist: {
          name: res.querySelector(".song-subtitles__artists>a")?.textContent?.trim() || "Apple Music",
        },
        type: "track",
      };

      return song;
    } catch {
      return null;
    }
  }

  public static async getSongInfo(link: string) {
    const url = new URL(link);
    const id = url.searchParams.get("i");
    const name = url.pathname.split("album/")[1]?.split("/")[0];

    if (!id || !name) return null;

    const res = await getHTML(`https://music.apple.com/us/song/${name}/${id}`);
    if (!res) return null;

    try {
      const datasrc =
        res.getElementById("serialized-server-data")?.innerText ||
        res.innerText
          .split('<script type="application/json" id="serialized-server-data">')?.[1]
          ?.split("</script>")?.[0];
      if (!datasrc) throw "not found";
      const data = JSON.parse(datasrc)[0].data.seoData;
      const song = data.ogSongs[0]?.attributes;

      return {
        id: data.ogSongs[0]?.id || data.appleContentId || id,
        title: song?.name || data.appleTitle,
        url: song?.url || data.url || link,
        thumbnail: song?.artwork
          ? makeImage({
              url: song.artwork.url,
              height: song.artwork.height,
              width: song.artwork.width,
            })
          : data.artworkUrl
            ? makeImage({
                height: data.height,
                width: data.width,
                url: data.artworkUrl,
                ext: data.fileType || "jpg",
              })
            : "https://music.apple.com/assets/favicon/favicon-180.png",
        artist: {
          name: song?.artistName || data.socialTitle || "Apple Music",
        },
        type: "track",
      };
    } catch {
      return this.getSongInfoFallback(res, name, id, link);
    }
  }

  public static async getPlaylistInfo(link: string) {
    const res = await getHTML(link);
    if (!res) return null;

    try {
      const datasrc =
        res.getElementById("serialized-server-data")?.innerText ||
        res.innerText
          .split('<script type="application/json" id="serialized-server-data">')?.[1]
          ?.split("</script>")?.[0];
      if (!datasrc) throw "not found";
      const pl = JSON.parse(datasrc)[0].data.seoData;
      const thumbnail = pl.artworkUrl
        ? makeImage({
            height: pl.height,
            width: pl.width,
            url: pl.artworkUrl,
            ext: pl.fileType || "jpg",
          })
        : "https://music.apple.com/assets/favicon/favicon-180.png";
      return {
        id: pl.appleContentId,
        title: pl.appleTitle,
        thumbnail,
        artist: {
          name: pl.ogSongs?.[0]?.attributes?.artistName || "Apple Music",
        },
        url: pl.url,
        type: "playlist",
        tracks:
          // eslint-disable-next-line
          pl.ogSongs?.map((m: any) => {
            const song = m.attributes;
            return {
              id: m.id,
              title: song.name,
              url: song.url,
              thumbnail: song.artwork
                ? makeImage({
                    url: song.artwork.url,
                    height: song.artwork.height,
                    width: song.artwork.width,
                  })
                : thumbnail,
              artist: {
                name: song.artistName || "Apple Music",
              },
              type: "track",
            };
          }) || [],
      };
    } catch {
      return null;
    }
  }

  public static async getAlbumInfo(link: string) {
    const res = await getHTML(link);
    if (!res) return null;

    try {
      const datasrc =
        res.getElementById("serialized-server-data")?.innerText ||
        res.innerText
          .split('<script type="application/json" id="serialized-server-data">')?.[1]
          ?.split("</script>")?.[0];
      if (!datasrc) throw "not found";
      const pl = JSON.parse(datasrc)[0].data.seoData;
      const thumbnail = pl.artworkUrl
        ? makeImage({
            height: pl.height,
            width: pl.width,
            url: pl.artworkUrl,
            ext: pl.fileType || "jpg",
          })
        : "https://music.apple.com/assets/favicon/favicon-180.png";
      return {
        id: pl.appleContentId,
        title: pl.appleTitle,
        thumbnail,
        artist: {
          name: pl.ogSongs?.[0]?.attributes?.artistName || "Apple Music",
        },
        url: pl.url,
        type: "album",
        tracks:
          // eslint-disable-next-line
          pl.ogSongs?.map((m: any) => {
            const song = m.attributes;
            return {
              id: m.id,
              title: song.name,
              url: song.url,
              thumbnail: song.artwork
                ? makeImage({
                    url: song.artwork.url,
                    height: song.artwork.height,
                    width: song.artwork.width,
                  })
                : thumbnail,
              artist: {
                name: song.artistName || "Apple Music",
              },
              type: "track",
            };
          }) || [],
      };
    } catch {
      return null;
    }
  }
}

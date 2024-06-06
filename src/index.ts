import { AppleMusic } from "./API";
import { DisTubeError, InfoExtractorPlugin, Playlist, Song } from "distube";
import type { ResolveOptions } from "distube";
import type { ApplePlaylist, AppleSong } from "./interfaces";

const SUPPORTED_TYPES = ["album", "playlist", "track"];

const SONG_REGEX = /^https?:\/\/music\.apple\.com\/.+?\/(song|album)\/.+?(\/.+?\?i=|\/)([0-9]+)$/;
const PLAYLIST_REGEX = /^https?:\/\/music\.apple\.com\/.+?\/playlist\/.+\/pl\.(u-|pm-)?[a-zA-Z0-9]+$/;
const ALBUM_REGEX = /^https?:\/\/music\.apple\.com\/.+?\/album\/.+\/([0-9]+)$/;

const parseURL = (url: string): { type?: string } => {
  let type: string | undefined;
  if (SONG_REGEX.test(url)) {
    type = "track";
  } else if (PLAYLIST_REGEX.test(url)) {
    type = "playlist";
  } else if (ALBUM_REGEX.test(url)) {
    type = "album";
  }
  return { type };
};

export class AppleMusicPlugin extends InfoExtractorPlugin {
  validate(url: string) {
    if (typeof url !== "string" || !url.includes("music.apple.com")) return false;
    const { type } = parseURL(url);
    if (!type || !SUPPORTED_TYPES.includes(type)) return false;
    return true;
  }

  async resolve<T>(url: string, { member, metadata }: ResolveOptions<T>): Promise<Song<T> | Playlist<T>> {
    const { type } = parseURL(url);
    if (!type) throw new DisTubeError("APPLE_MUSIC_PLUGIN_INVALID_URL", `Invalid Apple Music url: ${url}`);
    const data =
      type === "track"
        ? await AppleMusic.getSongInfo(url)
        : type === "album"
          ? await AppleMusic.getAlbumInfo(url)
          : await AppleMusic.getPlaylistInfo(url);
    if (!data) {
      throw new DisTubeError("APPLE_MUSIC_PLUGIN_API_ERROR", "Failed to get data from Apple Music API.");
    }
    if (!data.type || !SUPPORTED_TYPES.includes(data.type)) {
      throw new DisTubeError("APPLE_MUSIC_PLUGIN_NOT_SUPPORTED", "This applemusic link is not supported.");
    }
    if (data.type === "track") {
      return new Song(
        {
          plugin: this,
          source: "applemusic",
          playFromSource: false,
          id: data.id.toString(),
          url: data.url,
          name: data.title,
          uploader: {
            name: data.artist.name,
            url: data.artist.name,
          },
          thumbnail: data.thumbnail,
        },
        { member, metadata },
      );
    }
    return new Playlist(
      {
        source: "applemusic",
        url: data.url,
        name: data.title,
        id: data.id.toString(),
        thumbnail: data.thumbnail,
        songs: (data as ApplePlaylist).tracks.map(
          song =>
            new Song(
              {
                plugin: this,
                source: "applemusic",
                playFromSource: false,
                url: song.url,
                name: song.title,
                uploader: {
                  name: song.artist.name,
                },
                thumbnail: song.thumbnail,
              },
              { member, metadata },
            ),
        ),
      },
      { member, metadata },
    );
  }

  createSearchQuery<T>(song: Song<T>) {
    return `${song.name} ${song.uploader.name}`;
  }

  async getRelatedSongs(song: Song<undefined>) {
    if (!song || !song.url) {
      throw new DisTubeError("APPLE_MUSIC_PLUGIN_INVALID_SONG", "Cannot get related songs from invalid song.");
    }
    const related = await AppleMusic.search(`${song.uploader.name || song.name}`);
    const unique = related.filter((r: AppleSong) => r.url !== song.url);
    return unique.map(
      (t: AppleSong) =>
        new Song(
          {
            plugin: this,
            source: "applemusic",
            playFromSource: false,
            url: t.url,
            name: t.title,
            uploader: {
              name: t.artist.name,
            },
            thumbnail: t.thumbnail,
          },
          {},
        ),
    );
  }
}

export default AppleMusicPlugin;

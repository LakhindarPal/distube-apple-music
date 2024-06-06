export interface AppleSong {
  tracks: any;
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  artist: { name: string };
  type: string;
}

export interface ApplePlaylist {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  artist: { name: string };
  type: string;
  tracks: AppleSong[];
}

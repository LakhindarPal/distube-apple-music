[![NPM](https://nodei.co/npm/distube-apple-music.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/distube-apple-music/)

![NPM peer Dependency Version](https://img.shields.io/npm/dependency-version/distube-apple-music/peer/distube?style=flat-square)
![NPM Downloads](https://img.shields.io/npm/dt/distube-apple-music?style=flat-square&logo=npm)
![GitHub Repo stars](https://img.shields.io/github/stars/LakhindarPal/distube-apple-music?style=flat-square&logo=github&logoColor=white)

# distube-apple-music

A DisTube info extractor plugin for supporting Apple Music.

[_What is an info extractor plugin?_](https://github.com/skick1234/DisTube/wiki/Projects-Hub#plugins)

## Installation

```sh
npm install distube-apple-music@latest
```

## Usage

```ts
import { DisTube } from "distube";
import { AppleMusicPlugin } from "distube-apple-music";

const distube = new DisTube(client, {
  plugins: [new AppleMusicPlugin()],
});
```

## Acknowledgements

This package utilizes certain components of [@discord-player/extractor](https://www.npmjs.com/package/@discord-player/extractor) and has been modified to work with [DisTube](https://www.npmjs.com/package/distube).

Special thanks to the original authors for their excellent work.

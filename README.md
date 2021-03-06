# Morpheus for Chinese

> reading Chinese (including Classical Chinese) made easy, Chinese word recursive segmentation, pinyin-annonation on a fly for the whole sentence, a lot of dictionaries, including Dharma-Reader series, works offline and everywhere on a desktop:

> copy any Chinese text anywhere on a desktop and move mouse over the text in Morpheus

 <p align="center"><img src="https://github.com/mbykov/morpheus/blob/master/static/ascreen.gif" /></p>

#### learn more:

``` bash
    http://diglossa.org/chinese
```

#### cross platform:

``` bash
# MacOS, Windows, Ubuntu:
    https://github.com/mbykov/morpheus/releases
```

#### Build Setup

``` bash
# clone
git clone https://github.com/mbykov/morpheus

# install dependencies
yarn

# serve with hot reload
yarn run dev

```

#### troubles?

in case of errors like this:

. . .

NODE_MODULE_VERSION 57. This version of Node.js requires

NODE_MODULE_VERSION 54. Please try re-compiling or re-installing
. . .

``` bash

# install electron-rebuild
yarn add electron-rebuild

# fix the bug
./node_modules/.bin/electron-rebuild -f -w leveldown

```

--

This project was generated with [electron-vue](https://github.com/SimulatedGREG/electron-vue)@[f5d9648](https://github.com/SimulatedGREG/electron-vue/tree/f5d9648e169a3efef53159823cc7a4c7eb7221d1) using [vue-cli](https://github.com/vuejs/vue-cli). Documentation about the original structure can be found [here](https://simulatedgreg.gitbooks.io/electron-vue/content/index.html).

// HOW TO USE:
// 1. Open developer tools in your browser
// To open the developer console in Google Chrome, open the Chrome Menu in the upper-right-hand corner of the browser window and select More Tools > Developer Tools. You can also use the shortcut Option + ⌘ + J (on macOS), or Shift + CTRL + J (on Windows/Linux).
// 2. Open console tab.
// 3. Copy all the code and paste it into console, press enter.
// 4. Wait a few seconds.
// 5. New playlist is created.

(async () => {
  // override fetch to automatically get token
  let token;
  const fetchOld = window.fetch;
  const newFetch = function fetch(...args) {
    if (args?.[1]?.headers?.authorization) {
      token = args[1].headers.authorization;
    }
    return fetchOld.apply(this, args);
  };
  window.fetch = newFetch;
  // trigger fetch to get token
  try {
    document.querySelector('nav a.logo').click();
  } catch (e) {
    console.log(e);
    try {
      document.querySelector('nav ul a').click();
    } catch (ee) {
      console.log(ee);
    }
  }
  // wait for fetch to be called
  for (let i = 0; i < 80 && !token; i++) {
    await new Promise((res) => window.setTimeout(res), 100);
  }
  window.cache = window.cache || {};
  let cacheEnabled = true;
  const playlistName = 'All my songs';
  const cacheData = async (key, fnForData) => (cacheEnabled && window.cache[key]) || (window.cache[key] = await fnForData());
  const fetchWithCache = async (...params) => cacheData(JSON.stringify(params), () => fetch(...params).then((r) => r.json()));
  const fetchWithCacheGet = async (url) =>
    fetchWithCache(url, {
      headers: {
        accept: 'application/json',
        authorization: token,
      },
      method: 'GET',
    });
  const fetchWithCachePost = async ({ url, data }) =>
    fetchWithCache(url, {
      headers: {
        accept: 'application/json',
        authorization: token,
      },
      body: JSON.stringify(data),
      method: 'POST',
    });
  const getFormattedDate = (date) => {
    const year = date.getFullYear();
    const month = (1 + date.getMonth()).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${day}-${month}-${year}`;
  };
  const fetchWithPagination = async (url) => {
    let next = url;
    const arr = [];
    while (next) {
      const data = await fetchWithCacheGet(next);
      arr.push(...data.items);
      next = data.next;
    }
    return arr;
  };
  function chunk(arr, chunkSize) {
    if (chunkSize <= 0) throw new Error('Invalid chunk size');
    const R = [];
    for (let i = 0, len = arr.length; i < len; i += chunkSize) R.push(arr.slice(i, i + chunkSize));
    return R;
  }
  const songs = await fetchWithPagination(`https://api.spotify.com/v1/me/tracks?limit=${50}&offset=${0}&market=from_token`);
  cacheEnabled = false;
  // const playlists = await fetchWithPagination('https://api.spotify.com/v1/me/playlists');
  let uriOfAllSongsPlaylist = false; // playlists.find(playlist => playlist.name === playlistName)?.id;
  const me = await fetchWithCacheGet('https://api.spotify.com/v1/me');
  if (!uriOfAllSongsPlaylist) {
    const createdPlaylist = await fetchWithCachePost({
      url: `https://api.spotify.com/v1/users/${me.id}/playlists`,
      data: {
        name: `All my songs as of ${getFormattedDate(new Date())}`,
        description: playlistName,
        public: true,
      },
    });
    uriOfAllSongsPlaylist = createdPlaylist.id;
  }

  for (const uris of chunk(
    songs.map((s) => s.track.linked_from?.uri || s.track.uri),
    100,
  )) {
    await fetchWithCachePost({
      url: `https://api.spotify.com/v1/playlists/${uriOfAllSongsPlaylist}/tracks`,
      data: { uris, position: null },
    });
  }
  console.log('ok');
})();

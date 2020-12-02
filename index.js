(async () => {
  if (!window.auth_)
    throw new Error(
      `please set auth variable auth_ to look like this:
      auth_='Bearer BQCA1LtI4pHpk5inoeazauv1m2K7wPOeLVswaA-BFEK_UvmUHOjNS4wqU2Ua7Cjd9Lj35k3Ao70AjZcumjqm5Sq26gTcMIbliAQrMhkcGgAabXuD1NNa0YP7n02qdDmdus4aD2PT9wml_05T93hsb3WX40azRR8VnN-NrMIgMArt1_sMa1rO1s0k-nVNOzpyl_n4PcQwGwIG1nd9cWmAVx6ZuXRhRlIWq_nYsINsga03NpDfrO8IUFqgX6lyuhaKk0za76U-hm986cEaR30qx-e5mFBRKaDwBA2Ojq-4Jaxl7A'
      you can copy this variable from spotify web player chrome dev tools requests tab
      `,
    );
  window.cache = window.cache || {};
  let cacheEnabled = true;
  const playlistName = 'All my songs';
  const cacheData = async (key, fnForData) => (cacheEnabled && window.cache[key]) || (window.cache[key] = await fnForData());
  const fetchWithCache = async (...params) => cacheData(JSON.stringify(params), () => fetch(...params).then(r => r.json()));
  const fetchWithCacheGet = async url =>
    fetchWithCache(url, {
      headers: {
        accept: 'application/json',
        authorization: window.auth_,
      },
      method: 'GET',
    });
  const fetchWithCachePost = async ({ url, data }) =>
    fetchWithCache(url, {
      headers: {
        accept: 'application/json',
        authorization: window.auth_,
      },
      body: JSON.stringify(data),
      method: 'POST',
    });
  const getFormattedDate = date => {
    const year = date.getFullYear();
    const month = (1 + date.getMonth()).toString().padStart(2, '0');
    const day = date
      .getDate()
      .toString()
      .padStart(2, '0');

    return `${day}-${month}-${year}`;
  };
  const fetchWithPagination = async url => {
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

  for (const uris of chunk(songs.map(s => s.track.uri), 100))
    await fetchWithCachePost({
      url: `https://api.spotify.com/v1/playlists/${uriOfAllSongsPlaylist}/tracks`,
      data: { uris, position: null },
    });
  console.log('ok');
})();
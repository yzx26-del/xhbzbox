export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const r = await fetch('https://u.y.qq.com/cgi-bin/musicu.fcg?data={"comm":{"ct":6,"cv":0},"new_song":{"module":"QQMusic.MusichallServer","method":"GetNewSong","param":{"type":0}}}', {
      headers: {'Referer':'https://y.qq.com','User-Agent':'Mozilla/5.0'}
    });
    const data = await r.json();
    const songs = data?.new_song?.data?.song_list || [];
    res.json({ songs: songs.slice(0,20).map(s=>({
      name: s.name,
      artist: s.singer?.map(a=>a.name).join('/') || '',
      album: s.album?.name || '',
      cover: s.album?.mid ? `https://y.qq.com/music/photo_new/T002R300x300M000${s.album.mid}.jpg` : ''
    }))});
  } catch(e) {
    res.status(500).json({error: e.message});
  }
}

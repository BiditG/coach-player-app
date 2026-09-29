'use client';

import { useEffect, useRef, useState } from 'react';
import { Manrope, Inter } from 'next/font/google';
import styles from './profile.module.css';

const manrope = Manrope({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-manrope' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter' });

type Tab = 'overview' | 'stats' | 'posts' | 'media';

type About = { from: string; school: string; academy: string; birthday: string; worksAt: string };
type WeekItem = { id: string; text: string; day: string };

type ProfileData = {
  name: string;
  role: string;
  location: string;
  bio: string;
  about: About;
  week: WeekItem[];
};

type MatchEntry = {
  id: string;
  opponent: string;
  date: string; // ISO
  batRuns?: number;
  batBalls?: number;
  batOut?: boolean;
  bowlOvers?: number;
  bowlRuns?: number;
  bowlWickets?: number;
};

type Post = {
  id: string;
  text: string;
  photo?: string; // base64 data URL
  createdAt: string; // ISO
};

const WEEK_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

const LS_KEYS = {
  profile: 'frameup:profile',
  avatar: 'frameup:avatar',
  cover: 'frameup:cover',
  matches: 'frameup:matches',
  posts: 'frameup:posts',
};

const initialProfile: ProfileData = {
  name: 'Aashika Thapa',
  role: 'Top-order batsman · Rivals CC',
  location: 'Kathmandu, Nepal',
  bio: 'Right-hand top-order batsman playing club cricket for Rivals CC. Focused on building an all-format game — currently working on rotating strike against spin and finishing in the death overs.',
  about: {
    from: 'Kathmandu, Nepal',
    school: "St. Xavier's High School",
    academy: 'MCA Cricket Academy',
    birthday: '2002-03-14',
    worksAt: 'Rivals CC — Senior Squad',
  },
  week: [
    { id: 'w1', text: 'Rivals CC vs Heritage XI', day: 'Sun' },
    { id: 'w2', text: 'Nets — batting focus', day: 'Wed' },
    { id: 'w3', text: 'Fitness — sprint work', day: 'Fri' },
  ],
};

function formatBirthday(iso: string) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function safeLoad<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function safeSave(key: string, value: unknown) {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // storage full or unavailable — fail silently, page still works this session
  }
}

// -- derived stats, recalculated on every render from the raw match log --
function computeBatting(matches: MatchEntry[]) {
  const innings = matches.filter((m) => typeof m.batRuns === 'number');
  const runs = innings.reduce((s, m) => s + (m.batRuns ?? 0), 0);
  const balls = innings.reduce((s, m) => s + (m.batBalls ?? 0), 0);
  const outs = innings.filter((m) => m.batOut).length;
  const highest = innings.reduce((mx, m) => Math.max(mx, m.batRuns ?? 0), 0);
  const fifties = innings.filter((m) => (m.batRuns ?? 0) >= 50).length;
  const average = outs > 0 ? runs / outs : runs;
  const strikeRate = balls > 0 ? (runs / balls) * 100 : 0;
  return { innings: innings.length, runs, highest, fifties, average, strikeRate };
}
function computeBowling(matches: MatchEntry[]) {
  const innings = matches.filter((m) => typeof m.bowlOvers === 'number');
  const overs = innings.reduce((s, m) => s + (m.bowlOvers ?? 0), 0);
  const runsConceded = innings.reduce((s, m) => s + (m.bowlRuns ?? 0), 0);
  const wickets = innings.reduce((s, m) => s + (m.bowlWickets ?? 0), 0);
  const economy = overs > 0 ? runsConceded / overs : 0;
  let best: MatchEntry | null = null;
  innings.forEach((m) => {
    if (!best) { best = m; return; }
    const w = m.bowlWickets ?? 0, bw = best.bowlWickets ?? 0;
    if (w > bw || (w === bw && (m.bowlRuns ?? 0) < (best.bowlRuns ?? 0))) best = m;
  });
  return { innings: innings.length, overs, wickets, economy, best };
}

function CameraIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>);
}
function PencilIcon() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>);
}
function LocationIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.6" /></svg>);
}
function SchoolIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 9 12 5 2 9l10 4 10-4Z" /><path d="M6 11v5c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5" /></svg>);
}
function AcademyIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v4a5 5 0 0 1-10 0Z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></svg>);
}
function CalendarIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>);
}
function BriefcaseIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="7.5" width="19" height="12" rx="2.5" /><path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" /></svg>);
}

export default function ProfilePage() {
  const [hydrated, setHydrated] = useState(false);

  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  const [tab, setTab] = useState<Tab>('overview');

  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<'avatar' | 'cover' | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [bioEditing, setBioEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState(profile.bio);

  const [aboutEditing, setAboutEditing] = useState(false);
  const [aboutDraft, setAboutDraft] = useState<About>(profile.about);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<ProfileData>(profile);

  const [logFormOpen, setLogFormOpen] = useState(false);
  const [logDraft, setLogDraft] = useState({
    opponent: '', date: '', batRuns: '', batBalls: '', batOut: false,
    bowlOvers: '', bowlRuns: '', bowlWickets: '',
  });

  const [postText, setPostText] = useState('');
  const [postPhoto, setPostPhoto] = useState<string | null>(null);
  const postPhotoInputRef = useRef<HTMLInputElement>(null);

  // -- load everything saved from a previous visit --
  useEffect(() => {
    const p = safeLoad<ProfileData>(LS_KEYS.profile);
    if (p) setProfile(p);
    const a = localStorage.getItem(LS_KEYS.avatar);
    if (a) setAvatarUrl(a);
    const c = localStorage.getItem(LS_KEYS.cover);
    if (c) setCoverUrl(c);
    const m = safeLoad<MatchEntry[]>(LS_KEYS.matches);
    if (m) setMatches(m);
    const ps = safeLoad<Post[]>(LS_KEYS.posts);
    if (ps) setPosts(ps);
    setHydrated(true);
  }, []);

  // -- persist on every change (skip the very first render, before hydration) --
  useEffect(() => { if (hydrated) safeSave(LS_KEYS.profile, profile); }, [profile, hydrated]);
  useEffect(() => { if (hydrated && avatarUrl) safeSave(LS_KEYS.avatar, avatarUrl); }, [avatarUrl, hydrated]);
  useEffect(() => { if (hydrated && coverUrl) safeSave(LS_KEYS.cover, coverUrl); }, [coverUrl, hydrated]);
  useEffect(() => { if (hydrated) safeSave(LS_KEYS.matches, matches); }, [matches, hydrated]);
  useEffect(() => { if (hydrated) safeSave(LS_KEYS.posts, posts); }, [posts, hydrated]);

  const batting = computeBatting(matches);
  const bowling = computeBowling(matches);
  const mediaPosts = posts.filter((p) => p.photo);

  // TODO: everything in this component is local-only (localStorage), which is
  // why it survives a refresh but is NOT shared across devices or synced with
  // the rest of the app. To make this real: (1) upload avatar/cover to Supabase
  // Storage and save the public URL on the profile row instead of a data URL;
  // (2) save `matches` to a `match_logs` table keyed by user_id and SELECT
  // them instead of loading from localStorage; (3) `posts` here should instead
  // be a Supabase query — `select * from posts where user_id = :me order by
  // created_at desc` — the same table your site-wide "Create Post" writes to,
  // so a post made anywhere else in the app shows up here automatically.

  function readAsDataUrl(file: File, set: (url: string) => void) {
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') set(reader.result); };
    reader.readAsDataURL(file);
  }

  function openEditModal() { setModalDraft(profile); setEditModalOpen(true); }
  function saveEditModal() { setProfile(modalDraft); setEditModalOpen(false); }

  function startBioEdit() { setBioDraft(profile.bio); setBioEditing(true); }
  function saveBio() { setProfile((p) => ({ ...p, bio: bioDraft })); setBioEditing(false); }

  function startAboutEdit() { setAboutDraft(profile.about); setAboutEditing(true); }
  function saveAbout() { setProfile((p) => ({ ...p, about: aboutDraft })); setAboutEditing(false); }

  function updateWeekItem(id: string, field: 'text' | 'day', value: string) {
    setModalDraft((p) => ({ ...p, week: (p.week ?? []).map((w) => (w.id === id ? { ...w, [field]: value } : w)) }));
  }
  function addWeekItem() {
    setModalDraft((p) => ({ ...p, week: [...(p.week ?? []), { id: `w${Date.now()}`, text: '', day: '' }] }));
  }
  function removeWeekItem(id: string) {
    setModalDraft((p) => ({ ...p, week: (p.week ?? []).filter((w) => w.id !== id) }));
  }

  function submitMatch() {
    if (!logDraft.opponent.trim()) return;
    const entry: MatchEntry = {
      id: `m${Date.now()}`,
      opponent: logDraft.opponent.trim(),
      date: logDraft.date,
      batRuns: logDraft.batRuns !== '' ? Number(logDraft.batRuns) : undefined,
      batBalls: logDraft.batBalls !== '' ? Number(logDraft.batBalls) : undefined,
      batOut: logDraft.batOut,
      bowlOvers: logDraft.bowlOvers !== '' ? Number(logDraft.bowlOvers) : undefined,
      bowlRuns: logDraft.bowlRuns !== '' ? Number(logDraft.bowlRuns) : undefined,
      bowlWickets: logDraft.bowlWickets !== '' ? Number(logDraft.bowlWickets) : undefined,
    };
    setMatches((m) => [entry, ...m]);
    setLogDraft({ opponent: '', date: '', batRuns: '', batBalls: '', batOut: false, bowlOvers: '', bowlRuns: '', bowlWickets: '' });
    setLogFormOpen(false);
  }
  function removeMatch(id: string) {
    setMatches((m) => m.filter((x) => x.id !== id));
  }

  function submitPost() {
    if (!postText.trim() && !postPhoto) return;
    const p: Post = { id: `p${Date.now()}`, text: postText.trim(), photo: postPhoto ?? undefined, createdAt: new Date().toISOString() };
    setPosts((all) => [p, ...all]);
    setPostText('');
    setPostPhoto(null);
  }

  return (
    <div className={`${styles.wrap} ${manrope.variable} ${inter.variable}`} style={{ fontFamily: 'var(--font-inter)' }}>
      {/* Cover */}
      <div className={styles.headerWrap}>
        <div className={styles.cover} style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}>
          {!coverUrl && (<div className={styles.coverEmpty}><CameraIcon /><span>No cover photo yet</span></div>)}
          <div style={{ position: 'absolute', top: 14, right: 14 }}>
            <button className={styles.coverEdit} onClick={() => setCoverMenuOpen((v) => !v)}>Cover photo</button>
            {coverMenuOpen && (
              <>
                <div className={styles.menuBackdrop} onClick={() => setCoverMenuOpen(false)} />
                <div className={styles.popover} style={{ left: 'auto', right: 0 }}>
                  <button className={styles.popoverItem} disabled={!coverUrl} onClick={() => { setLightbox('cover'); setCoverMenuOpen(false); }}>View cover photo</button>
                  <button className={styles.popoverItem} onClick={() => { coverInputRef.current?.click(); setCoverMenuOpen(false); }}>Change cover photo</button>
                </div>
              </>
            )}
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={(e) => { const f = e.target.files?.[0]; if (f) readAsDataUrl(f, setCoverUrl); }} />
        </div>

        <div className={styles.avatarWrap}>
          <div className={styles.avatarLg} style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined} onClick={() => setAvatarMenuOpen((v) => !v)}>
            {!avatarUrl && <span className={styles.avatarEmpty}>Add photo</span>}
          </div>
          <div className={styles.avatarEditDot} onClick={() => setAvatarMenuOpen((v) => !v)}><CameraIcon /></div>
          {avatarMenuOpen && (
            <>
              <div className={styles.menuBackdrop} onClick={() => setAvatarMenuOpen(false)} />
              <div className={styles.popover}>
                <button className={styles.popoverItem} disabled={!avatarUrl} onClick={() => { setLightbox('avatar'); setAvatarMenuOpen(false); }}>View profile photo</button>
                <button className={styles.popoverItem} onClick={() => { avatarInputRef.current?.click(); setAvatarMenuOpen(false); }}>Change photo</button>
              </div>
            </>
          )}
          <input ref={avatarInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={(e) => { const f = e.target.files?.[0]; if (f) readAsDataUrl(f, setAvatarUrl); }} />
        </div>
      </div>

      {/* Identity */}
      <div className={styles.identity}>
        <div>
          <div className={styles.idNameRow}>
            <div className={styles.idName}>{profile.name}</div>
            <span className={styles.badgePro}>Pro</span>
          </div>
          <div className={styles.idMeta}>{profile.role} · {profile.location}</div>
        </div>
        <div className={styles.idActions}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={openEditModal}>Edit profile</button>
        </div>
      </div>

      <div className={styles.statStrip}>
        <div><span className={`${styles.num} ${styles.statNum}`}>0</span><span className={styles.statLabel}>Followers</span></div>
        <div><span className={`${styles.num} ${styles.statNum}`}>0</span><span className={styles.statLabel}>Following</span></div>
      </div>

      {/* Bio */}
      <div className={styles.bioRow}>
        {bioEditing ? (
          <div style={{ flex: 1 }}>
            <textarea className={styles.textarea} value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} />
            <div className={styles.smallBtnRow}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveBio}>Save</button>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setBioEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <p className={styles.bio} style={{ marginBottom: 0 }}>{profile.bio}</p>
            <button className={styles.editIconBtn} onClick={startBioEdit}><PencilIcon /> Edit</button>
          </>
        )}
      </div>

      {/* About */}
      <div className={styles.about}>
        <div className={styles.aboutHeaderRow}>
          <h3>About</h3>
          {!aboutEditing && (<button className={styles.editIconBtn} onClick={startAboutEdit}><PencilIcon /> Edit</button>)}
        </div>
        {aboutEditing ? (
          <div style={{ paddingBottom: 16 }}>
            <div className={styles.field}><span className={styles.fieldLabel}>From</span><input className={styles.input} value={aboutDraft.from} onChange={(e) => setAboutDraft({ ...aboutDraft, from: e.target.value })} /></div>
            <div className={styles.field}><span className={styles.fieldLabel}>School</span><input className={styles.input} value={aboutDraft.school} onChange={(e) => setAboutDraft({ ...aboutDraft, school: e.target.value })} /></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Academy (optional)</span><input className={styles.input} value={aboutDraft.academy} onChange={(e) => setAboutDraft({ ...aboutDraft, academy: e.target.value })} /></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Birthday</span><input type="date" className={styles.input} value={aboutDraft.birthday} onChange={(e) => setAboutDraft({ ...aboutDraft, birthday: e.target.value })} /></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Works at (optional)</span><input className={styles.input} value={aboutDraft.worksAt} onChange={(e) => setAboutDraft({ ...aboutDraft, worksAt: e.target.value })} /></div>
            <div className={styles.smallBtnRow}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveAbout}>Save</button>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setAboutEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className={styles.aboutList}>
            <div className={styles.aboutRow}><div className={styles.aboutIcon}><LocationIcon /></div><div><div className={styles.aboutT}>From</div><div className={styles.aboutV}>{profile.about.from}</div></div></div>
            <div className={styles.aboutRow}><div className={styles.aboutIcon}><SchoolIcon /></div><div><div className={styles.aboutT}>School</div><div className={styles.aboutV}>{profile.about.school}</div></div></div>
            {profile.about.academy && (<div className={styles.aboutRow}><div className={styles.aboutIcon}><AcademyIcon /></div><div><div className={styles.aboutT}>Academy</div><div className={styles.aboutV}>{profile.about.academy}</div></div></div>)}
            <div className={styles.aboutRow}><div className={styles.aboutIcon}><CalendarIcon /></div><div><div className={styles.aboutT}>Birthday</div><div className={styles.aboutV}>{formatBirthday(profile.about.birthday)}</div></div></div>
            {profile.about.worksAt && (<div className={styles.aboutRow}><div className={styles.aboutIcon}><BriefcaseIcon /></div><div><div className={styles.aboutT}>Works at</div><div className={styles.aboutV}>{profile.about.worksAt}</div></div></div>)}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['overview', 'stats', 'posts', 'media'] as Tab[]).map((t) => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className={styles.panel}>
          <h3>Season snapshot</h3>
          <div className={styles.kpiGrid}>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{batting.runs}</span><span>Runs</span></div>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{batting.strikeRate.toFixed(1)}</span><span>Strike rate</span></div>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{batting.fifties}</span><span>Fifties</span></div>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{batting.highest}</span><span>Highest score</span></div>
          </div>
          {matches.length === 0 && <p className={styles.emptyHint} style={{ marginTop: 12 }}>Log a match under the Stats tab and this fills in automatically.</p>}
        </div>
      )}

      {tab === 'stats' && (
        <div className={styles.panel}>
          <h3>Batting</h3>
          <div className={styles.kpiGrid}>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{batting.innings}</span><span>Innings</span></div>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{batting.runs}</span><span>Runs</span></div>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{batting.average.toFixed(1)}</span><span>Average</span></div>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{batting.strikeRate.toFixed(1)}</span><span>Strike rate</span></div>
          </div>

          <div className={styles.subHeading}>Bowling</div>
          <div className={styles.kpiGrid}>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{bowling.innings}</span><span>Innings</span></div>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{bowling.wickets}</span><span>Wickets</span></div>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{bowling.economy.toFixed(2)}</span><span>Economy</span></div>
            <div className={styles.kpi}><span className={`${styles.num} ${styles.kpiNum}`}>{bowling.best ? `${bowling.best.bowlWickets ?? 0}/${bowling.best.bowlRuns ?? 0}` : '—'}</span><span>Best figures</span></div>
          </div>

          <div className={styles.subHeading}>Match log</div>
          {matches.length === 0 ? (
            <p className={styles.emptyHint}>No matches logged yet — add one below and the stats above update automatically.</p>
          ) : (
            matches.map((m) => (
              <div className={styles.matchRow} key={m.id}>
                <div>
                  <div className={styles.matchWho}>{m.opponent}</div>
                  <div className={styles.matchMeta}>{m.date ? formatBirthday(m.date) : 'No date'}</div>
                </div>
                <div className={styles.matchStats}>
                  {typeof m.batRuns === 'number' && <span>{m.batRuns}{m.batOut ? '' : '*'} ({m.batBalls ?? 0})</span>}
                  {typeof m.bowlWickets === 'number' && <span>{m.bowlWickets}/{m.bowlRuns ?? 0} ({m.bowlOvers ?? 0})</span>}
                </div>
                <button className={styles.removeRowBtn} onClick={() => removeMatch(m.id)} aria-label="Remove match">×</button>
              </div>
            ))
          )}

          {logFormOpen ? (
            <div className={styles.logForm}>
              <div className={styles.formGrid2}>
                <div className={styles.field}><span className={styles.fieldLabel}>Opponent</span><input className={styles.input} value={logDraft.opponent} onChange={(e) => setLogDraft({ ...logDraft, opponent: e.target.value })} /></div>
                <div className={styles.field}><span className={styles.fieldLabel}>Date</span><input type="date" className={styles.input} value={logDraft.date} onChange={(e) => setLogDraft({ ...logDraft, date: e.target.value })} /></div>
              </div>
              <div className={styles.subHeading}>Batting (leave blank if you didn&apos;t bat)</div>
              <div className={styles.formGrid2}>
                <div className={styles.field}><span className={styles.fieldLabel}>Runs</span><input type="number" className={styles.input} value={logDraft.batRuns} onChange={(e) => setLogDraft({ ...logDraft, batRuns: e.target.value })} /></div>
                <div className={styles.field}><span className={styles.fieldLabel}>Balls faced</span><input type="number" className={styles.input} value={logDraft.batBalls} onChange={(e) => setLogDraft({ ...logDraft, batBalls: e.target.value })} /></div>
              </div>
              <label className={styles.checkboxRow}>
                <input type="checkbox" checked={logDraft.batOut} onChange={(e) => setLogDraft({ ...logDraft, batOut: e.target.checked })} />
                Got out this innings
              </label>
              <div className={styles.subHeading}>Bowling (leave blank if you didn&apos;t bowl)</div>
              <div className={styles.formGrid2}>
                <div className={styles.field}><span className={styles.fieldLabel}>Overs</span><input type="number" step="0.1" className={styles.input} value={logDraft.bowlOvers} onChange={(e) => setLogDraft({ ...logDraft, bowlOvers: e.target.value })} /></div>
                <div className={styles.field}><span className={styles.fieldLabel}>Runs conceded</span><input type="number" className={styles.input} value={logDraft.bowlRuns} onChange={(e) => setLogDraft({ ...logDraft, bowlRuns: e.target.value })} /></div>
              </div>
              <div className={styles.field}><span className={styles.fieldLabel}>Wickets</span><input type="number" className={styles.input} value={logDraft.bowlWickets} onChange={(e) => setLogDraft({ ...logDraft, bowlWickets: e.target.value })} /></div>
              <div className={styles.smallBtnRow}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={submitMatch}>Save match</button>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setLogFormOpen(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className={styles.addLinkBtn} style={{ marginTop: 14 }} onClick={() => setLogFormOpen(true)}>+ Log a match</button>
          )}
        </div>
      )}

      {tab === 'posts' && (
        <div className={styles.panel}>
          <div className={styles.composer}>
            <textarea className={styles.textarea} placeholder="Share what's on your mind…" value={postText} onChange={(e) => setPostText(e.target.value)} />
            {postPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={postPhoto} alt="" className={styles.postPhoto} />
            )}
            <div className={styles.composerActions}>
              <button className={styles.editIconBtn} onClick={() => postPhotoInputRef.current?.click()}><CameraIcon /> {postPhoto ? 'Change photo' : 'Add photo'}</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={submitPost}>Post</button>
            </div>
            <input ref={postPhotoInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={(e) => { const f = e.target.files?.[0]; if (f) readAsDataUrl(f, setPostPhoto); }} />
          </div>

          <h3>Your posts</h3>
          {posts.length === 0 ? (
            <p className={styles.emptyHint}>Nothing posted yet — anything you share above (or anywhere else on the site, once this is wired to your real posts table) will show up here.</p>
          ) : (
            posts.map((p) => (
              <div className={styles.post} key={p.id}>
                <div className={styles.avatarSm}>{avatarUrl && <img src={avatarUrl} alt="" />}</div>
                <div style={{ flex: 1 }}>
                  {p.text && <p>{p.text}</p>}
                  {p.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo} alt="" className={styles.postPhoto} />
                  )}
                  <div className={styles.postMeta}><span>{new Date(p.createdAt).toLocaleString()}</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'media' && (
        <div className={styles.panel}>
          <h3>Photos</h3>
          {mediaPosts.length === 0 ? (
            <p className={styles.emptyHint}>Photos from your posts will show up here once you share something with a photo.</p>
          ) : (
            <div className={styles.mediaGrid}>
              {mediaPosts.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.photo} alt="" className={`${styles.mediaTile} ${styles.mediaTileImg}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* This week */}
      <div className={`${styles.panel} ${styles.weekPanel}`}>
        <h3>This week</h3>
        {profile.week.length === 0 ? (
          <p className={styles.emptyHint}>Nothing added yet — use Edit profile to add what you&apos;ve been up to.</p>
        ) : (
          <div className={styles.sideList}>
            {profile.week.map((item, i) => (
              <div className={styles.sideRow} key={item.id}>
                <div className={styles.sideDot} style={{ background: WEEK_COLORS[i % WEEK_COLORS.length] }} />
                <div className={styles.sideText}>{item.text}</div>
                <div className={styles.sideDate}>{item.day}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (avatarUrl || coverUrl) && (
        <div className={styles.lightboxOverlay} onClick={() => setLightbox(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightbox(null)}>Close</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.lightboxImg} src={(lightbox === 'avatar' ? avatarUrl : coverUrl) ?? undefined} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Edit-everything modal */}
      {editModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setEditModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit profile</h2>
              <button className={styles.modalClose} onClick={() => setEditModalOpen(false)}>×</button>
            </div>
            <div className={styles.field}><span className={styles.fieldLabel}>Name</span><input className={styles.input} value={modalDraft.name} onChange={(e) => setModalDraft({ ...modalDraft, name: e.target.value })} /></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Role</span><input className={styles.input} value={modalDraft.role} onChange={(e) => setModalDraft({ ...modalDraft, role: e.target.value })} /></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Location</span><input className={styles.input} value={modalDraft.location} onChange={(e) => setModalDraft({ ...modalDraft, location: e.target.value })} /></div>
            <div className={styles.field}><span className={styles.fieldLabel}>Bio</span><textarea className={styles.textarea} value={modalDraft.bio} onChange={(e) => setModalDraft({ ...modalDraft, bio: e.target.value })} /></div>

            <div className={styles.fieldRow}>
              <div className={styles.field}><span className={styles.fieldLabel}>From</span><input className={styles.input} value={modalDraft.about.from} onChange={(e) => setModalDraft({ ...modalDraft, about: { ...modalDraft.about, from: e.target.value } })} /></div>
              <div className={styles.field}><span className={styles.fieldLabel}>School</span><input className={styles.input} value={modalDraft.about.school} onChange={(e) => setModalDraft({ ...modalDraft, about: { ...modalDraft.about, school: e.target.value } })} /></div>
              <div className={styles.field}><span className={styles.fieldLabel}>Academy</span><input className={styles.input} value={modalDraft.about.academy} onChange={(e) => setModalDraft({ ...modalDraft, about: { ...modalDraft.about, academy: e.target.value } })} /></div>
              <div className={styles.field}><span className={styles.fieldLabel}>Birthday</span><input type="date" className={styles.input} value={modalDraft.about.birthday} onChange={(e) => setModalDraft({ ...modalDraft, about: { ...modalDraft.about, birthday: e.target.value } })} /></div>
              <div className={styles.field}><span className={styles.fieldLabel}>Works at</span><input className={styles.input} value={modalDraft.about.worksAt} onChange={(e) => setModalDraft({ ...modalDraft, about: { ...modalDraft.about, worksAt: e.target.value } })} /></div>
            </div>

            <div className={styles.field} style={{ marginTop: 6 }}>
              <span className={styles.fieldLabel}>This week — what you&apos;ve been up to</span>
              {modalDraft.week.map((item) => (
                <div className={styles.weekEditRow} key={item.id}>
                  <input className={styles.input} placeholder="e.g. Nets — batting focus" value={item.text} onChange={(e) => updateWeekItem(item.id, 'text', e.target.value)} />
                  <input className={styles.input} placeholder="Day" value={item.day} onChange={(e) => updateWeekItem(item.id, 'day', e.target.value)} />
                  <button className={styles.removeRowBtn} onClick={() => removeWeekItem(item.id)} aria-label="Remove">×</button>
                </div>
              ))}
              <button className={styles.addLinkBtn} onClick={addWeekItem}>+ Add an entry</button>
            </div>

            <div className={styles.modalActions}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveEditModal}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

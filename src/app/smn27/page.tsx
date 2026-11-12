import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Teaching in 2027',
  description: 'A look ahead at the teaching series planned for Sunday mornings in 2027.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#12263f' }

type Series = {
  key: string
  name: string
  kind: string
  dates: string
  weeks: number
  blurb: string
  points?: string[]
}

const SERIES: Series[] = [
  {
    key: 'fip',
    name: 'Faith In Practice',
    kind: 'Growing in Christ',
    dates: 'January 3 to February 28',
    weeks: 9,
    blurb:
      'We begin the year where discipleship begins: with allegiance to Jesus as King. From there we walk through the everyday practices that grow out of that trust. They are not hoops to jump through. They are what following Jesus looks like when it becomes ordinary life.',
    points: ['Allegiance', 'Mentorship', 'The Word', 'Prayer', 'Fasting', 'Worship', 'Serving', 'Stewardship', 'Learn & Invest'],
  },
  {
    key: 'holy',
    name: 'Palm Sunday and Easter',
    kind: 'Holy Week',
    dates: 'March 21 and March 28',
    weeks: 2,
    blurb:
      'Palm Sunday asks whether the crowd that welcomed Jesus really knew who He was. Easter answers with firstfruits: the empty tomb is the first sheaf of a harvest still to come, and the promise it carries is for everyone.',
  },
  {
    key: 'upper',
    name: 'The Upper Room',
    kind: 'John 13 to 17',
    dates: 'April 4 to May 23',
    weeks: 8,
    blurb:
      'The night before the cross, Jesus slowed down and taught His closest friends. We sit at that table: the towel and the basin, the way to the Father, the promise of the Spirit, the vine and the branches, and finally Jesus praying for us.',
  },
  {
    key: 'esther',
    name: 'Esther',
    kind: 'Old Testament',
    dates: 'June 13 to July 25',
    weeks: 7,
    blurb:
      'God is never named in this story, yet He is on every page. A young woman, a faithful cousin, a proud schemer and a threatened people show us how God works behind the scenes, and what courage looks like when we are asked to step forward.',
  },
  {
    key: 'prov',
    name: 'Proverbs: Wisdom for Exiles',
    kind: 'Christian living',
    dates: 'August 1 to August 22',
    weeks: 4,
    blurb:
      'Living wisely in a culture that does not share our values. A short summer series on the everyday choices where wisdom shows up most: what we say, how we carry ourselves, how we stay faithful, and how we work.',
    points: ['Speech and Silence', 'Pride and Humility', 'Sex and Faithfulness', 'Work and Laziness'],
  },
  {
    key: 'pet',
    name: '1 Peter',
    kind: 'New Testament',
    dates: 'September 5 to October 24',
    weeks: 7,
    blurb:
      'Peter wrote to believers who felt like strangers in their own world. His letter is about godliness in an ungodly culture: how to hold on to hope, live as a holy people, and stay faithful at home, in character, in suffering and in leadership.',
  },
  {
    key: 'unseen',
    name: 'The Unseen',
    kind: 'Theology',
    dates: 'October 31 to November 21',
    weeks: 4,
    blurb:
      'The Bible assumes an unseen realm, refers to it and validates it. We look at what Scripture actually says about it, who the players are, the real enemy we face, and how we are meant to live in light of what we cannot see.',
  },
  {
    key: 'names',
    name: 'The Names of Christmas',
    kind: 'Advent',
    dates: 'November 28 to December 19',
    weeks: 4,
    blurb:
      'Four Sundays of Advent, four ways the Bible names the child in the manger. From Isaiah’s promise to the angel’s message and Simeon’s prophecy, we let the names of Jesus prepare us for Christmas.',
  },
]

export default function Smn27() {
  return (
    <main className="s27">
      <style>{CSS}</style>

      <header className="hero">
        <p className="eyebrow">Sunday Mornings</p>
        <h1>Teaching in 2027</h1>
        <p className="lede">
          A look ahead at the year. One thread runs through all of it: how to live godly lives in an ungodly culture.
        </p>
      </header>

      <section aria-label="The year at a glance" className="glance">
        <div className="bar" role="img" aria-label="Eight series across the year, in order">
          {SERIES.map((s) => (
            <a key={s.key} href={`#${s.key}`} className={`seg c-${s.key}`} style={{ flexGrow: s.weeks }} title={s.name} />
          ))}
        </div>
        <div className="months" aria-hidden="true">
          {['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov', 'Dec'].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </section>

      <ol className="list">
        {SERIES.map((s, i) => (
          <li key={s.key} id={s.key} className={`card c-${s.key}`}>
            <div className="num">{String(i + 1).padStart(2, '0')}</div>
            <div className="body">
              <p className="kind">{s.kind}</p>
              <h2>{s.name}</h2>
              <p className="when">
                {s.dates} <span>{s.weeks} {s.weeks === 1 ? 'week' : 'weeks'}</span>
              </p>
              <p className="blurb">{s.blurb}</p>
              {s.points && (
                <ul className="chips">
                  {s.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>

      <footer className="foot">
        <p>
          Dates are approximate. A year is a long time, and the plan will flex as life and ministry require. A few Sundays
          each year are set aside for missionary visits and guest speakers.
        </p>
      </footer>
    </main>
  )
}

const CSS = `
.s27{
  --bg:#f7f3ec; --ink:#1c2430; --muted:#5d6675; --card:#fffdf9; --line:#e4dccd; --navy:#12263f;
  --fip:#2f6f5e; --holy:#8a5a2b; --upper:#8c3b3b; --esther:#6b4a8a; --prov:#b07a1f; --pet:#2e5b8a; --unseen:#3b4a5c; --names:#a23e57;
  min-height:100vh; background:var(--bg); color:var(--ink);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height:1.6; padding:0 0 56px;
}
@media (prefers-color-scheme: dark){
  .s27{ --bg:#10151c; --ink:#eae6dd; --muted:#a2a9b5; --card:#171e28; --line:#273140; --navy:#0b1118;
    --fip:#58b79e; --holy:#d09a62; --upper:#d98080; --esther:#b595d6; --prov:#e0b04f; --pet:#7fb0e0; --unseen:#9fb0c4; --names:#e0829b; }
}
.s27 *{box-sizing:border-box}
.hero{background:var(--navy); color:#f4efe4; padding:64px 20px 56px; text-align:center}
.eyebrow{letter-spacing:.22em; text-transform:uppercase; font-size:.75rem; opacity:.7; margin:0 0 12px}
.hero h1{font-family:Georgia,"Times New Roman",serif; font-weight:600; font-size:clamp(2.4rem,8vw,4rem); line-height:1.1; margin:0}
.lede{max-width:34rem; margin:18px auto 0; font-size:1.1rem; opacity:.85}
.glance{max-width:46rem; margin:-22px auto 0; padding:0 20px}
.bar{display:flex; gap:3px; height:26px; border-radius:13px; overflow:hidden; background:var(--card); padding:4px; box-shadow:0 6px 24px rgba(0,0,0,.18)}
.seg{display:block; border-radius:9px; flex-basis:0; min-width:6px; opacity:.92}
.seg:hover{opacity:1}
.months{display:flex; justify-content:space-between; font-size:.72rem; color:var(--muted); padding:8px 6px 0; letter-spacing:.06em}
.list{list-style:none; margin:28px auto 0; padding:0 16px; max-width:46rem; display:grid; gap:16px}
.card{display:flex; gap:16px; background:var(--card); border:1px solid var(--line); border-left:5px solid var(--accent); border-radius:14px; padding:22px 20px; scroll-margin-top:16px}
.c-fip{--accent:var(--fip)} .c-holy{--accent:var(--holy)} .c-upper{--accent:var(--upper)} .c-esther{--accent:var(--esther)}
.c-prov{--accent:var(--prov)} .c-pet{--accent:var(--pet)} .c-unseen{--accent:var(--unseen)} .c-names{--accent:var(--names)}
.seg{background:var(--accent)}
.num{font-family:Georgia,serif; font-size:1.6rem; color:var(--accent); opacity:.8; line-height:1.1; min-width:2.2rem}
.body{min-width:0}
.kind{margin:0; font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; color:var(--accent); font-weight:600}
.card h2{font-family:Georgia,"Times New Roman",serif; font-weight:600; font-size:1.5rem; line-height:1.2; margin:4px 0 6px}
.when{margin:0 0 10px; font-size:.92rem; color:var(--muted)}
.when span{display:inline-block; margin-left:8px; padding:1px 9px; border:1px solid var(--line); border-radius:999px; font-size:.75rem}
.blurb{margin:0; font-size:1rem}
.chips{list-style:none; padding:0; margin:14px 0 0; display:flex; flex-wrap:wrap; gap:6px}
.chips li{font-size:.8rem; padding:3px 11px; border-radius:999px; background:color-mix(in srgb, var(--accent) 12%, transparent); color:var(--ink)}
.foot{max-width:34rem; margin:36px auto 0; padding:0 24px; text-align:center; color:var(--muted); font-size:.9rem}
@media (max-width:480px){ .card{padding:18px 16px; gap:12px} .num{min-width:1.8rem; font-size:1.3rem} }
`

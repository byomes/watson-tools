export type Item = { id: string; text: string; hint?: string }
export type Section = { id: string; title: string; items: Item[] }

export const SECTIONS: Section[] = [
  {
    id: 'atem',
    title: '1. ATEM Mini Pro (camera switcher)',
    items: [
      { id: 'atem-inputs', text: 'Which camera is on which HDMI input; camera models (Main, PTZ, Follow)', hint: 'Photo: ATEM back panel' },
      { id: 'atem-mac', text: 'How the ATEM reaches the Mac mini (USB webcam out?)' },
      { id: 'atem-audio', text: 'What audio the ATEM carries; is any XR18 audio going into it (mic input or HDMI embedded)?' },
    ],
  },
  {
    id: 'xr18',
    title: '2. XR18 rear panel',
    items: [
      { id: 'xr-ports', text: 'What is plugged into USB, Ethernet, MIDI, Main L/R, Aux outs', hint: 'Photo: rear panel in good light' },
      { id: 'xr-cat6', text: "Where Mark's Cat6 starts and ends" },
      { id: 'xr-fw', text: 'Firmware version (X AIR EDIT > Setup)' },
      { id: 'xr-streambus', text: 'Is there a stream bus/mix, or is the stream a copy of Main L/R?' },
    ],
  },
  {
    id: 'audio',
    title: '3. Stream audio path, end to end',
    items: [
      { id: 'au-trace', text: 'Follow one signal: board > ??? > ATEM or Mac mini > OBS > Restream' },
      { id: 'au-obs', text: 'OBS Audio Mixer: which inputs exist; any 8-channel/muddy USB device' },
      { id: 'au-listen', text: 'Listen on headphones at the Mac mini; compare with the room' },
    ],
  },
  {
    id: 'mac',
    title: '4. Mac mini',
    items: [
      { id: 'mac-about', text: 'About This Mac: chip, RAM, macOS version', hint: 'Photo: About This Mac' },
      { id: 'mac-obs', text: 'OBS version (32.2.2 seen); NDI Tools vs NDI Runtime (only NDI Tools should be installed)' },
      { id: 'mac-comp', text: 'Companion version; is a config saved anywhere?' },
    ],
  },
  {
    id: 'pc',
    title: '5. Lyrics PC (Windows)',
    items: [
      { id: 'pc-specs', text: 'Windows version and specs' },
      { id: 'pc-pp', text: 'ProPresenter version, RPT MIDI version', hint: 'Photo: ProPresenter > About' },
      { id: 'pc-ndi', text: 'NDI settings; Stage screen config; Spotify routing' },
    ],
  },
  {
    id: 'ipad',
    title: '6. Playback iPad and MIDI cues',
    items: [
      { id: 'ip-which', text: 'Which iPad; MultiTracks One or Playback only' },
      { id: 'ip-own', text: 'Songs owned or rented (rentals bind to one iPad)' },
      { id: 'ip-fail', text: 'Which songs fail the MIDI cues; check the Oct 25 Planning Center plan' },
    ],
  },
  {
    id: 'deck',
    title: '7. Companion and Stream Decks',
    items: [
      { id: 'sd-which', text: 'Which decks run Companion vs Elgato software' },
      { id: 'sd-export', text: 'Export a Companion config now' },
    ],
  },
  {
    id: 'net',
    title: '8. Network',
    items: [
      { id: 'net-gear', text: 'Router/switch/AP make; how Macs, PC and XR18 connect', hint: 'Photo: network gear' },
      { id: 'net-ndi', text: 'Is NDI on WiFi? (should be wired)' },
    ],
  },
  {
    id: 'mics',
    title: '9. Mics and amp',
    items: [
      { id: 'mx-mics', text: '4 Behringer mics: models; wired or wireless', hint: 'Photo: model plates' },
      { id: 'mx-amp', text: 'Crown amp model plate', hint: 'Photo: model plate' },
    ],
  },
  {
    id: 'paper',
    title: '10. Printed checklists',
    items: [
      { id: 'pp-stream', text: 'Photograph the stream checklist flat and sharp' },
      { id: 'pp-wed', text: 'Photograph the Wednesday startup sheet flat and sharp' },
    ],
  },
  {
    id: 'backup',
    title: 'Backups before leaving',
    items: [
      { id: 'bk-xr', text: 'XR18 scene/snapshot export (X AIR EDIT)' },
      { id: 'bk-obs', text: 'OBS scene collection + profile export' },
      { id: 'bk-comp', text: 'Companion full config export' },
      { id: 'bk-pp', text: 'ProPresenter library/playlist copy' },
      { id: 'bk-photos', text: 'Photos: rack front/back, ATEM back, Mac mini ports, cable runs' },
    ],
  },
  {
    id: 'ask',
    title: 'Ask the team',
    items: [
      { id: 'q-who', text: 'Who else can troubleshoot when Paul is away; roles of Mike, Mark, Suzanne' },
      { id: 'q-obs', text: 'When did OBS start rebuilding itself; what changed that week' },
      { id: 'q-priority', text: 'Stream mix first or MIDI cues first?' },
      { id: 'q-limits', text: 'What may we change Thursday vs wait for Saturday (back up first)' },
    ],
  },
]

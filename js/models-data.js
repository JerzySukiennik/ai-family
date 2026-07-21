/*
  Single source of truth for the family.

  Adding a fourth model is one entry in this array — the orbit, the readout,
  the anchors and the sections are all generated from it. Nothing in the
  layout or the animation code names a model.

  status.kind drives the badge glyph:
    live  ●   shipped and running
    built ◐   written and verified, but not finished (e.g. not yet trained)
    spec  ○   signed-off specification, no code yet
*/
window.MODELS = [
  {
    id: 'gzowo-ai',
    name: 'Gzowo AI',
    tagline: 'The assistant they all report to.',
    icon: 'assets/icons/gzowo-ai-icon.svg',
    status: { kind: 'live', label: 'Live — v1' },
    repo: 'https://github.com/JerzySukiennik/gzowo-ai',
    lede:
      'A Jarvis-style voice assistant. You say “Hej Gzowo”, the orb wakes, and you talk to it — ' +
      'speech in, speech out, in one stream. It reads the projects on the machine it runs on, ' +
      'controls the house through Home Assistant, and remembers you between sessions.',
    body:
      'The interface is black and white, and that is not a mood — it is a rule. Colour appears only ' +
      'inside widgets, as data. Everything else is white on black with a grid behind it.',
    facts: [
      ['Voice and brain', 'Gemini Live native audio — speech-to-speech in one stream'],
      ['Wake word', 'Porcupine, on-device — nothing leaves the machine until the word lands'],
      ['Bridge', 'Node on the Mac: projects, Home Assistant, local Whisper fallback'],
      ['Off the Mac', 'Degrades honestly — unavailable features say so instead of faking it'],
      ['Interface', 'Three states: idle, talking, showing. Boot animation, mono type, grid'],
    ],
    note: 'Today the voice still runs through a hosted model. MicroG and Gedit are how that stops being true.',
  },
  {
    id: 'microg',
    name: 'MicroG',
    tagline: '100M parameters. 100% Gzowo.',
    icon: 'assets/icons/microg-icon.svg',
    status: { kind: 'built', label: 'Built — pretraining next' },
    repo: 'https://github.com/JerzySukiennik/microg',
    lede:
      'A ~110M parameter Polish language model, written and trained from scratch — tokenizer, ' +
      'architecture, training loop, inference. No fine-tuning of someone else’s weights, no API behind it.',
    body:
      'GPT-2 sized, but modernised: RoPE instead of learned positional embeddings, RMSNorm instead of ' +
      'LayerNorm, SwiGLU instead of a GELU MLP, no biases, tied embeddings. Essentially Llama in miniature. ' +
      'At this size it writes grammatical Polish with correct inflection, and it will confabulate on facts. ' +
      'That is a ceiling of the size, not a bug in the implementation.',
    facts: [
      ['Parameters', '109,529,856'],
      ['Architecture', '12 layers × 12 heads × 768 dim, 1024 context'],
      ['Tokenizer', 'Byte-level BPE, 32k vocab, trained on Polish'],
      ['Corpus', 'Wikipedia PL + FineWeb-2 pol_Latn — 2.0B tokens'],
      ['Runs on', 'CPU, offline — an Intel MacBook Pro is the target'],
      ['Training', 'Kaggle T4×2, ~10 h, resumable checkpoints'],
    ],
    note: null,
  },
  {
    id: 'gedit',
    name: 'Gedit',
    tagline: 'Small pixels. 100% Gzowo.',
    icon: 'assets/icons/gedit-icon.svg',
    status: { kind: 'spec', label: 'Spec — no code yet' },
    repo: null,
    repoNote: 'The spec is signed off. The first line of code is not written.',
    lede:
      'The second model in the family: a local image editor, called by voice from Gzowo AI. ' +
      'You point the camera at something, describe an edit in plain words, and a diffusion model ' +
      'trained from scratch does it on the machine.',
    body:
      'Its mark is not a letter. It is a crop-mark — two opposing corners, the universal sign for ' +
      'framing a photograph — standing in for “edit” exactly the way µ stands in for “micro”.',
    facts: [
      ['Model', 'Own diffusion U-Net, trained from scratch, 64–128 px'],
      ['Text encoder', 'Frozen pretrained CLIP — the one layer we do not train'],
      ['Dataset', 'instructpix2pix-clip-filtered, a 10–30k pair subset'],
      ['Training', 'Kaggle T4×2 — the same workflow as MicroG'],
      ['Runtime', 'ONNX inside the Gzowo AI bridge, behind a job queue'],
      ['Scope', 'Styles and filters, plus simple object add/remove by inpainting'],
    ],
    note: 'The slogan is provisional. It settles once the final parameter count does.',
  },
];

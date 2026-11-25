# The World in One Image — Wednesday 25 November 2026

[![make.fun](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/dwi085/makefun-news-image-20261125/rank.svg)](https://make.fun/competitions/news-image-20261125/leaderboard)
[![reward](https://make.fun/badge/news-image-20261125/dwi085/makefun-news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125)

A [make.fun](https://make.fun/bounty/news-image-20261125) bounty entry: a program that
sums up the world's news of Wednesday 25 November 2026 in one image.

`main.ts` (Node 22, no dependencies, no network) renders a 1024x1024 PNG to
`/output/entry.png`: a masthead dated Wednesday 25 November 2026, a UTC timeline
of 42 sourced stories from the day's wires (Reuters, AP, BBC, WAFA, and more),
a world pin map marking where each story happened, and a sources footer.

Deterministic: the same input always produces the same bytes — run it twice and
the SHA-256 matches. Run it with `node main.ts` from anywhere; the output
directory honours `MAKEFUN_OUTPUT_DIR` and defaults to `/output`.

## How to run

```sh
node main.ts
# writes /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png)
```

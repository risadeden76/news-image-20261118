# 18 November 2026 — World News in One Image

[![Make News Image](https://make.fun/badge/news-image-20261118.svg)](https://make.fun/bounty/news-image-20261118)
[![Rank](https://make.fun/badge/news-image-20261118/risadeden76/news-image-20261118/rank.svg)](https://make.fun/bounty/news-image-20261118)
[![Reward](https://make.fun/badge/news-image-20261118/risadeden76/news-image-20261118/reward.svg)](https://make.fun/bounty/news-image-20261118)

A program that sums up the world's news of Wednesday, 18 November 2026 in a
single 1024x1024 image, built for the [make.fun news-image-20261118
bounty](https://make.fun/bounty/news-image-20261118).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

It writes `out/entry.png`: a newspaper-style front page with the day's lead
story and the other stories that defined the day.

## The day's news in the image

1. **Iran strikes Kuwait and Bahrain** — Tehran says it hit the Ali Al Salem
   air base, home to US forces, after US aircraft struck a missile site on
   Qeshm Island; Bahrain says it intercepted attacks before dawn.
2. **Ukraine hits the Kerch Bridge** — drone and missile strikes partly
   destroy the bridge to Crimea; one of its arches collapses into the strait.
3. **Xi meets Putin in Shenzhen** — China and Russia coordinate ahead of
   Thursday's trilateral summit with Trump at the APEC forum.
4. **Democrats take the Senate** — Mary Peltola wins Alaska, flipping the
   chamber to a 56-44 Democratic majority.
5. **US loses measles-free status** — after 26 years, elimination status ends
   with more than 5,400 cases and 10 deaths.
6. **Also today** — Ebola in DR Congo passes 11,000 cases; Nvidia posts a
   record $115.8B quarter as its board rejects Huang's return; Matan Kahana is
   elected speaker of Israel's Knesset.

## How it works

`main.ts` (Node 22, standard library only) draws the whole front page
itself: a hand-written 5x7 bitmap font, vector shapes for the masthead,
badges and the blast graphic, and a hand-written PNG encoder (zlib deflate
plus PNG chunks with CRCs). No network, no randomness, no clock — every run
writes the same bytes. The output is a 1024x1024 PNG well under the 1 MiB
limit.
